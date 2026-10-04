import type { PointerEvent as ReactPointerEvent } from 'react'
import { isMotionReduced } from '../lib/motionPreference'

/**
 * Writes the cursor position to CSS variables so spotlight surfaces can paint
 * their glow without a React render for every pointer event.
 */
export function updateSpotlight(event: ReactPointerEvent<HTMLElement>) {
  const node = event.currentTarget
  if (event.pointerType === 'touch' || isMotionReduced()) return
  const rect = node.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  node.style.setProperty('--spot-x', `${((event.clientX - rect.left) / rect.width) * 100}%`)
  node.style.setProperty('--spot-y', `${((event.clientY - rect.top) / rect.height) * 100}%`)
  node.style.setProperty('--spot-opacity', '1')
}

export function clearSpotlight(event: ReactPointerEvent<HTMLElement>) {
  event.currentTarget.style.setProperty('--spot-opacity', '0')
}
