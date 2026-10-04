import { useRef, type MouseEvent, type ReactNode } from 'react'
import { isMotionReduced } from '../lib/motionPreference'

interface MagneticProps {
  children: ReactNode
  className?: string
  /** 位移系数（默认 0.18） */
  strength?: number
  /** 最大位移 px（默认 8） */
  max?: number
}

/** 磁吸容器：主要 CTA 跟随鼠标轻微位移并带光斑；<768px 与 reduced-motion 下自动禁用 */
export default function Magnetic({ children, className, strength = 0.18, max = 8 }: MagneticProps) {
  const innerRef = useRef<HTMLSpanElement>(null)

  const handleMove = (event: MouseEvent<HTMLSpanElement>) => {
    const el = innerRef.current
    if (!el) return
    if (window.innerWidth < 768 || isMotionReduced()) return
    const rect = el.getBoundingClientRect()
    const dx = event.clientX - (rect.left + rect.width / 2)
    const dy = event.clientY - (rect.top + rect.height / 2)
    const tx = Math.max(-max, Math.min(max, dx * strength))
    const ty = Math.max(-max, Math.min(max, dy * strength))
    el.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`
  }

  const reset = () => {
    if (innerRef.current) innerRef.current.style.transform = ''
  }

  return (
    <span className={`inline-flex ${className ?? ''}`} onMouseMove={handleMove} onMouseLeave={reset}>
      <span ref={innerRef} className="inline-flex transition-transform duration-300 ease-out will-change-transform">
        {children}
      </span>
    </span>
  )
}
