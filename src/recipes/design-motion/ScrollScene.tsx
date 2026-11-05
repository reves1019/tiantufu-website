import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import type { MotionOptions, ScrollId } from './model'
import { normalizeOptions } from './model'
import { useReducedMotion } from './useReducedMotion'
import './motion.css'

export function ScrollScene({ variant, options, replay = 0, reduced = false }: {
  variant: ScrollId; options: MotionOptions; replay?: number; reduced?: boolean
}) {
  const viewport = useRef<HTMLDivElement>(null)
  const quiet = useReducedMotion(reduced)
  const { duration, distance, color } = normalizeOptions(options)
  useEffect(() => {
    const root = viewport.current
    if (!root) return
    root.scrollTop = 0
    const cards = Array.from(root.querySelectorAll<HTMLElement>('.dm-scroll-card'))
    let frame = 0
    const animations: Animation[] = []
    let observer: IntersectionObserver | undefined
    if (!quiet && variant === 'reveal' && 'IntersectionObserver' in window) {
      cards.forEach(card => { card.style.opacity = '0' })
      observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return
        const card = entry.target as HTMLElement
        card.style.opacity = '1'
        if (typeof card.animate === 'function') animations.push(card.animate([
          { opacity: 0, transform: `translateY(${distance}px)`, clipPath: 'inset(12% 0 0)' },
          { opacity: 1, transform: 'none', clipPath: 'inset(0)' },
        ], { duration, easing: 'cubic-bezier(.2,.8,.2,1)' }))
        observer?.unobserve(card)
      }), { root, threshold: .12 })
      cards.forEach(card => observer?.observe(card))
    }
    const render = () => {
      frame = 0
      if (quiet || variant !== 'parallax') return
      const bounds = root.getBoundingClientRect()
      cards.forEach(card => {
        const offset = Math.max(-1, Math.min(1, (card.getBoundingClientRect().top - bounds.top - bounds.height / 2) / bounds.height))
        card.style.setProperty('--dm-scroll-offset', `${offset * distance}px`)
      })
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(render) }
    root.addEventListener('scroll', onScroll, { passive: true })
    render()
    return () => {
      observer?.disconnect()
      root.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
      animations.forEach(animation => animation.cancel())
      cards.forEach(card => { card.style.opacity = ''; card.style.removeProperty('--dm-scroll-offset') })
    }
  }, [variant, duration, distance, quiet, replay])
  return <div ref={viewport} className="dm-scroll-scene" data-variant={variant} data-reduced={quiet} tabIndex={0} role="region" aria-label="滚动效果预览，向下滚动">
    <p className="dm-scroll-hint">在此区域向下滚动 ↓ · 键盘可用方向键</p>
    {['线索', '山河', '远方'].map((name, index) => <article key={name} className="dm-scroll-card" style={{ '--dm-accent': color } as CSSProperties}>
      <div className="dm-scroll-art" aria-hidden="true"><div className="dm-contours" /></div>
      <div className="dm-scroll-copy"><small>CHAPTER 0{index + 1}</small><h3>{name}</h3><p>以地图阅读时间，以线条连接想象。</p></div>
    </article>)}
  </div>
}
