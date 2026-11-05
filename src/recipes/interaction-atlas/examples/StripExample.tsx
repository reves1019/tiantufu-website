import { useState } from 'react'
import { ExpandingStrip } from '../ExpandingStrip'
import type { AtlasCard } from '../types'
import { cards } from './data'

export function StripExample({ items = cards }: { items?: AtlasCard[] }) {
  const [value, setValue] = useState(cards[0].id)
  return <>
    <ExpandingStrip items={items} value={value} onChange={setValue} />
    <p className="learning-state" role="status">已确认：{value} · 悬停预览不会改动这个值</p>
  </>
}
