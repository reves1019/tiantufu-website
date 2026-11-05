import { useState } from 'react'
import type { SelectionProps } from './types'
import { useSelection } from './useSelection'
import { moveFocus, tint } from './dom'
import { CardArt } from './CardArt'
import './styles.css'

export function ExpandingStrip({ items, value, onChange, label = '地图卡带' }: SelectionProps) {
  const { selected, choose } = useSelection(items, value, onChange)
  const [hovered, setHovered] = useState<string | null>(null)
  // 预览与确认分开：悬停只改变外观，aria-pressed 仍表示点击确认的条目。
  const preview = items.some(item => item.id === hovered) ? hovered : selected?.id
  return <div className="atlas-strip" role="group" aria-label={label} onPointerLeave={() => setHovered(null)}>
    {items.map((item, index) => <button
      type="button"
      key={item.id}
      className="atlas-art atlas-strip-card"
      style={tint(item.color)}
      data-expanded={preview === item.id}
      aria-pressed={selected?.id === item.id}
      aria-label={item.title}
      onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(item.id) }}
      onClick={() => { choose(item.id); setHovered(null) }}
      onKeyDown={event => moveFocus(event, index, items.length, next => { setHovered(null); choose(items[next].id) })}
    ><CardArt item={item} /></button>)}
  </div>
}
