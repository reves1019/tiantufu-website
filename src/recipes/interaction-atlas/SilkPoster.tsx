import { useRef } from 'react'
import type { PointerEvent } from 'react'
import type { AtlasCard } from './types'
import { shouldReduceMotion, tint } from './dom'
import { CardArt } from './CardArt'
import './styles.css'

export interface SilkPosterProps {
  item: AtlasCard
  eyebrow?: string
  onOpen?: () => void
  motionReduced?: () => boolean
}

export function SilkPoster({ item, eyebrow = '山河来信', onOpen, motionReduced = shouldReduceMotion }: SilkPosterProps) {
  const root = useRef<HTMLElement>(null)
  const reset = () => {
    root.current?.style.setProperty('--tilt-x', '0deg')
    root.current?.style.setProperty('--tilt-y', '0deg')
  }
  const tilt = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse' || motionReduced()) return reset()
    const bounds = event.currentTarget.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return
    // 中心为 0、边缘为 ±0.5，因此 9 表示总角度区间，单边最大约 4.5°。
    const x = (event.clientX - bounds.left) / bounds.width - .5
    const y = (event.clientY - bounds.top) / bounds.height - .5
    // 每帧坐标不影响语义内容，用 CSS 变量避免每次 pointermove 都重渲染。
    event.currentTarget.style.setProperty('--tilt-x', `${y * -9}deg`)
    event.currentTarget.style.setProperty('--tilt-y', `${x * 9}deg`)
  }
  return <article ref={root} className="atlas-art atlas-poster" style={tint(item.color)} onPointerMove={tilt} onPointerLeave={reset}>
    <span className="atlas-poster-eyebrow">{eyebrow}</span>
    <CardArt item={item} />
    {onOpen && <button type="button" className="atlas-poster-open" onClick={onOpen}>查看作品 ↗</button>}
  </article>
}
