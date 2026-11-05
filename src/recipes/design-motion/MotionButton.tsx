import { useEffect, useRef } from 'react'
import type { CSSProperties, PointerEvent, ReactNode } from 'react'
import type { ButtonId, MotionOptions } from './model'
import { useReducedMotion } from './useReducedMotion'
import './controls.css'

export interface MotionButtonProps {
  children: ReactNode
  variant: ButtonId
  options: MotionOptions
  reduced?: boolean
  disabled?: boolean
  onClick?: () => void
}

/** 原创微动效按钮；选择、提交、导航等业务行为仍由调用页面负责。 */
export function MotionButton({ children, variant, options, reduced, disabled = false, onClick }: MotionButtonProps) {
  const reduce = useReducedMotion(reduced)
  const button = useRef<HTMLButtonElement>(null)
  const reset = () => {
    button.current?.style.setProperty('--dm-magnet-x', '0px')
    button.current?.style.setProperty('--dm-magnet-y', '0px')
  }
  useEffect(() => {
    if (reduce || disabled || variant !== 'magnetic') {
      button.current?.style.setProperty('--dm-magnet-x', '0px')
      button.current?.style.setProperty('--dm-magnet-y', '0px')
    }
  }, [reduce, disabled, variant])

  const attract = (event: PointerEvent<HTMLSpanElement>) => {
    if (reduce || disabled || variant !== 'magnetic' || event.pointerType !== 'mouse') return reset()
    // 以不移动的外壳测量坐标，避免读取已变换按钮造成来回抖动。
    const bounds = event.currentTarget.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return
    const strength = Number.isFinite(options.distance) ? Math.max(0, Math.min(28, options.distance * .35)) : 8
    const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left - bounds.width / 2) / (bounds.width / 2)))
    const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top - bounds.height / 2) / (bounds.height / 2)))
    button.current?.style.setProperty('--dm-magnet-x', `${x * strength}px`)
    button.current?.style.setProperty('--dm-magnet-y', `${y * strength}px`)
  }

  const duration = Number.isFinite(options.duration) ? Math.max(80, Math.min(2000, options.duration)) : 400
  return <span className="dm-button-anchor" onPointerMove={attract} onPointerLeave={reset} onPointerCancel={reset}>
    <button
      ref={button}
      type="button"
      className="dm-motion-button"
      data-variant={variant}
      data-dm-reduced={reduce}
      style={{ '--dm-duration': `${duration}ms`, '--dm-color': options.color } as CSSProperties}
      disabled={disabled}
      onClick={onClick}
      onFocus={reset}
    >
      <span className="dm-button-label">{children}</span>
      <span className="dm-button-arrow" aria-hidden="true">↗</span>
    </button>
  </span>
}
