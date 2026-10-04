import type { CSSProperties, ReactNode } from 'react'
import './scroll-text-marquee.css'

interface ScrollTextMarqueeProps {
  children: ReactNode
  baseVelocity?: number
  delay?: number
  className?: string
  label?: string
}

/** A quiet, non-intercepting text current for section transitions. */
export default function ScrollBaseAnimation({ children, baseVelocity = 3, delay = 0, className = '', label }: ScrollTextMarqueeProps) {
  const velocity = Math.max(0.25, Math.abs(baseVelocity))
  const duration = Math.max(18, 72 / velocity)
  const direction = baseVelocity < 0 ? 'reverse' : 'normal'
  const style = {
    '--marquee-duration': `${duration}s`,
    '--marquee-delay': `${delay}ms`,
    '--marquee-direction': direction,
  } as CSSProperties
  return <div className={`scroll-text-marquee ${className}`} aria-label={label}>
    <span className="sr-only">{label ?? children}</span>
    <div className="scroll-text-marquee-viewport" aria-hidden="true">
      <div className="scroll-text-marquee-track" style={style}>
        <span>{children}</span><span>{children}</span>
      </div>
    </div>
  </div>
}
