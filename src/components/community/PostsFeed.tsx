import { useEffect, useState } from 'react'
import { useContent } from '../../lib/contentStore'
import { communityError, communityEvent } from '../../lib/community'
import { deletePost, loadPosts, type Post } from '../../lib/posts'
import Discussion from './Discussion'

export default function PostsFeed({ topic, ownerId, drafts = false, onEdit }: { topic?: string; ownerId?: string; drafts?: boolean; onEdit?: (post: Post) => void }) {
  const { account, content, cloudMode } = useContent()
  const [posts, setPosts] = useState<Post[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(true)
  const [discussion, setDiscussion] = useState<string | null>(null), [deleting, setDeleting] = useState(''), [confirm, setConfirm] = useState('')
  useEffect(() => {
    let alive = true, revision = 0
    setPosts([]); setLoading(true); setDiscussion(null)
    const load = () => { const current = ++revision; void loadPosts(account, { topic, ownerId, drafts }).then(p => { if (alive && current === revision) { setPosts(p); setError(''); setLoading(false) } }).catch(e => { if (alive && current === revision) { setError(communityError(e)); setLoading(false) } }) }
    load(); window.addEventListener(communityEvent, load); window.addEventListener('focus', load)
    const timer = cloudMode ? setInterval(load, 30000) : undefined
    return () => { alive = false; clearInterval(timer); window.removeEventListener(communityEvent, load); window.removeEventListener('focus', load) }
  }, [account, topic, ownerId, drafts, cloudMode])
  const remove = async (p: Post) => { setDeleting(p.id); try { await deletePost(account, p); setConfirm('') } catch(e) { setError(communityError(e)) } finally { setDeleting('') } }
  return <section className="posts-feed" aria-label={drafts ? '我的草稿列表' : '帖子列表'}>
    {!ownerId && <header className="posts-feed-heading"><div><span className="studio-eyebrow">FROM THE COMMUNITY</span><h2>府员讨论与创作</h2></div><a className="studio-primary" href={`#studio?compose=1${topic ? `&topic=${encodeURIComponent(topic)}` : ''}`}>发布帖子 ↗</a></header>}
    {error && <p className="community-error" role="alert">{error}</p>}
    {loading ? <p className="studio-empty" role="status">正在读取帖子…</p> : !error && !posts.length ? <div className="studio-empty"><span>✧</span><h3>{drafts ? '灵感，可以慢慢打磨。' : '这里等待你的第一篇创作。'}</h3><p>{drafts ? '保存为草稿的帖子只对你和管理员可见。' : '分享一张地图、一段考证，或一个新的世界。'}</p></div> : null}
    {posts.map(p => <article className="post-card" key={p.id}><header><a href={`#topic?id=${p.topic}`}>{content.topics.find(t => t.id === p.topic)?.name ?? p.topic}</a><span>{p.author}</span><time dateTime={p.created_at}>{new Date(p.created_at).toLocaleDateString('zh-CN')}</time>{p.status === 'draft' && <strong>私密草稿</strong>}</header><h3>{p.title || '未命名草稿'}</h3>{p.body && <p className="post-body">{p.body}</p>}{p.kind === 'link' && p.link && <a className="post-external" href={p.link} target="_blank" rel="noopener noreferrer">{p.link} ↗</a>}
      {p.images.length > 0 && <div className="post-card-images">{p.images.map((src,i) => src ? <a key={p.image_paths[i]} href={src} target="_blank" rel="noopener noreferrer" aria-label={`查看 ${p.title} 原图 ${i+1}`}><img src={src} alt={`${p.title} · ${i+1}`} loading="lazy" /></a> : <p key={i}>图片暂不可用，请刷新重试</p>)}</div>}
      <footer>{p.status === 'published' && <button type="button" aria-expanded={discussion === p.id} onClick={() => setDiscussion(discussion === p.id ? null : p.id)}>评论与点赞</button>}{onEdit && p.owner_id === account?.id && <button type="button" onClick={() => onEdit(p)}>编辑帖子</button>}{(p.owner_id === account?.id || account?.role === 'admin') && (confirm === p.id ? <><span>确定删除此帖？</span><button disabled={!!deleting} onClick={() => void remove(p)}>确认删除</button><button disabled={!!deleting} onClick={() => setConfirm('')}>取消</button></> : <button onClick={() => setConfirm(p.id)}>删除帖子</button>)}</footer>
      {discussion === p.id && p.status === 'published' && <Discussion workKey={`post:${p.id}`} />}
    </article>)}
    {posts.length === 100 && <p className="studio-muted">当前展示最近 100 篇帖子。</p>}
  </section>
}
