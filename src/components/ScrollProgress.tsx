import { useEffect, useRef } from 'react'

/** 页面滚动进度：跟随当前激活页面滚动容器，导航栏下方 2px 品牌红进度线 */
export default function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef(0)
  const rootRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const update = () => {
      rafRef.current = 0
      const bar = barRef.current
      const root = rootRef.current
      if (!bar || !root) return
      const max = root.scrollHeight - root.clientHeight
      const p = max > 0 ? Math.min(1, Math.max(0, root.scrollTop / max)) : 0
      bar.style.transform = `scaleX(${p.toFixed(4)})`
    }
    const onScroll = () => {
      if (!rafRef.current) rafRef.current = requestAnimationFrame(update)
    }
    const onScene = (event: Event) => {
      const id = (event as CustomEvent).detail?.id as string | undefined
      if (rootRef.current) rootRef.current.removeEventListener('scroll', onScroll)
      rootRef.current = null
      if (id) {
        const el = document.getElementById(id)
        if (el?.classList.contains('overflow-y-auto')) {
          rootRef.current = el
          el.addEventListener('scroll', onScroll, { passive: true })
        }
      }
      update()
    }

    window.addEventListener('ttf-scene', onScene)
    window.addEventListener('resize', onScroll)
    onScene(new CustomEvent('ttf-scene', { detail: { id: 'home' } }))

    return () => {
      window.removeEventListener('ttf-scene', onScene)
      window.removeEventListener('resize', onScroll)
      if (rootRef.current) rootRef.current.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-20 z-40 h-[2px]">
      <div
        ref={barRef}
        className="h-full origin-left bg-gradient-to-r from-brand-600 via-brand-400 to-brand-400 shadow-[0_0_8px_rgba(199,27,27,0.6)]"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  )
}
