import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { isMotionReduced, MOTION_PREFERENCE_EVENT } from '../../lib/motionPreference'
import './scroll-animation.css'

export type ScrollAnimationDirection = 'left' | 'right' | 'up' | 'down'

export interface ScrollAnimationViewport {
  /** IntersectionObserver threshold (0–1). */
  amount?: number
  /** IntersectionObserver root margin, e.g. `0px 0px -10%`. */
  margin?: string
}

export interface ScrollAnimationProps {
  children: ReactNode
  direction?: ScrollAnimationDirection
  viewport?: ScrollAnimationViewport
  className?: string
  disabled?: boolean
  style?: CSSProperties
}

/**
 * A small, dependency-free scroll reveal primitive inspired by the ScrollAnimation
 * examples. It deliberately keeps content visible until its observer is ready,
 * so a slow connection or disabled JavaScript never produces an empty section.
 */
export function ScrollAnimation({
  children,
  direction = 'up',
  viewport = {},
  className = '',
  disabled = false,
  style,
}: ScrollAnimationProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node || disabled) return

    const amount = Math.max(0, Math.min(1, viewport.amount ?? 0.35))
    const margin = viewport.margin ?? '0px 0px -10% 0px'
    let observer: IntersectionObserver | null = null
    let reduced = isMotionReduced()
    let ready = false

    const revealImmediately = () => {
      node.classList.remove('scroll-animation-ready')
      node.classList.add('scroll-animation-visible')
    }

    const start = () => {
      if (reduced || typeof IntersectionObserver === 'undefined') {
        revealImmediately()
        return
      }

      // Opt into the hidden state only once the browser can observe the element.
      ready = true
      node.classList.add('scroll-animation-ready')
      const root = node.closest<HTMLElement>('[data-scroll-root]')
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            node.classList.toggle('scroll-animation-visible', entry.isIntersecting)
          })
        },
        { root, threshold: amount, rootMargin: margin },
      )
      observer.observe(node)
    }

    const onPreference = (event: Event) => {
      reduced = Boolean((event as CustomEvent<{ reduced?: boolean }>).detail?.reduced)
      if (reduced) {
        observer?.disconnect()
        observer = null
        revealImmediately()
      } else if (!ready) {
        start()
      }
    }

    window.addEventListener(MOTION_PREFERENCE_EVENT, onPreference)
    start()

    return () => {
      observer?.disconnect()
      window.removeEventListener(MOTION_PREFERENCE_EVENT, onPreference)
      node.classList.remove('scroll-animation-ready', 'scroll-animation-visible')
    }
  }, [disabled, viewport.amount, viewport.margin])

  const classes = ['scroll-animation', `scroll-animation--${direction}`, className].filter(Boolean).join(' ')
  return <div ref={ref} className={classes} style={style}>{children}</div>
}

export default ScrollAnimation
