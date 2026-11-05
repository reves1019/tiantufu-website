import { useState } from 'react'
import { ScratchCard } from '../ScratchCard'
import { cards } from './data'

export function ScratchExample() {
  const [index, setIndex] = useState(0)
  const [threshold, setThreshold] = useState(.45)
  const [reveals, setReveals] = useState(0)
  const item = cards[index]
  return <>
    <div className="learning-options">
      <label>揭晓阈值 {Math.round(threshold * 100)}%
        <input aria-label="揭晓阈值" type="range" min=".1" max=".9" step=".05" value={threshold} onChange={event => setThreshold(Number(event.target.value))} />
      </label>
      <button type="button" onClick={() => setIndex(current => (current + 1) % cards.length)}>换一张练习图</button>
    </div>
    <ScratchCard key={item.id} item={item} threshold={threshold} onReveal={() => setReveals(count => count + 1)} />
    <p className="learning-state" role="status">累计揭晓：{reveals} · 换图用 key 重建覆盖层</p>
  </>
}
