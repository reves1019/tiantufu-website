import { useCallback, useEffect, useState } from 'react'
import { Heart, MessageCircle, Trash2 } from 'lucide-react'
import { useContent } from '../../lib/contentStore'
import { addComment, communityError, getDiscussion, removeComment, setLike, type Comment } from '../../lib/community'

export default function Discussion({ workKey, onLogin }: { workKey: string; onLogin?: () => void }) {
  const { account, admin, openGate, cloudMode } = useContent()
  const [data, setData] = useState<{ comments: Comment[]; count: number; liked: boolean }>({ comments: [], count: 0, liked: false })
  const [body, setBody] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const refresh = useCallback(async () => { setData(await getDiscussion(workKey, account)) }, [workKey, account])
  useEffect(() => {
    let alive = true
    setBody(''); setError(''); setData({ comments: [], count: 0, liked: false })
    const load = () => { void getDiscussion(workKey, account).then(d => { if (alive) setData(d) }).catch(e => { if (alive) setError(communityError(e)) }) }
    load(); const timer = window.setInterval(load, 15000)
    return () => { alive = false; clearInterval(timer) }
  }, [workKey, account])
  const run = async (action: () => Promise<void>) => {
    if (!account) { (onLogin ?? openGate)(); return }
    if (busy) return; setBusy(true); setError('')
    try { await action(); await refresh() } catch (e) { setError(communityError(e)) } finally { setBusy(false) }
  }
  return <section className="community-discussion" aria-label="评论与点赞">
    <div className="community-discussion-heading"><h3><MessageCircle size={16} /> 交流与讨论</h3><button type="button" aria-label={data.liked ? '取消点赞' : '点赞'} aria-pressed={data.liked} disabled={busy} onClick={() => void run(() => setLike(workKey, account, !data.liked))}><Heart size={17} fill={data.liked ? 'currentColor' : 'none'} /> {data.count}</button></div>
    {!cloudMode && <small className="community-muted">本机演示 · 评论与点赞仅保存在此浏览器</small>}
    {account ? <form onSubmit={e => { e.preventDefault(); void run(async () => { await addComment(workKey, account, body); setBody('') }) }}>
      <label className="sr-only" htmlFor={`comment-${workKey}`}>写下评论</label><textarea id={`comment-${workKey}`} value={body} maxLength={1000} onChange={e => setBody(e.target.value)} placeholder="分享你的看法…" rows={2} disabled={busy} />
      <div className="community-row"><small>{body.length} / 1000</small><button className="community-primary" type="submit" disabled={busy || !body.trim()}>发表评论</button></div>
    </form> : <button type="button" className="community-login-hint" onClick={onLogin ?? openGate}>登录或注册后，参与评论和点赞 ↗</button>}
    {error && <p className="community-error" role="alert">{error}</p>}
    <div className="community-comments">{data.comments.length ? data.comments.map(c => <article key={c.id}><header><strong>{c.author}</strong><time>{new Date(c.created_at).toLocaleDateString('zh-CN')}</time>{(admin || c.user_id === account?.id) && <button disabled={busy} aria-label="删除评论" onClick={() => void run(() => removeComment(workKey, account, c))}><Trash2 size={13} /></button>}</header><p>{c.body}</p></article>) : <p className="community-muted">还没有评论，留下第一条阅读札记吧。</p>}</div>
  </section>
}
