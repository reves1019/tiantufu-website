import { useRef, type MouseEvent, type ReactNode } from 'react'

interface TiltCardProps {
  children: ReactNode
  className?: string
  /** 最大倾斜角（默认 6°） */
  maxTilt?: number
}

/** 3D 倾斜卡片：rotateX/rotateY 跟随鼠标 + 高光；<768px 与 reduced-motion 下自动禁用 */
export default function TiltCard({ children, className, maxTilt = 6 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)

  const handleMove = (event: MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    if (window.innerWidth < 768 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const rect = el.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width - 0.5
    const py = (event.clientY - rect.top) / rect.height - 0.5
    el.style.transform = `perspective(900px) rotateX(${(-py * maxTilt).toFixed(2)}deg) rotateY(${(px * maxTilt).toFixed(2)}deg)`
    el.style.setProperty('--tilt-x', `${((px + 0.5) * 100).toFixed(1)}%`)
    el.style.setProperty('--tilt-y', `${((py + 0.5) * 100).toFixed(1)}%`)
  }

  const reset = () => {
    if (ref.current) ref.current.style.transform = ''
  }

  return (
    <div ref={ref} onMouseMove={handleMove} onMouseLeave={reset} className={`tilt-card relative ${className ?? ''}`}>
      {children}
      <span aria-hidden="true" className="tilt-glare pointer-events-none absolute inset-0 z-[1]" />
    </div>
  )
}
