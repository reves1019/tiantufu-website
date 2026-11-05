import type { AccountRecord } from './accounts'
import { getSupabaseClient, supabaseConfigured } from './supabase'
import { idbGet, idbSet } from './idbStore'

export interface Access { canEdit: boolean; canInteract: boolean; qq?: string; cloud: boolean }
export interface WhitelistEntry { qq_number: string; label: string; active: boolean; claimed_by?: string; verified_at?: string }
export interface QQApplication { user_id: string; display_name: string; username: string; status: string; qq_number?: string; matched: boolean; verified: boolean }
export interface GalleryImage { id: string; owner_id: string; title: string; description: string; category: string; topic: string; storage_path: string; published: boolean; created_at: string; image: string; author: string; memberId?: string }
export interface Comment { id: string; user_id: string; body: string; created_at: string; author: string }
export interface Crop { x: number; y: number; w: number; h: number; aspect?: number }
export interface Room { id: string; name: string; color: string; position: number }
export interface PalaceItem { id: string; room_id: string; work_key: string; note: string; crop: Crop | null; created_at: string }
export interface PalaceData { rooms: Room[]; items: PalaceItem[]; interests: string[] }
const EVENT = 'ttf-community-updated'
export const communityEvent = EVENT
export function changed() { window.dispatchEvent(new Event(EVENT)) }
export function communityError(error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : '操作未完成，请重试'
  if (/schema cache|does not exist|Could not find|PGRST/.test(message)) return '云端社区功能尚未配置，请管理员先应用社区数据库迁移。'
  return message
}
function fail(error: unknown) { if (error) throw new Error(communityError(error)) }
async function localRead<T>(key: string, fallback: T): Promise<T> { const value = await idbGet(key); return typeof value === 'string' ? JSON.parse(value) as T : fallback }
async function localWrite(key: string, value: unknown) { await idbSet(key, JSON.stringify(value)); changed() }
function registered(account: AccountRecord | null): asserts account is AccountRecord { if (!account || account.status !== 'approved') throw new Error('请先使用已审核的账号登录') }
function administrator(account: AccountRecord | null): asserts account is AccountRecord { registered(account); if (account.role !== 'admin') throw new Error('需要管理员权限') }
export function validQQ(qq: string) { return /^[1-9][0-9]{4,11}$/.test(qq.trim()) }
export async function getCommunityAccess(account: AccountRecord | null): Promise<Access> {
  if (!account) return { canEdit: false, canInteract: false, cloud: supabaseConfigured }
  const client = await getSupabaseClient()
  if (client) { const { data, error } = await client.rpc('community_access'); fail(error); return data as Access }
  const list = await localRead<WhitelistEntry[]>('community-whitelist-v1', [])
  const claims = await localRead<Record<string,string>>('community-qq-claims-v1', {})
  const approved = account.status === 'approved'
  return { canInteract: approved, canEdit: approved && (account.role === 'admin' || list.some(w => w.active && w.claimed_by === account.id && !!w.verified_at)), qq: claims[account.id] ?? account.qq, cloud: false }
}
export async function getWhitelist(account: AccountRecord | null) {
  administrator(account); const client = await getSupabaseClient()
  if (!client) return localRead<WhitelistEntry[]>('community-whitelist-v1', [])
  const { data, error } = await client.from('fu_whitelist').select('*').order('created_at', { ascending: false }); fail(error); return data as WhitelistEntry[]
}
export async function setWhitelist(account: AccountRecord | null, qq: string, label: string, active = true) {
  administrator(account); if (!validQQ(qq)) throw new Error('QQ 号须为 5–12 位数字且不能以 0 开头')
  const client = await getSupabaseClient()
  if (client) { const { error } = await client.rpc('admin_set_qq_whitelist', { qq: qq.trim(), member_label: label, enabled: active }); fail(error) }
  else { const list = await getWhitelist(account); const entry = list.find(w => w.qq_number === qq.trim()); await localWrite('community-whitelist-v1', [...list.filter(w => w.qq_number !== qq.trim()), { ...entry, qq_number: qq.trim(), label, active }]) }
  changed()
}
export async function getQQApplications(account: AccountRecord | null, accounts: AccountRecord[]): Promise<QQApplication[]> {
  administrator(account); const client = await getSupabaseClient()
  if (client) { const { data, error } = await client.rpc('admin_qq_applications'); fail(error); return data as QQApplication[] }
  const list = await getWhitelist(account), claims = await localRead<Record<string,string>>('community-qq-claims-v1', {})
  return accounts.filter(a => a.role === 'member').map(a => ({ user_id: a.id, display_name: a.displayName, username: a.username, status: a.status, qq_number: claims[a.id] ?? a.qq, matched: list.some(w => w.active && w.qq_number === (claims[a.id] ?? a.qq)), verified: list.some(w => w.active && w.claimed_by === a.id && !!w.verified_at) }))
}
export async function releaseQQ(account: AccountRecord | null, qq: string) {
  administrator(account); const client = await getSupabaseClient()
  if (client) { const { error } = await client.rpc('admin_release_qq_member', { qq }); fail(error) }
  else await localWrite('community-whitelist-v1', (await getWhitelist(account)).map(w => w.qq_number === qq ? { ...w, active: false, claimed_by: undefined, verified_at: undefined } : w))
  changed()
}
export async function submitMyQQ(account: AccountRecord | null, qq: string) {
  registered(account); if (!validQQ(qq)) throw new Error('请填写有效的 QQ 号（5–12 位数字）')
  const client = await getSupabaseClient()
  if (client) { const { error } = await client.rpc('submit_my_qq', { qq: qq.trim() }); fail(error) }
  else { const list = await localRead<WhitelistEntry[]>('community-whitelist-v1', []); if (list.some(w => w.claimed_by === account.id)) throw new Error('已绑定的 QQ 需由管理员核实后处理'); await localWrite('community-qq-claims-v1', { ...await localRead<Record<string,string>>('community-qq-claims-v1', {}), [account.id]: qq.trim() }) }
  changed()
}
export async function verifyQQ(account: AccountRecord | null, applicant: QQApplication) {
  administrator(account); const client = await getSupabaseClient()
  if (client) { const { error } = await client.rpc('admin_verify_qq_member', { target_user: applicant.user_id, confirmed_qq: applicant.qq_number }); fail(error) }
  else {
    if (applicant.status !== 'approved') throw new Error('请先在账号管理中审核通过该账号')
    const list = await getWhitelist(account), row = list.find(w => w.qq_number === applicant.qq_number && w.active)
    if (!row || (row.claimed_by && row.claimed_by !== applicant.user_id)) throw new Error('QQ 未在白名单中，或已绑定其他账号')
    await localWrite('community-whitelist-v1', list.map(w => w === row ? { ...w, claimed_by: applicant.user_id, verified_at: new Date().toISOString() } : w))
  }
  changed()
}
export async function loadGallery(account: AccountRecord | null, options: { ownerId?: string; memberId?: string; publishedOnly?: boolean; limit?: number } = {}): Promise<GalleryImage[]> {
  const client = await getSupabaseClient()
  if (!client) return (await localRead<GalleryImage[]>('community-gallery-v1', [])).filter(i => (i.published || i.owner_id === account?.id || account?.role === 'admin') && (!options.ownerId || i.owner_id === options.ownerId) && (!options.memberId || i.memberId === options.memberId) && (!options.publishedOnly || i.published)).slice(0, options.limit ?? 200)
  let ownerId = options.ownerId
  if (options.memberId) {
    // member_id is public display identity; the RPC includes admin authors without exposing emails.
    const { data: owner, error: ownerError } = await client.rpc('community_author_account', { member: options.memberId }); fail(ownerError)
    if (!owner) return []; ownerId = owner as string
  }
  let query = client.from('member_images').select('*').order('created_at', { ascending: false }).limit(options.limit ?? 200)
  if (ownerId) query = query.eq('owner_id', ownerId)
  if (options.publishedOnly) query = query.eq('published', true)
  const { data, error } = await query; fail(error)
  if (!data?.length) return []
  const [{ data: urls, error: urlError }, { data: profiles, error: profileError }] = await Promise.all([
    client.storage.from('tiantufu-gallery').createSignedUrls(data.map(i => i.storage_path), 3600),
    client.rpc('community_authors', { ids: [...new Set(data.map(i => i.owner_id))] }),
  ]); fail(urlError); fail(profileError)
  const authors = (profiles ?? []) as { id: string; display_name: string; member_id: string | null }[]
  return data.map(i => { const profile = authors.find(p => p.id === i.owner_id); return { ...i, image: urls?.find(u => u.path === i.storage_path)?.signedUrl ?? '', author: profile?.display_name ?? '成员', memberId: profile?.member_id } as GalleryImage })
}
export async function uploadGallery(account: AccountRecord | null, file: File, values: { title: string; description: string; category: string; topic: string; published: boolean }) {
  registered(account); if (!(await getCommunityAccess(account)).canEdit) throw new Error('创作者账号才能上传个人图库')
  if (!values.title.trim()) throw new Error('请填写作品标题')
  if (!['image/jpeg','image/png','image/webp','image/gif','image/avif'].includes(file.type) || !file.size || file.size > 10 * 1024 * 1024) throw new Error('请选择 10 MB 以内的 JPG、PNG、WebP、GIF 或 AVIF 图片')
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('图片无法解码，请选择有效的图片文件') }); bitmap.close()
  const id = crypto.randomUUID(), path = `${account.id}/${id}.${file.type.split('/')[1]}`
  const client = await getSupabaseClient()
  if (client) {
    const { error: uploadError } = await client.storage.from('tiantufu-gallery').upload(path, file, { upsert: false, contentType: file.type }); fail(uploadError)
    const { error } = await client.from('member_images').insert({ id, ...values, title: values.title.trim(), owner_id: account.id, storage_path: path })
    if (error) { await client.storage.from('tiantufu-gallery').remove([path]); fail(error) }
  } else {
    const image = await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = reject; r.readAsDataURL(file) })
    await localWrite('community-gallery-v1', [...await localRead<GalleryImage[]>('community-gallery-v1', []), { ...values, id, owner_id: account.id, storage_path: path, image, author: account.displayName, memberId: account.memberId, created_at: new Date().toISOString() }])
  }
  changed()
}
export async function editGallery(account: AccountRecord | null, image: GalleryImage, patch: { title?: string; description?: string; category?: string; published?: boolean }) {
  registered(account); if (!(await getCommunityAccess(account)).canEdit || (image.owner_id !== account.id && account.role !== 'admin')) throw new Error('只能编辑自己的图库')
  const client = await getSupabaseClient()
  if (client) { const { error } = await client.from('member_images').update(patch).eq('id', image.id); fail(error) }
  else await localWrite('community-gallery-v1', (await localRead<GalleryImage[]>('community-gallery-v1', [])).map(i => i.id === image.id ? { ...i, ...patch } : i))
  changed()
}
export async function deleteGallery(account: AccountRecord | null, image: GalleryImage) {
  registered(account); if (image.owner_id !== account.id && account.role !== 'admin') throw new Error('只能删除自己的图片')
  const client = await getSupabaseClient()
  if (client) {
    const { error } = await client.from('member_images').delete().eq('id', image.id); fail(error)
    const { error: cleanup } = await client.storage.from('tiantufu-gallery').remove([image.storage_path]); if (cleanup) throw new Error('图库记录已删除，原图清理未完成，请联系管理员')
  } else await localWrite('community-gallery-v1', (await localRead<GalleryImage[]>('community-gallery-v1', [])).filter(i => i.id !== image.id))
  changed()
}
export async function getDiscussion(key: string, account: AccountRecord | null) {
  const client = await getSupabaseClient()
  if (!client) { const d = await localRead<{ comments: Comment[]; likes: string[] }>(`discussion:${key}`, { comments: [], likes: [] }); return { comments: d.comments, count: d.likes.length, liked: !!account && d.likes.includes(account.id) } }
  const [commentsResult, countResult, likesResult] = await Promise.all([
    client.from('work_comments').select('*').eq('work_key', key).order('created_at', { ascending: false }).limit(100),
    client.rpc('work_like_count', { key }), account ? client.from('work_likes').select('user_id').eq('work_key', key).eq('user_id', account.id) : Promise.resolve({ data: [], error: null }),
  ]); fail(commentsResult.error); fail(countResult.error); fail(likesResult.error)
  const comments = commentsResult.data ?? [], ids = [...new Set(comments.map(c => c.user_id))]
  const profiles = ids.length ? await client.rpc('community_authors', { ids }) : { data: [], error: null }; fail(profiles.error)
  const authors = (profiles.data ?? []) as { id: string; display_name: string }[]
  return { comments: comments.map(c => ({ ...c, author: authors.find(p => p.id === c.user_id)?.display_name ?? '成员' })) as Comment[], count: Number(countResult.data ?? 0), liked: !!likesResult.data?.length }
}
export async function addComment(key: string, account: AccountRecord | null, body: string) {
  registered(account); if (!body.trim() || body.trim().length > 1000) throw new Error('评论需为 1–1000 个字符')
  const client = await getSupabaseClient()
  if (client) { const { error } = await client.from('work_comments').insert({ work_key: key, user_id: account.id, body: body.trim() }); fail(error) }
  else { const d = await localRead<{ comments: Comment[]; likes: string[] }>(`discussion:${key}`, { comments: [], likes: [] }); if (d.comments.filter(c => c.user_id === account.id && Date.now() - Date.parse(c.created_at) < 60000).length >= 5) throw new Error('评论过于频繁，请一分钟后再试'); d.comments.unshift({ id: crypto.randomUUID(), user_id: account.id, body: body.trim(), author: account.displayName, created_at: new Date().toISOString() }); await localWrite(`discussion:${key}`, d) }
}
export async function removeComment(key: string, account: AccountRecord | null, comment: Comment) {
  registered(account); if (comment.user_id !== account.id && account.role !== 'admin') throw new Error('不能删除他人的评论')
  const client = await getSupabaseClient()
  if (client) { const { error } = await client.from('work_comments').delete().eq('id', comment.id); fail(error) }
  else { const d = await localRead<{ comments: Comment[]; likes: string[] }>(`discussion:${key}`, { comments: [], likes: [] }); await localWrite(`discussion:${key}`, { ...d, comments: d.comments.filter(c => c.id !== comment.id) }) }
}
export async function setLike(key: string, account: AccountRecord | null, liked: boolean) {
  registered(account); const client = await getSupabaseClient()
  if (client) { const { error } = liked ? await client.from('work_likes').upsert({ work_key: key, user_id: account.id }, { onConflict: 'work_key,user_id', ignoreDuplicates: true }) : await client.from('work_likes').delete().eq('work_key', key).eq('user_id', account.id); fail(error) }
  else { const d = await localRead<{ comments: Comment[]; likes: string[] }>(`discussion:${key}`, { comments: [], likes: [] }); await localWrite(`discussion:${key}`, { ...d, likes: [...d.likes.filter(i => i !== account.id), ...(liked ? [account.id] : [])] }) }
}
export function defaultRooms(): Room[] { return ['历史回廊','架空世界','山川地貌','灵感书房'].map((name, i) => ({ id: crypto.randomUUID(), name, color: ['#c6a46a','#7eaa9e','#9da973','#b59cc0'][i], position: i })) }
export async function getPalace(account: AccountRecord | null): Promise<PalaceData> {
  const client = account ? await getSupabaseClient() : null
  if (!client) return localRead<PalaceData>(`palace:${account?.id ?? 'guest'}`, { rooms: [], items: [], interests: [] })
  const [rooms, items, interests] = await Promise.all([client.from('palace_rooms').select('*').order('position'), client.from('palace_items').select('*'), client.from('member_interests').select('categories').eq('user_id', account!.id).maybeSingle()]); fail(rooms.error); fail(items.error); fail(interests.error)
  return { rooms: rooms.data as Room[], items: items.data as PalaceItem[], interests: interests.data?.categories ?? [] }
}
export async function saveRoom(account: AccountRecord | null, room: Room) {
  const client = account ? await getSupabaseClient() : null
  if (client) { const { error } = await client.from('palace_rooms').upsert({ ...room, user_id: account!.id }); fail(error) }
  else { const d = await getPalace(account); await localWrite(`palace:${account?.id ?? 'guest'}`, { ...d, rooms: [...d.rooms.filter(r => r.id !== room.id), room].sort((a,b) => a.position-b.position) }) }
}
export async function savePalaceItem(account: AccountRecord | null, item: PalaceItem) {
  const client = account ? await getSupabaseClient() : null
  if (client) { const { error } = await client.from('palace_items').upsert({ ...item, user_id: account!.id }, { onConflict: 'user_id,room_id,work_key' }); fail(error) }
  else { const d = await getPalace(account); await localWrite(`palace:${account?.id ?? 'guest'}`, { ...d, items: [...d.items.filter(i => !(i.room_id === item.room_id && i.work_key === item.work_key)), item] }) }
}
export async function deletePalaceItem(account: AccountRecord | null, id: string) {
  const client = account ? await getSupabaseClient() : null
  if (client) { const { error } = await client.from('palace_items').delete().eq('id', id); fail(error) }
  else { const d = await getPalace(account); await localWrite(`palace:${account?.id ?? 'guest'}`, { ...d, items: d.items.filter(i => i.id !== id) }) }
}
export async function deleteRoom(account: AccountRecord | null, id: string) {
  const client = account ? await getSupabaseClient() : null
  if (client) { const { error } = await client.from('palace_rooms').delete().eq('id', id); fail(error) }
  else { const d = await getPalace(account); await localWrite(`palace:${account?.id ?? 'guest'}`, { ...d, rooms: d.rooms.filter(r => r.id !== id), items: d.items.filter(i => i.room_id !== id) }) }
}
export async function saveInterests(account: AccountRecord | null, interests: string[]) {
  const client = account ? await getSupabaseClient() : null
  if (client) { const { error } = await client.from('member_interests').upsert({ user_id: account!.id, categories: interests }); fail(error) }
  else { const d = await getPalace(account); await localWrite(`palace:${account?.id ?? 'guest'}`, { ...d, interests }) }
}
