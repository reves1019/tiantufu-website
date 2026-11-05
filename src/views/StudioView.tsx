import { useEffect, useState } from 'react'
import { useContent } from '../lib/contentStore'
import { useCommunityAccess } from '../lib/useCommunityAccess'
import { postTopics, type Post } from '../lib/posts'
import AccountProfileModal from '../components/admin/AccountProfileModal'
import GalleryPanel from '../components/community/GalleryPanel'
import PostsFeed from '../components/community/PostsFeed'
import PostComposer from '../components/community/PostComposer'

export default function StudioView() {
  const { account, content, openGate, cloudMode, accountsReady, logoutAccount } = useContent()
  const access = useCommunityAccess()
  const [tab, setTab] = useState('posts'), [profile, setProfile] = useState(false), [composing, setComposing] = useState(() => new URLSearchParams(location.hash.split('?')[1]).has('compose'))
  const [editing, setEditing] = useState<Post | undefined>(), [notice, setNotice] = useState('')
  const topic = new URLSearchParams(location.hash.split('?')[1]).get('topic') ?? undefined
  useEffect(() => { const sync = () => { if (location.hash.startsWith('#studio?compose')) { setEditing(undefined); setComposing(true) } }; window.addEventListener('hashchange', sync); return () => window.removeEventListener('hashchange', sync) }, [])
  useEffect(() => { setEditing(undefined); setProfile(false) }, [account?.id])
  const linked = content.members.find(m => m.id === account?.memberId)
  const name = linked?.name || account?.displayName || '府员'
  return <section id="studio" data-scroll-root className="author-studio atlas-night"><div className="studio-container"><header className="studio-title"><div><span className="studio-eyebrow">TIANTUFU / YOUR STUDIO</span><h1>个人创作室<span>把你的世界，留在这里。</span></h1></div><a href="#community?tab=posts">浏览社区 ↗</a></header>
    <p className="studio-mode">{cloudMode ? '云端创作 · 每一次保存，都连接你的设备' : '本机体验 · 资料与帖子暂存在此浏览器，尚未同步到线上'}</p>
    {!accountsReady ? <p role="status">正在读取账号…</p> : !account ? <div className="studio-welcome"><span className="studio-eyebrow">WELCOME, CARTOGRAPHER</span><h2>你的地图，你的叙事。</h2><p>登录账号，参与地图交流，记录你的创作与灵感。</p><button className="studio-primary" onClick={openGate}>登录，进入我的创作室 ↗</button></div> : <div className="studio-layout">
      <aside className="studio-sidebar"><div className="studio-profile"><div className="studio-profile-cover" aria-hidden="true">✧</div>{(linked?.avatar || account.avatar) ? <img className="studio-avatar" src={linked?.avatar || account.avatar} alt="我的头像" /> : <div className="studio-avatar studio-avatar-letter">{name.slice(0,1)}</div>}<small>{access.canEdit ? '天图府 · 创作者' : '天图府 · 成员'}</small><h2>{name}</h2><p>{linked?.bio || account.bio || '写一段自我介绍，让大家认识你的创作。'}</p><button disabled={!access.canEdit} onClick={() => setProfile(true)}>编辑个人资料</button>{account.memberId && <a href={`#member?id=${encodeURIComponent(account.memberId)}`}>查看公开主页 ↗</a>}</div>
        <nav className="studio-side-nav" aria-label="个人创作室栏目">{[['posts','我的帖子'],['drafts','草稿箱'],['gallery','个人图库']].map(([id,label]) => <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => { setTab(id); setNotice('') }}>{label}<span>↗</span></button>)}<a href="#palace">我的图寻 ↗</a><button onClick={logoutAccount}>退出登录</button></nav>
        <div className="studio-side-note"><span className="studio-eyebrow">创作小记</span><p>署名真实，尊重原作。贴上资料来源，让每一次分享都有迹可循。</p></div>
      </aside><main className="studio-main"><div className="studio-main-heading"><div><span className="studio-eyebrow">YOUR COLLECTION</span><h2>{tab === 'drafts' ? '未完的灵感' : tab === 'gallery' ? '我的图片库' : '我的创作与讨论'}</h2></div><button className="studio-primary" disabled={!access.canEdit} onClick={() => { setEditing(undefined); setComposing(true); setNotice('') }}>＋ 发布帖子</button></div>
        {access.error && <p className="community-error" role="alert">{access.error}</p>}{!access.canEdit && !access.error && <p className="studio-muted">作者权限核实后，即可编辑资料、上传图片和发帖。</p>}
        {notice && <p className="studio-notice" role="status">{notice}</p>}
        {composing && access.canEdit && <PostComposer key={`${account.id}:${editing?.id ?? 'new'}:${topic ?? ''}`} post={editing} topic={topic} onCancel={() => { setComposing(false); setEditing(undefined) }} onDone={draft => { setComposing(false); setEditing(undefined); setTab(draft ? 'drafts' : 'posts'); setNotice(draft ? '草稿已保存，可在草稿箱继续编辑。' : '发布成功，帖子已进入所选板块。') }} />}
        <div className="studio-board-links">{postTopics.map(id => <a key={id} href={`#topic?id=${id}`}>{content.topics.find(t => t.id === id)?.name ?? id} ↗</a>)}</div>
        {tab === 'gallery' ? <GalleryPanel mine /> : <PostsFeed ownerId={account.id} drafts={tab === 'drafts'} onEdit={access.canEdit ? p => { setEditing(p); setComposing(true); document.querySelector('.studio-main-heading')?.scrollIntoView({ block: 'start', behavior: 'smooth' }) } : undefined} />}
      </main></div>}
    <AccountProfileModal open={profile} onClose={() => setProfile(false)} />
  </div></section>
}
