import { useEffect, useState } from 'react'
import { useContent } from '../../lib/contentStore'
import { communityError } from '../../lib/community'
import { postTopics, savePost, type Post, type PostKind, type PostTopic, type PostValues } from '../../lib/posts'

export default function PostComposer({ post, topic, onDone, onCancel }: { post?: Post; topic?: string; onDone: (draft: boolean) => void; onCancel: () => void }) {
  const { account, content, cloudMode } = useContent()
  const [values, setValues] = useState<PostValues>(() => ({ topic: post?.topic ?? (postTopics.includes(topic as PostTopic) ? topic as PostTopic : 'zhengshi'), kind: post?.kind ?? 'text', title: post?.title ?? '', body: post?.body ?? '', link: post?.link ?? '', status: post?.status ?? 'draft' }))
  const [files, setFiles] = useState<File[]>([]), [kept, setKept] = useState(post?.image_paths ?? [])
  const [previews, setPreviews] = useState<string[]>([]), [preview, setPreview] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('')
  useEffect(() => { const urls = files.map(f => URL.createObjectURL(f)); setPreviews(urls); return () => urls.forEach(u => URL.revokeObjectURL(u)) }, [files])
  const patch = (p: Partial<PostValues>) => setValues(v => ({ ...v, ...p }))
  const images = [...kept.map(p => post!.images[post!.image_paths.indexOf(p)]), ...previews]
  const save = async (status: PostValues['status']) => {
    if (busy) return; setBusy(true); setError('')
    try { await savePost(account, { ...values, status }, files, post, kept); onDone(status === 'draft') } catch (e) { setError(communityError(e)) } finally { setBusy(false) }
  }
  return <section className="post-composer" aria-label="帖子编辑器"><header><div><span className="studio-eyebrow">A NEW ENTRY / 写下新的篇章</span><h2>{post ? '编辑帖子' : '发布你的创作'}</h2></div><button type="button" disabled={busy} onClick={onCancel}>关闭编辑器</button></header>
    <form onSubmit={e => { e.preventDefault(); void save('published') }}><fieldset disabled={busy}>
      <label>01 / 选择发布板块<select aria-label="发布板块" value={values.topic} onChange={e => patch({ topic: e.target.value as PostTopic })}>{postTopics.map(id => <option key={id} value={id}>{content.topics.find(t => t.id === id)?.name ?? id}</option>)}</select></label>
      <div className="post-type-tabs" aria-label="帖子类型">{([['text','文字'],['image','图片'],['link','链接']] as [PostKind,string][]).map(([kind,label]) => <button type="button" key={kind} aria-pressed={values.kind === kind} onClick={() => patch({ kind })}>{label}</button>)}</div>
      <label>02 / 标题<span className="post-field-hint">{values.title.length} / 300</span><input aria-label="帖子标题" value={values.title} maxLength={300} placeholder="给这份创作起个名字…" onChange={e => patch({ title: e.target.value })} /></label>
      {values.kind === 'link' && <label>链接地址<input aria-label="帖子链接" type="url" value={values.link} maxLength={2048} placeholder="https://" onChange={e => patch({ link: e.target.value })} /></label>}
      <label>{values.kind === 'text' ? '03 / 正文' : '创作说明（选填）'}<textarea aria-label="帖子正文" rows={7} maxLength={20000} value={values.body} placeholder="分享创作思路、资料出处，或提出一个值得讨论的问题。" onChange={e => patch({ body: e.target.value })} /></label>
      <label className="post-upload">添加图片 · {images.length} / 6<input aria-label="帖子图片" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple onChange={e => { const next = Array.from(e.target.files ?? []); if (next.length + images.length > 6) setError('每帖最多 6 张图片'); else { setFiles(f => [...f, ...next]); setError('') }; e.target.value = '' }} /><small>支持 JPG、PNG、WebP、GIF、AVIF；每张不超过 10 MB，按原比例展示。</small></label>
      {images.length > 0 && <div className="post-image-previews">{images.map((src, i) => <figure key={i}><img src={src} alt={`附件 ${i + 1}`} /><button type="button" aria-label={`移除图片 ${i + 1}`} onClick={() => i < kept.length ? setKept(k => k.filter((_, j) => j !== i)) : setFiles(f => f.filter((_, j) => j !== i - kept.length))}>×</button></figure>)}</div>}
      <div className="post-compose-actions"><button type="button" onClick={() => setPreview(!preview)} aria-expanded={preview}>{preview ? '收起预览' : '预览帖子'}</button><span /><button type="button" onClick={() => void save('draft')}>{post?.status === 'published' ? '撤回为草稿' : '保存草稿'}</button><button className="studio-primary" type="submit">{busy ? '保存中…' : post?.status === 'published' ? '更新发布' : '发布帖子 ↗'}</button></div>
    </fieldset></form>
    {error && <p className="community-error" role="alert">{error}</p>}
    {!cloudMode && <p className="studio-muted">本机体验：帖子暂存此浏览器，尚不会出现在其他设备。</p>}
    {preview && <article className="post-preview" aria-label="帖子预览"><small>发布预览 · {content.topics.find(t => t.id === values.topic)?.name}</small><h3>{values.title || '未命名帖子'}</h3><p>{values.body}</p>{values.kind === 'link' && <p>{values.link}</p>}{images.map((src,i) => <img src={src} key={i} alt={`预览图片 ${i+1}`} />)}</article>}
  </section>
}
