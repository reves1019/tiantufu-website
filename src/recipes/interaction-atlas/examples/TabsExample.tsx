import { useState } from 'react'
import { ShaderTabs } from '../ShaderTabs'
import type { AtlasCard } from '../types'
import { cards } from './data'

export function TabsExample({ items = cards }: { items?: AtlasCard[] }) {
  const [value, setValue] = useState(cards[0].id)
  const [requested, setRequested] = useState('尚未操作')
  const [locked, setLocked] = useState(false)
  return <>
    <label className="learning-check"><input type="checkbox" checked={locked} onChange={event => setLocked(event.target.checked)} />锁定父级选择</label>
    <ShaderTabs items={items} value={value} onChange={id => {
      setRequested(id)
      if (!locked) setValue(id)
    }} />
    <p className="learning-state" role="status">父级 value：{value} · 最近 onChange：{requested}</p>
  </>
}
