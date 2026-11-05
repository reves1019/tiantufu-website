import { useState } from 'react'
import { ReactionBar } from '../ReactionBar'
import { reactions } from './data'

export function ReactionExample() {
  const [value, setValue] = useState<string | null>(null)
  return <>
    <ReactionBar items={reactions} value={value} onChange={setValue} />
    <p className="learning-state" role="status">value：{value === null ? 'null（未选择）' : value} · 不计入真实点赞</p>
  </>
}
