import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Images, ShieldCheck, UserRound } from 'lucide-react'
import { useContent } from '../lib/contentStore'
import GalleryPanel from '../components/community/GalleryPanel'
import PostsFeed from '../components/community/PostsFeed'
import WhitelistManager from '../components/community/WhitelistManager'
import NotificationSettings from '../components/community/NotificationSettings'
export default function CommunityView() {
  const { admin, account, cloudMode, openGate } = useContent()
  const root = useRef<HTMLElement>(null)
  const routeTab = () => { const value = new URLSearchParams(location.hash.split('?')[1]).get('tab'); return value === 'mine' || value === 'members' || value === 'posts' ? value : 'gallery' }
  const [tab, updateTab] = useState(routeTab)
  const setTab = (next: string) => { updateTab(next); history.replaceState(null, '', next === 'gallery' ? '#community' : `#community?tab=${next}`) }
  useEffect(() => {
    const sync = () => { if (location.hash.split('?')[0] !== '#community') return; updateTab(routeTab()); if (root.current) root.current.scrollTop = 0 }
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])
  return <section ref={root} id="community" data-scroll-root className="community-page"><div className="community-container"><header className="community-page-heading"><div><span className="community-eyebrow">TIANTUFU / COMMUNITY</span><h1>府员创作室<span>每一张地图，都有自己的故事。</span></h1></div><a href="#palace">进入图寻 <ArrowUpRight size={18} /></a></header>
    <div className="community-status">{cloudMode ? '云端模式 · 申请与创作连接到共享社区' : '本机体验 · 云端连接尚未配置，内容保存在此浏览器'}</div>
    <nav className="community-tabs" aria-label="创作室栏目"><button aria-current={tab === 'posts' ? 'page' : undefined} onClick={() => setTab('posts')}>社区帖子</button><a href="#studio">个人创作室 ↗</a><button aria-current={tab === 'gallery' ? 'page' : undefined} onClick={() => setTab('gallery')}><Images size={16} />府员新作</button><button aria-current={tab === 'mine' ? 'page' : undefined} onClick={() => setTab('mine')}><UserRound size={16} />我的图库</button>{admin && <button aria-current={tab === 'members' ? 'page' : undefined} onClick={() => setTab('members')}><ShieldCheck size={16} />QQ 白名单</button>}{!account && <button onClick={openGate}>注册 / 登录 ↗</button>}</nav>
    {tab === 'posts' ? <PostsFeed /> : tab === 'members' && admin ? <WhitelistManager /> : <GalleryPanel key={tab} mine={tab === 'mine'} />}
    <NotificationSettings />
  </div></section>
}
