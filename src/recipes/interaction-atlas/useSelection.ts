import { useState } from 'react'
import type { AtlasCard } from './types'

export function useSelection(items: AtlasCard[], value?: string, onChange?: (id: string) => void) {
  const [local, setLocal] = useState(items[0]?.id ?? '')
  // 直接派生，避免用 effect 同步第二份 selected 状态；列表删项也能回退。
  const selected = items.find(item => item.id === (value ?? local)) ?? items[0]
  const choose = (id: string) => {
    if (value === undefined) setLocal(id)
    onChange?.(id)
  }
  return { selected, choose }
}
