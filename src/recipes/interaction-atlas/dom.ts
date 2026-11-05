import type { CSSProperties, KeyboardEvent } from 'react'
import { keyboardIndex } from './model'

export function tint(color?: string): CSSProperties {
  return { '--atlas-tint': color ?? '#8a5739' } as CSSProperties
}

export function moveFocus(
  event: KeyboardEvent<HTMLElement>,
  index: number,
  length: number,
  choose: (index: number) => void,
) {
  const next = keyboardIndex(event.key, index, length)
  if (next === null) return
  event.preventDefault()
  choose(next)
  // 约定：这一组控件都是同一个父节点的直接 button 子项。
  event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(':scope > button')[next]?.focus()
}

/** 无业务存储依赖；天图府启动时会把站内偏好同步到 html 的 data-motion。 */
export function shouldReduceMotion(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  return document.documentElement.dataset.motion === 'reduced'
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
