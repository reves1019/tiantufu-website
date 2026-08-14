import { useCallback, useEffect, useRef, useState } from 'react'
import { site, type ViewName } from '../config/site'

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
const TRANSITION_MS = 700

interface PageStackProps {
  children: React.ReactNode[]
}

/**
 * 页面叠层：上下淡入淡出切换（0.7s ease-in-out，中间约 0.2s 交叠）。
 * 支持侧边栏/导航/按钮点击与滚轮切换；过渡期间背景纯黑。
 */
export default function PageStack({ children }: PageStackProps) {
  const [current, setCurrent] = useState(() => {
    const raw = window.location.hash.replace(/^#\/?/, '')
    const idx = PAGE_IDS.indexOf(raw as ViewName)
    return idx >= 0 ? idx : 0
  })
  const [transition, setTransition] = useState<{ from: number; to: number } | null>(null)
  const currentRef = useRef(current)
  const busyRef = useRef(false)

  currentRef.current = current

  const broadcast = useCallback((index: number) => {
    document.documentElement.dataset.page = String(index)
    window.dispatchEvent(new CustomEvent('ttf-scene', { detail: { index, id: PAGE_IDS[index] } }))
  }, [])

  const navigate = useCallback(
    (to: number) => {
      if (busyRef.current) return
      if (to < 0 || to >= PAGE_IDS.length) return
      const from = currentRef.current
      if (to === from) return
      busyRef.current = true
      setTransition({ from, to })
      broadcast(to)
      window.setTimeout(() => {
        currentRef.current = to
        setCurrent(to)
        const targetHash = `#${PAGE_IDS[to]}`
        if (window.location.hash !== targetHash) {
          window.history.pushState(null, '', targetHash)
        }
      }, TRANSITION_MS)
      window.setTimeout(() => {
        setTransition(null)
        busyRef.current = false
      }, TRANSITION_MS + 120)
    },
    [broadcast],
  )

  // 侧边栏 / 导航 / 按钮请求
  useEffect(() => {
    const onRequest = (event: Event) => {
      const detail = (event as CustomEvent).detail as { index?: number }
      if (typeof detail?.index === 'number') navigate(detail.index)
    }
    window.addEventListener('ttf-scene-request', onRequest)
    return () => window.removeEventListener('ttf-scene-request', onRequest)
  }, [navigate])

  // 浏览器前进/后退
  useEffect(() => {
    const onHash = () => {
      const raw = window.location.hash.replace(/^#\/?/, '')
      const idx = PAGE_IDS.indexOf(raw as ViewName)
      if (idx >= 0) navigate(idx)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [navigate])

  // 初始广播
  useEffect(() => {
    broadcast(currentRef.current)
  }, [broadcast])

  const toLayerClass = (index: number) => {
    if (transition) {
      if (index === transition.to) return 'page-enter z-20'
      if (index === transition.from) return 'page-leave z-10'
      return 'pointer-events-none z-0 opacity-0'
    }
    return index === current ? 'z-10 opacity-100' : 'pointer-events-none z-0 opacity-0'
  }

  return (
    <>
      {/* 页面叠层 */}
      <main className="fixed inset-0">
        {children.map((child, i) => (
          <div
            key={PAGE_IDS[i]}
            className={`absolute inset-0 overflow-hidden ${toLayerClass(i)}`}
            aria-hidden={transition ? i !== transition.to && i !== transition.from : i !== current}
          >
            {child}
          </div>
        ))}
      </main>

      {/* 过渡期间纯黑背景遮罩 */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 z-30 bg-black transition-opacity duration-300 ${
          transition ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </>
  )
}
