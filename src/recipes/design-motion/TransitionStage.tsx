import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { normalizeOptions, transitionFrames } from './model'
import type { MotionOptions, TransitionId } from './model'
import { useReducedMotion } from './useReducedMotion'
import './motion.css'

export function TransitionLayer({ children, preset, phase, duration, distance, reduced = false }: {
  children: ReactNode; preset: TransitionId; phase: 'enter' | 'leave'; duration: number; distance: number; reduced?: boolean
}) {
  const root = useRef<HTMLDivElement>(null)
  const quiet = useReducedMotion(reduced)
  const settings = normalizeOptions({ duration, distance })
  useLayoutEffect(() => {
    const node = root.current
    if (!node) return
    node.inert = phase === 'leave'
    if (quiet || typeof node.animate !== 'function') return
    const animation = node.animate(transitionFrames(preset, phase, settings.distance), {
      duration: settings.duration, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both',
    })
    return () => animation.cancel()
  }, [preset, phase, settings.duration, settings.distance, quiet])
  return <div ref={root} className="dm-transition-layer" data-phase={phase} aria-hidden={phase === 'leave'}>{children}</div>
}

export function TransitionStage({ variant, options, replay = 0, reduced = false }: {
  variant: TransitionId; options: MotionOptions; replay?: number; reduced?: boolean
}) {
  const [scene, setScene] = useState(0)
  const settings = normalizeOptions(options)
  return <div className="dm-transition-example">
    <div className="dm-stage" aria-label="页面转场预览">
      <TransitionLayer key={`${variant}-${replay}-${scene}`} preset={variant} phase="enter" duration={settings.duration} distance={settings.distance} reduced={reduced}>
        <div className={`dm-scene dm-scene-${scene % 2}`} style={{ '--dm-accent': settings.color } as React.CSSProperties}>
          <div className="dm-contours" aria-hidden="true" />
          <small>TIANTUFU / CHAPTER 0{scene % 2 + 1}</small>
          <h3>{scene % 2 ? '循线，寻见远方。' : '山河，自此展开。'}</h3>
          <p>示意画面 · 转场只改变呈现方式</p>
        </div>
      </TransitionLayer>
    </div>
    <button type="button" className="dm-demo-control" onClick={() => setScene(value => value + 1)}>切换预览章节 →</button>
  </div>
}
