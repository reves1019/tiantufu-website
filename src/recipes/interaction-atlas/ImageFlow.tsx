import { useRef } from 'react'
import type { PointerEvent } from 'react'
import type { Point, SelectionProps } from './types'
import { useSelection } from './useSelection'
import { moveFocus, tint } from './dom'
import { swipeStep, wrapIndex } from './model'
import { CardArt } from './CardArt'
import './styles.css'

export interface ImageFlowProps extends SelectionProps {
  onOpen?: (id: string) => void
  openLabel?: string
}

export function ImageFlow({ items, value, onChange, label = '地图流式轮播', onOpen, openLabel = '查看原图' }: ImageFlowProps) {
  const { selected, choose } = useSelection(items, value, onChange)
  const start = useRef<Point | null>(null)
  const moved = useRef(false)
  const index = Math.max(0, items.findIndex(item => item.id === selected?.id))
  const step = (delta: number) => {
    const next = wrapIndex(index + delta, items.length)
    if (next >= 0) choose(items[next].id)
  }
  const finishSwipe = (event: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return
    const delta = swipeStep(start.current, { x: event.clientX, y: event.clientY })
    if (delta) { moved.current = true; step(delta) }
    start.current = null
  }
  return <div className="atlas-flow" role="region" aria-roledescription="轮播" aria-label={label}>
    <div
      className="atlas-flow-track"
      onPointerDown={event => { start.current = { x: event.clientX, y: event.clientY }; moved.current = false }}
      onPointerUp={finishSwipe}
      onPointerCancel={() => { start.current = null; moved.current = false }}
    >
      {items.map((item, itemIndex) => <button
        type="button"
        key={item.id}
        className="atlas-art atlas-flow-card"
        style={tint(item.color)}
        aria-label={item.title}
        aria-pressed={selected?.id === item.id}
        data-active={selected?.id === item.id}
        onClick={event => {
          // 吞掉滑动结束合成的 click，避免新选择被松手处的卡片覆盖；键盘 click 仍有效。
          if (!moved.current || event.detail === 0) choose(item.id)
          moved.current = false
        }}
        onKeyDown={event => moveFocus(event, itemIndex, items.length, next => choose(items[next].id))}
      ><CardArt item={item} /></button>)}
    </div>
    <div className="atlas-controls">
      <button type="button" onClick={() => step(-1)} disabled={!items.length} aria-label="上一张地图">←</button>
      <span aria-live="polite">{items.length ? `${index + 1} / ${items.length} · ${selected?.title}` : '暂无地图'}</span>
      <button type="button" onClick={() => step(1)} disabled={!items.length} aria-label="下一张地图">→</button>
    </div>
    {onOpen && selected && <div className="atlas-controls">
      <button type="button" onClick={() => onOpen(selected.id)} aria-label={`${openLabel} · ${selected.title}`}>{openLabel} ↗</button>
    </div>}
  </div>
}
