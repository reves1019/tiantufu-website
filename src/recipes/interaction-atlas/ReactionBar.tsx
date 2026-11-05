import { useState } from 'react'
import type { Reaction } from './types'
import { moveFocus, tint } from './dom'
import './styles.css'

export interface ReactionBarProps {
  items: Reaction[]
  value?: string | null
  onChange?: (id: string | null) => void
}

export function ReactionBar({ items, value, onChange }: ReactionBarProps) {
  const [local, setLocal] = useState<string | null>(null)
  // undefined 表示不受控；null 是受控模式下有效的“没有选择”，不能用 ??。
  const current = value === undefined ? local : value
  const toggle = (id: string) => {
    const next = current === id ? null : id
    if (value === undefined) setLocal(next)
    onChange?.(next)
  }
  return <div className="atlas-reactions">
    <div role="group" aria-label="作品感受">
      {items.map((item, index) => <button
        type="button"
        key={item.id}
        style={tint(item.color)}
        aria-label={item.label}
        aria-pressed={current === item.id}
        // 方向键仅移动焦点；Enter/Space 由原生 button 触发切换。
        onKeyDown={event => moveFocus(event, index, items.length, () => undefined)}
        onClick={() => toggle(item.id)}
      ><span aria-hidden="true">{item.symbol}</span><small>{item.label}</small></button>)}
    </div>
    <p role="status">{items.find(item => item.id === current)?.label ?? '选一个感受，再点一次取消。'}</p>
  </div>
}
