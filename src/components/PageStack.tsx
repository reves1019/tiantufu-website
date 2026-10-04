import { useCallback, useEffect, useRef, useState } from 'react'
import { site, type ViewName } from '../config/site'
import { getActiveMemberId, setActiveMemberId } from '../lib/memberBus'
import { getActiveTopicId, setActiveTopicId } from '../lib/topicBus'
import { getActiveNewsIndex, setActiveNewsIndex } from '../lib/newsBus'
import { isMotionReduced } from '../lib/motionPreference'

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
])

const DEFAULT_TRANSITION_MS = 400

interface PendingNavigation {
  index: number
  /** push: 站内跳转后添加历史记录；none: 浏览器历史已先行修改 */
  history: 'push' | 'none'
}

interface PageStackProps {
  children: React.ReactNode[]
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
export default function PageStack({ children }: PageStackProps) {
  const [current, setCurrent] = useState(routeFromHash)
  const [transition, setTransition] = useState<{ from: number; to: number } | null>(null)
  const currentRef = useRef(current)
  const transitionRef = useRef<{ from: number; to: number } | null>(null)
  const busyRef = useRef(false)
  const pendingRef = useRef<PendingNavigation | null>(null)
  const navigateRef = useRef<(index: number, history: 'push' | 'none') => void>(() => undefined)
  const transitionTimerRef = useRef<number | null>(null)
  const settleTimerRef = useRef<number | null>(null)

  currentRef.current = current

  const broadcast = useCallback((index: number) => {
    const id = PAGE_IDS[index]
    document.documentElement.dataset.page = id
    document.documentElement.dataset.scene = String(index)
    window.dispatchEvent(new CustomEvent('ttf-scene', { detail: { index, id } }))
  }, [])

  const navigate = useCallback(
    (to: number, history: 'push' | 'none' = 'push') => {
      if (to < 0 || to >= PAGE_IDS.length) return

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

      const transitionMs = isMotionReduced() ? 0 : DEFAULT_TRANSITION_MS

      busyRef.current = true
      const nextTransition = { from, to }
      transitionRef.current = nextTransition
      setTransition(nextTransition)
      broadcast(to)

      transitionTimerRef.current = window.setTimeout(() => {
        currentRef.current = to
        setCurrent(to)

        // 若过渡过程中已排队新目标，先完成视觉接力，不向 history 写入中间页。
        if (!pendingRef.current && history === 'push') {
          const selectionId = PAGE_IDS[to] === 'member' ? getActiveMemberId() : PAGE_IDS[to] === 'topic' ? getActiveTopicId() : null
          const newsIndex = PAGE_IDS[to] === 'news-detail' ? getActiveNewsIndex() : null
          const targetHash = `#${PAGE_IDS[to]}${selectionId ? `?id=${encodeURIComponent(selectionId)}` : newsIndex !== null ? `?item=${newsIndex}` : ''}`
          if (window.location.hash !== targetHash) window.history.pushState(null, '', targetHash)
        }
      }, transitionMs)

      settleTimerRef.current = window.setTimeout(
        () => {
          transitionRef.current = null
          setTransition(null)
          busyRef.current = false
          const pending = pendingRef.current
          pendingRef.current = null
          if (pending && pending.index !== to) {
            window.setTimeout(() => navigateRef.current(pending.index, pending.history), 0)
          }
        },
        transitionMs + (transitionMs === 0 ? 0 : 120),
      )
    },
    [broadcast],
  )

  navigateRef.current = navigate

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
    if (raw && !PAGE_IDS.includes(raw as ViewName) && raw !== 'admin') {
      window.history.replaceState(null, '', `#${PAGE_IDS[currentRef.current]}`)
    }
  }, [broadcast])

  useEffect(
    () => () => {
      if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current)
      if (settleTimerRef.current !== null) window.clearTimeout(settleTimerRef.current)
    },
    [],
  )

  const activeIndices = transition ? new Set([transition.from, transition.to]) : new Set([current])

  return (
    <>
      <main className="atlas-paper fixed inset-0" aria-label="网站内容">
        {children.map((child, index) => {
          if (!activeIndices.has(index)) return null
          const isTarget = transition ? index === transition.to : index === current
          const label = PAGE_LABELS.get(PAGE_IDS[index]) ?? '页面'
          return (
            <div
              key={PAGE_IDS[index]}
              ref={(node) => { if (node) node.inert = transition ? !isTarget : false }}
              className={`absolute inset-0 overflow-hidden ${
                transition
                  ? isTarget
                    ? 'page-enter z-20'
                    : 'page-leave z-10 pointer-events-none'
                  : 'z-10 opacity-100'
              }`}
              aria-hidden={transition ? !isTarget : false}
              aria-label={label}
            >
              {child}
            </div>
          )
        })}
      </main>

      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {PAGE_LABELS.get(PAGE_IDS[current]) ?? '页面'}
      </span>
    </>
  )
}
