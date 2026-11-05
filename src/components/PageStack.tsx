import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { site, type ViewName } from '../config/site'
import { getActiveMemberId, setActiveMemberId } from '../lib/memberBus'
import { getActiveTopicId, setActiveTopicId } from '../lib/topicBus'
import { getActiveNewsIndex, setActiveNewsIndex } from '../lib/newsBus'
import { isMotionReduced, MOTION_PREFERENCE_EVENT } from '../lib/motionPreference'
import { normalizePageMotion, transitionFrames, type PageMotionSettings } from '../recipes/design-motion/model'

const PAGE_IDS: ViewName[] = [
  ...site.nav.map((item) => item.href.slice(1) as ViewName),
  'member',
  'news',
  'culture',
  'contest',
  'work',
  'topic',
  'join',
  'commission',
  'faq',
  'legal',
  'news-detail',
  'palace',
  'community',
  'studio',
  'lab',
  'design-studio',
]

const PAGE_LABELS = new Map<string, string>([
  ...site.nav.map((item) => [item.href.slice(1), item.label] as [string, string]),
  ['member', '成员主页'],
  ['news', '社团新闻'],
  ['culture', '社团文化'],
  ['contest', '单图制图大赛'],
  ['work', '作品详情'],
  ['topic', '创作主题'],
  ['join', '加入我们'],
  ['commission', '约稿服务'],
  ['faq', '常见问题'],
  ['legal', '版权与免责'],
  ['news-detail', '新闻详情'],
  ['palace', '图寻'],
  ['community', '府员创作室'],
  ['studio', '个人创作室'],
  ['lab', '交互图鉴实验室'],
  ['design-studio', '动效制作'],
])

interface PendingNavigation {
  index: number
  /** push: 站内跳转后添加历史记录；none: 浏览器历史已先行修改 */
  history: 'push' | 'none'
}

interface PageStackProps {
  children: React.ReactNode[]
  motion?: PageMotionSettings
}

interface PageTransition {
  from: number
  to: number
  history: 'push' | 'none'
  /** 一次转场的快照；远端同步和制作端调参不能改写正在播放的动画。 */
  motion: PageMotionSettings
  duration: number
  committed: boolean
}

function PageLayer({ children, label, transition, isTarget }: {
  children: React.ReactNode
  label: string
  transition: PageTransition | null
  isTarget: boolean
}) {
  const node = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (!node.current) return
    node.current.inert = transition ? !isTarget : false
    if (!transition || transition.motion.preset === 'original' || !transition.duration || isMotionReduced()) return
    if (typeof node.current.animate !== 'function') return
    const animation = node.current.animate(
      transitionFrames(transition.motion.preset, isTarget ? 'enter' : 'leave', transition.motion.distance),
      { duration: transition.duration, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' },
    )
    return () => animation.cancel()
  }, [transition, isTarget])
  const original = transition?.motion.preset === 'original'
  return <div
    ref={node}
    className={`absolute inset-0 overflow-hidden ${transition
      ? isTarget ? `${original ? 'page-enter ' : ''}z-20` : `${original ? 'page-leave ' : ''}z-10 pointer-events-none`
      : 'z-10 opacity-100'}`}
    data-transition-preset={transition?.motion.preset ?? 'idle'}
    data-transition-phase={transition ? isTarget ? 'enter' : 'leave' : 'current'}
    aria-hidden={transition ? !isTarget : false}
    aria-label={label}
  >{children}</div>
}

function routeFromHash(): number {
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0]
  const idx = PAGE_IDS.indexOf(raw as ViewName)
  return idx >= 0 ? idx : 0
}

/**
 * 页面叠层：上下淡入淡出切换。只挂载当前页和正在过渡的两页，
 * 让隐藏页面里的 canvas、鼠标监听和定时器随离场一并停止。
 */
export default function PageStack({ children, motion }: PageStackProps) {
  const [current, setCurrent] = useState(routeFromHash)
  const [transition, setTransition] = useState<PageTransition | null>(null)
  const currentRef = useRef(current)
  const transitionRef = useRef<PageTransition | null>(null)
  const motionRef = useRef(normalizePageMotion(motion))
  const busyRef = useRef(false)
  const pendingRef = useRef<PendingNavigation | null>(null)
  const navigateRef = useRef<(index: number, history: 'push' | 'none') => void>(() => undefined)
  const transitionTimerRef = useRef<number | null>(null)
  const settleTimerRef = useRef<number | null>(null)
  const pendingTimerRef = useRef<number | null>(null)

  currentRef.current = current
  motionRef.current = normalizePageMotion(motion)

  const broadcast = useCallback((index: number) => {
    const id = PAGE_IDS[index]
    document.documentElement.dataset.page = id
    document.documentElement.dataset.scene = String(index)
    window.dispatchEvent(new CustomEvent('ttf-scene', { detail: { index, id } }))
  }, [])

  const commitTransition = useCallback((active: PageTransition) => {
    if (transitionRef.current !== active || active.committed) return
    active.committed = true
    currentRef.current = active.to
    setCurrent(active.to)
    // 最新意图尚在排队时，不把中间页写进浏览器历史。
    if (!pendingRef.current && active.history === 'push') {
      const selectionId = PAGE_IDS[active.to] === 'member' ? getActiveMemberId() : PAGE_IDS[active.to] === 'topic' ? getActiveTopicId() : null
      const newsIndex = PAGE_IDS[active.to] === 'news-detail' ? getActiveNewsIndex() : null
      const targetHash = `#${PAGE_IDS[active.to]}${selectionId ? `?id=${encodeURIComponent(selectionId)}` : newsIndex !== null ? `?item=${newsIndex}` : ''}`
      if (window.location.hash !== targetHash) window.history.pushState(null, '', targetHash)
    }
  }, [])

  const settleTransition = useCallback((active: PageTransition) => {
    if (transitionRef.current !== active) return
    if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current)
    if (settleTimerRef.current !== null) window.clearTimeout(settleTimerRef.current)
    transitionTimerRef.current = null
    settleTimerRef.current = null
    commitTransition(active)
    transitionRef.current = null
    setTransition(null)
    busyRef.current = false
    const pending = pendingRef.current
    pendingRef.current = null
    if (pending && pending.index !== active.to) {
      pendingTimerRef.current = window.setTimeout(() => {
        pendingTimerRef.current = null
        navigateRef.current(pending.index, pending.history)
      }, 0)
    }
  }, [commitTransition])

  const navigate = useCallback(
    (to: number, history: 'push' | 'none' = 'push') => {
      if (to < 0 || to >= PAGE_IDS.length) return
      // 在上一转场完成和排队导航启动之间到达的新意图也应该优先。
      if (pendingTimerRef.current !== null) {
        window.clearTimeout(pendingTimerRef.current)
        pendingTimerRef.current = null
      }

      if (busyRef.current) {
        const activeTransition = transitionRef.current
        if (activeTransition?.to === to) {
          // 再次选择当前目标，取消之前排队的另一个页面。
          pendingRef.current = null
        } else {
          // 连续点击/滚动/浏览器前进后退时保留最后一次意图，不丢导航请求。
          pendingRef.current = { index: to, history }
        }
        return
      }

      const from = currentRef.current
      if (to === from) return

      const settings = { ...motionRef.current }
      const transitionMs = isMotionReduced() ? 0 : settings.duration

      busyRef.current = true
      const nextTransition: PageTransition = { from, to, history, motion: settings, duration: transitionMs, committed: false }
      transitionRef.current = nextTransition
      setTransition(nextTransition)
      broadcast(to)

      transitionTimerRef.current = window.setTimeout(() => commitTransition(nextTransition), transitionMs)

      settleTimerRef.current = window.setTimeout(
        () => settleTransition(nextTransition),
        transitionMs + (transitionMs === 0 ? 0 : 120),
      )
    },
    [broadcast, commitTransition, settleTransition],
  )

  navigateRef.current = navigate

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const finishForReducedMotion = () => {
      const active = transitionRef.current
      if (active && isMotionReduced()) settleTransition(active)
    }
    // WAAPI 不受 CSS 动画时长覆盖控制；切换偏好时移除转场层会取消各层 Animation。
    window.addEventListener(MOTION_PREFERENCE_EVENT, finishForReducedMotion)
    media.addEventListener('change', finishForReducedMotion)
    return () => {
      window.removeEventListener(MOTION_PREFERENCE_EVENT, finishForReducedMotion)
      media.removeEventListener('change', finishForReducedMotion)
    }
  }, [settleTransition])

  useEffect(() => {
    const onRequest = (event: Event) => {
      const detail = (event as CustomEvent).detail as { index?: number }
      if (typeof detail?.index === 'number') navigate(detail.index)
    }
    window.addEventListener('ttf-scene-request', onRequest)
    return () => window.removeEventListener('ttf-scene-request', onRequest)
  }, [navigate])

  // 浏览器前进/后退：hash 已由浏览器更新，不再额外 pushState。
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash.startsWith('#member?')) {
        const id = new URLSearchParams(window.location.hash.split('?')[1]).get('id')
        if (id) setActiveMemberId(id)
      }
      if (window.location.hash.startsWith('#topic?')) {
        const id = new URLSearchParams(window.location.hash.split('?')[1]).get('id')
        if (id) setActiveTopicId(id)
      }
      if (window.location.hash.startsWith('#news-detail?')) {
        const index = getActiveNewsIndex()
        if (index !== null) setActiveNewsIndex(index)
      }
      navigate(routeFromHash(), 'none')
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [navigate])

  useEffect(() => {
    broadcast(currentRef.current)
    const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0]
    // Supabase must consume email confirmation / password recovery fragments first.
    const authCallback = /(?:^#|&)(?:access_token|refresh_token|error|type)=/.test(window.location.hash)
    if (raw && !authCallback && !PAGE_IDS.includes(raw as ViewName) && raw !== 'admin') {
      window.history.replaceState(null, '', `#${PAGE_IDS[currentRef.current]}`)
    }
  }, [broadcast])

  useEffect(
    () => () => {
      if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current)
      if (settleTimerRef.current !== null) window.clearTimeout(settleTimerRef.current)
      if (pendingTimerRef.current !== null) window.clearTimeout(pendingTimerRef.current)
      transitionRef.current = null
    },
    [],
  )

  const activeIndices = transition ? new Set([transition.from, transition.to]) : new Set([current])

  return (
    <>
      <main className="atlas-paper fixed inset-0" aria-label="网站内容" data-page-motion={normalizePageMotion(motion).preset}>
        {children.map((child, index) => {
          if (!activeIndices.has(index)) return null
          const isTarget = transition ? index === transition.to : index === current
          const label = PAGE_LABELS.get(PAGE_IDS[index]) ?? '页面'
          return (
            <PageLayer
              key={PAGE_IDS[index]}
              transition={transition}
              isTarget={isTarget}
              label={label}
            >
              {child}
            </PageLayer>
          )
        })}
      </main>

      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {PAGE_LABELS.get(PAGE_IDS[current]) ?? '页面'}
      </span>
    </>
  )
}
