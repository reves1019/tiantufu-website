import type { AccountRecord } from './accounts'
import { getSupabaseClient } from './supabase'
import { idbGet, idbSet } from './idbStore'
import { changed, getCommunityAccess } from './community'

export const postTopics = ['zhengshi', 'ban-jiakong', 'quan-jiakong'] as const
export type PostTopic = typeof postTopics[number]
export type PostKind = 'text' | 'image' | 'link'
export interface PostValues { topic: PostTopic; kind: PostKind; title: string; body: string; link: string; status: 'draft' | 'published' }
export interface Post extends PostValues { id: string; owner_id: string; image_paths: string[]; images: string[]; created_at: string; updated_at: string; author: string }
const KEY = 'community-posts-v1', BUCKET = 'tiantufu-posts'
const readLocal = async (): Promise<Post[]> => JSON.parse(await idbGet(KEY) ?? '[]')
const fail = (error: unknown) => { if (error) throw error }
export function validatePost(values: PostValues, imageCount: number) {
  if (!postTopics.includes(values.topic)) throw new Error('请选择首页的一个创作板块')
  if (!['text', 'image', 'link'].includes(values.kind)) throw new Error('请选择帖子类型')
  if (values.title.length > 300 || values.body.length > 20000) throw new Error('标题最多 300 字，正文最多 20000 字')
  if (imageCount > 6) throw new Error('每帖最多 6 张图片')
  if (values.link) { let url: URL; try { url = new URL(values.link) } catch { throw new Error('请填写完整的 HTTPS 链接') }; if (url.protocol !== 'https:' || values.link.length > 2048 || /\s/.test(values.link)) throw new Error('请填写完整的 HTTPS 链接') }
  if (values.status === 'published') {
    if (!values.title.trim()) throw new Error('发布前请填写标题')
    if (values.kind === 'text' && !values.body.trim()) throw new Error('请写下正文')
    if (values.kind === 'image' && !imageCount) throw new Error('请添加至少一张图片')
    if (values.kind === 'link' && !values.link) throw new Error('请填写链接')
  }
}
export async function loadPosts(account: AccountRecord | null, options: { ownerId?: string; topic?: string; drafts?: boolean } = {}): Promise<Post[]> {
  const client = await getSupabaseClient()
  if (!client) return (await readLocal()).filter(p => (p.status === 'published' || p.owner_id === account?.id || account?.role === 'admin') && (options.drafts ? p.status === 'draft' : p.status === 'published') && (!options.ownerId || p.owner_id === options.ownerId) && (!options.topic || p.topic === options.topic)).map(p => p.owner_id === account?.id ? { ...p, author: account.displayName } : p).sort((a,b) => b.created_at.localeCompare(a.created_at))
  let query = client.from('community_posts').select('*').eq('status', options.drafts ? 'draft' : 'published').order('created_at', { ascending: false }).limit(100)
  if (options.ownerId) query = query.eq('owner_id', options.ownerId)
  if (options.topic) query = query.eq('topic', options.topic)
  const { data, error } = await query; fail(error)
  if (!data?.length) return []
  const paths: string[] = data.flatMap(p => p.image_paths)
  const [authors, urls] = await Promise.all([
    client.rpc('community_authors', { ids: [...new Set(data.map(p => p.owner_id))] }),
    paths.length ? client.storage.from(BUCKET).createSignedUrls(paths, 3600) : Promise.resolve({ data: [], error: null }),
  ])
  fail(authors.error); fail(urls.error)
  return data.map(p => ({ ...p, author: authors.data?.find((a: { id: string }) => a.id === p.owner_id)?.display_name ?? '府员', images: p.image_paths.map((path: string) => urls.data?.find(u => u.path === path)?.signedUrl ?? '') })) as Post[]
}
export async function savePost(account: AccountRecord | null, values: PostValues, files: File[], existing?: Post, keptPaths: string[] = existing?.image_paths ?? []) {
  if (!account || !(await getCommunityAccess(account)).canEdit || (existing && existing.owner_id !== account.id)) throw new Error('需要作者权限，且只能编辑自己的帖子')
  const clean = { ...values, title: values.title.trim(), link: values.link.trim() }
  validatePost(clean, keptPaths.length + files.length)
  if (keptPaths.some(p => !existing?.image_paths.includes(p))) throw new Error('图片不属于这篇帖子')
  for (const file of files) {
    if (!['image/jpeg','image/png','image/webp','image/gif','image/avif'].includes(file.type) || !file.size || file.size > 10485760) throw new Error('图片须为 10 MB 以内的 JPG、PNG、WebP、GIF 或 AVIF')
    const bitmap = await createImageBitmap(file).catch(() => { throw new Error('图片无法读取，请重新选择') }); bitmap.close()
  }
  const id = existing?.id ?? crypto.randomUUID(), paths = files.map(f => `${account.id}/${id}/${crypto.randomUUID()}.${f.type.split('/')[1]}`)
  const client = await getSupabaseClient()
  if (client) {
    if (!existing) { const { error } = await client.from('community_posts').insert({ id, owner_id: account.id, ...clean, status: 'draft', image_paths: [] }); fail(error) }
    const uploaded: string[] = []
    try {
      for (let i = 0; i < files.length; i++) { const { error } = await client.storage.from(BUCKET).upload(paths[i], files[i], { contentType: files[i].type }); fail(error); uploaded.push(paths[i]) }
      const { data, error } = await client.from('community_posts').update({ ...clean, image_paths: [...keptPaths, ...paths] }).eq('id', id).eq('owner_id', account.id).select('id').single(); fail(error); if (!data) throw new Error('帖子未保存，请刷新权限后重试')
    } catch (error) {
      if (uploaded.length) await client.storage.from(BUCKET).remove(uploaded)
      if (!existing) await client.from('community_posts').delete().eq('id', id)
      throw error
    }
    const obsolete = existing?.image_paths.filter(p => !keptPaths.includes(p)) ?? []
    if (obsolete.length) await client.storage.from(BUCKET).remove(obsolete)
  } else {
    const images = await Promise.all(files.map(file => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('图片读取失败')); reader.readAsDataURL(file) })))
    const now = new Date().toISOString()
    const post: Post = { ...clean, id, owner_id: account.id, author: account.displayName, created_at: existing?.created_at ?? now, updated_at: now, image_paths: [...keptPaths, ...paths], images: [...keptPaths.map(p => existing!.images[existing!.image_paths.indexOf(p)]), ...images] }
    await idbSet(KEY, JSON.stringify([...(await readLocal()).filter(p => p.id !== id), post]))
  }
  changed(); return id
}
export async function deletePost(account: AccountRecord | null, post: Post) {
  if (!account || (post.owner_id !== account.id && account.role !== 'admin')) throw new Error('只能删除自己的帖子')
  const client = await getSupabaseClient()
  if (client) {
    const { data, error } = await client.from('community_posts').delete().eq('id', post.id).select('id'); fail(error)
    if (!data?.length) throw new Error('帖子不存在或没有删除权限')
    if (post.image_paths.length) await client.storage.from(BUCKET).remove(post.image_paths)
  } else await idbSet(KEY, JSON.stringify((await readLocal()).filter(p => p.id !== post.id)))
  changed()
}
