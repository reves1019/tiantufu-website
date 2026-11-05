import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { MotionOptions, TextId } from './model'
import { useReducedMotion } from './useReducedMotion'
import './controls.css'

export interface MotionTextProps {
  text: string
  variant: TextId
  options: MotionOptions
  replay?: number
  reduced?: boolean
}

/**
 * 原创实现：文字的语义层只读一次，视觉字符层独立错峰或归位。
 * 通用模式参考记录见 docs/design-studio/component-research.md。
 */
export function MotionText({ text, variant, options, replay = 0, reduced }: MotionTextProps) {
  const reduce = useReducedMotion(reduced)
  const duration = Number.isFinite(options.duration) ? Math.max(80, Math.min(4000, options.duration)) : 600
  const stagger = Number.isFinite(options.stagger) ? Math.max(0, Math.min(200, options.stagger)) : 30
  const distance = Number.isFinite(options.distance) ? Math.max(0, Math.min(100, options.distance)) : 24
  const segments = useMemo(() => {
    if (typeof Intl.Segmenter === 'function') {
      return Array.from(new Intl.Segmenter('zh-CN', { granularity: 'grapheme' }).segment(text), part => part.segment)
    }
    return Array.from(text)
  }, [text])
  const identity = JSON.stringify([text, variant, replay, duration, stagger, distance])
  const [scramble, setScramble] = useState({ identity: '', value: text })

  useEffect(() => {
    if (reduce || variant !== 'scramble' || !segments.length) return
    let frame = 0
    let started: number | null = null
    let previousTick = -1
    let cancelled = false
    const alphabet = ['·', '＋', '◇', '△', '○', '□', '╱', '╲']
    const tick = (now: number) => {
      if (cancelled) return
      started ??= now
      const elapsed = now - started
      const progress = Math.min(1, elapsed / duration)
      const timeStep = Math.floor(elapsed / 35)
      // 每次最多更新约 29 次/秒；固定的前缀不会再抖动，空白保持原位。
      if (timeStep !== previousTick || progress === 1) {
        previousTick = timeStep
        const fixed = Math.floor(progress * segments.length)
        const value = segments.map((segment, index) =>
          index < fixed || /^\s+$/u.test(segment) ? segment : alphabet[(index * 3 + timeStep) % alphabet.length],
        ).join('')
        setScramble({ identity, value: progress === 1 ? text : value })
      }
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [reduce, variant, segments, duration, identity, text])

  const style = {
    '--dm-duration': `${duration}ms`,
    '--dm-distance': `${distance}px`,
    '--dm-color': options.color,
  } as CSSProperties
  // identity 改变后，不显示旧文本的动画残留；减少动态时直接显示完整原文。
  const scrambledText = !reduce && scramble.identity === identity ? scramble.value : text
  return <span className="dm-motion-text" data-variant={variant} data-dm-reduced={reduce} style={style}>
    <span className="dm-visually-hidden">{text}</span>
    <span key={identity} className="dm-text-visual" aria-hidden="true">
      {variant === 'scramble'
        ? scrambledText
        : segments.map((segment, index) => <span
          key={index}
          className="dm-glyph"
          style={{ '--dm-delay': `${Math.min(index * stagger, 2400)}ms` } as CSSProperties}
        >{segment}</span>)}
    </span>
  </span>
}
