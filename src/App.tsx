import { lazy, Suspense, useEffect } from 'react'
import Navbar from './components/Navbar'
import PageBackdrop from './components/PageBackdrop'
import PageStack from './components/PageStack'
import IntroSequence from './components/IntroSequence'
import RevealObserver from './components/RevealObserver'
import ScrollProgress from './components/ScrollProgress'
import SearchOverlay from './components/SearchOverlay'
import ShortcutOverlay from './components/ShortcutOverlay'
import AdminGate from './components/admin/AdminGate'
import AdminToolbar from './components/admin/AdminToolbar'
import ContentManager from './components/admin/ContentManager'
import AccountManager from './components/admin/AccountManager'
import CloudPasswordRecovery from './components/admin/CloudPasswordRecovery'
import MemberToolbar from './components/admin/MemberToolbar'
import { ContentProvider, useContent } from './lib/contentStore'
// Route views are loaded only when PageStack makes them active. This keeps the
// initial homepage chunk small while preserving hash navigation and transitions.
const AboutView = lazy(() => import('./views/AboutView'))
const ContactView = lazy(() => import('./views/ContactView'))
const DirectoryView = lazy(() => import('./views/DirectoryView'))
const EarthView = lazy(() => import('./views/EarthView'))
const HomeView = lazy(() => import('./views/HomeView'))
const MemberView = lazy(() => import('./views/MemberView'))
const NewsView = lazy(() => import('./views/NewsView'))
const CultureView = lazy(() => import('./views/CultureView'))
const ContestView = lazy(() => import('./views/ContestView'))
const WorkView = lazy(() => import('./views/WorkView'))
const TopicView = lazy(() => import('./views/TopicView'))
const JoinView = lazy(() => import('./views/JoinView'))
const CommissionView = lazy(() => import('./views/CommissionView'))
const FaqView = lazy(() => import('./views/FaqView'))
const LegalView = lazy(() => import('./views/LegalView'))
const NewsDetailView = lazy(() => import('./views/NewsDetailView'))
const WorksView = lazy(() => import('./views/WorksView'))
import { initMotionPreference } from './lib/motionPreference'
import './community.css'
import './studio.css'
const PalaceView = lazy(() => import('./views/PalaceView'))
const CommunityView = lazy(() => import('./views/CommunityView'))
const StudioView = lazy(() => import('./views/StudioView'))
const LabView = lazy(() => import('./views/LabView'))
const DesignStudioView = lazy(() => import('./views/DesignStudioView'))

/** 入场幕布：页面加载时向上掀起 */
function EntranceCurtain() {
  return (
    <div aria-hidden="true" className="curtain pointer-events-none fixed inset-0 z-[100] bg-ink-950">
      <div className="flex h-full items-center justify-center">
        <span className="font-display text-lg tracking-[0.5em] text-parchment-100/40">天图府</span>
      </div>
    </div>
  )
}

function AppShell() {
  const { openGate, content } = useContent()

  useEffect(() => initMotionPreference(), [])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && (event.key === 'A' || event.key === 'a')) {
        event.preventDefault()
        openGate()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openGate])

  // 通过 #admin 直达管理入口（离线演示/发给他人时也能找到入口）
  useEffect(() => {
    if (window.location.hash === '#admin') openGate()
  }, [openGate])

  return (
    <>
      <EntranceCurtain />
      {/* 全局复古地图背景 */}
      <PageBackdrop />
      <Navbar />
      {/* 页面滚动进度 */}
      <ScrollProgress />
      {/* 长页滚动显现 */}
      <RevealObserver />
      {/* 页面叠层：上下淡入淡出切换 */}
      <Suspense fallback={<div className="atlas-route-loading" role="status" aria-live="polite">LOADING ATLAS…</div>}>
      <PageStack motion={content.designMotion}>
        <HomeView />
        <AboutView />
        <DirectoryView />
        <EarthView />
        <WorksView />
        <ContactView />
        {/* 成员个人页（隐藏页：仅通过作品集卡片进入） */}
        <MemberView />
        {/* 社团新闻（隐藏页：从社团介绍进入） */}
        <NewsView />
        {/* 社团文化（隐藏页：从社团介绍进入） */}
        <CultureView />
        {/* 单图制图大赛（隐藏页：从新闻进入） */}
        <ContestView />
        {/* 数码地球随机作品（隐藏页：点击地球进入） */}
        <WorkView />
        {/* 创作主题子页（隐藏页：从创作主题进入） */}
        <TopicView />
        {/* 加入我们（隐藏页：首页/联系页进入） */}
        <JoinView />
        {/* 约稿服务（隐藏页：联系页进入） */}
        <CommissionView />
        {/* 常见问题（隐藏页：联系页进入） */}
        <FaqView />
        {/* 版权与免责（隐藏页：联系页进入） */}
        <LegalView />
        {/* 新闻详情（隐藏页：新闻列表进入） */}
        <NewsDetailView />
        <PalaceView />
        <CommunityView />
        <StudioView />
        <LabView />
        <DesignStudioView />
      </PageStack>
      </Suspense>
      {/* 开场序章（会话首次播放，可跳过） */}
      <IntroSequence />
      {/* 键盘快捷键提示 */}
      <ShortcutOverlay />
      {/* 全局站内搜索（Ctrl+K / / 唤起） */}
      <SearchOverlay />
      <AdminGate />
      <AdminToolbar />
      {/* 成员登录后的资料编辑工具栏 */}
      <MemberToolbar />
      {/* 管理员内容管理（成员/作品/新闻/文化/年鉴/FAQ/主题/分类/约稿） */}
      <ContentManager />
      {/* 管理员账号管理（审核成员注册/重置密码/导入导出） */}
      <AccountManager />
      <CloudPasswordRecovery />
    </>
  )
}

export default function App() {
  return (
    <ContentProvider>
      <AppShell />
    </ContentProvider>
  )
}
