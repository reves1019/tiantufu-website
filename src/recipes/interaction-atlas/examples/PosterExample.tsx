import { useState } from 'react'
import { SilkPoster } from '../SilkPoster'
import { cards } from './data'

export function PosterExample() {
  const [opens, setOpens] = useState(0)
  return <>
    <SilkPoster item={cards[0]} eyebrow="指针坐标 → 倾角" onOpen={() => setOpens(count => count + 1)} />
    <p className="learning-state" role="status">onOpen 调用次数：{opens}（示例只记录事件）</p>
  </>
}
