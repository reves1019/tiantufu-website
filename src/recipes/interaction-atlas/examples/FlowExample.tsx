import { useState } from 'react'
import { ImageFlow } from '../ImageFlow'
import type { AtlasCard } from '../types'
import { cards } from './data'

export function FlowExample({ items = cards }: { items?: AtlasCard[] }) {
  const [value, setValue] = useState(cards[0].id)
  const [opened, setOpened] = useState('无')
  return <>
    <ImageFlow items={items} value={value} onChange={setValue} onOpen={setOpened} openLabel="记录打开请求" />
    <p className="learning-state" role="status">value：{value} · onOpen：{opened}（由页面接入自己的阅读器）</p>
  </>
}
