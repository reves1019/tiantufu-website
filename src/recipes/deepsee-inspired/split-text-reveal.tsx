import { createElement, useEffect, useRef, useState, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { isMotionReduced, MOTION_PREFERENCE_EVENT } from '../../lib/motionPreference'
import './split-text-reveal.css'

export interface SplitTextRevealProps {
  children: ReactNode
  as?: keyof JSX.IntrinsicElements
  className?: string
  delay?: number
  duration?: number
  scrub?: boolean
  triggerStart?: string
  disabled?: boolean
  safeMotion?: boolean
}

/** Local, dependency-free adaptation of the DeepSee split-text recipe. */
export function SplitTextReveal({ children, as: Tag = 'span', className = '', delay = 0, duration = 0.78, disabled = false }: SplitTextRevealProps) {
  const ref = useRef<HTMLElement>(null)
  const [reduced, setReduced] = useState(isMotionReduced)
  const text = typeof children === 'string' ? children : String(children)

  useEffect(() => {
    const onPreference = (event: Event) => setReduced(Boolean((event as CustomEvent<{ reduced?: boolean }>).detail?.reduced))
    window.addEventListener(MOTION_PREFERENCE_EVENT, onPreference)
    return () => window.removeEventListener(MOTION_PREFERENCE_EVENT, onPreference)
  }, [])

  useEffect(() => {
    if (!ref.current || reduced || disabled) return
    const chars = Array.from(ref.current.querySelectorAll<HTMLElement>('.deepsee-split-char'))
    const ctx = gsap.context(() => {
      gsap.fromTo(chars, { opacity: 0, yPercent: 105, rotate: 5 }, {
        opacity: 1, yPercent: 0, rotate: 0, duration, delay, stagger: 0.022, ease: 'power3.out',
      })
    }, ref)
    return () => ctx.revert()
  }, [reduced, disabled, duration, delay, text])

  const nodes = Array.from(text).map((char, index) => char === ' '
    ? <span aria-hidden="true" className="deepsee-split-space" key={`${index}-space`}> </span>
    : <span aria-hidden="true" className="deepsee-split-char" key={`${index}-${char}`}>{char}</span>)
  return createElement(Tag as any, { ref, className: `deepsee-split ${className}`, 'aria-label': text },
    <span className="sr-only">{text}</span>, nodes)
}

export default SplitTextReveal
