import { useEffect, useRef } from 'react'
import { isMotionReduced, MOTION_PREFERENCE_EVENT } from '../lib/motionPreference'

/** A quiet React-Bits-style dot field: pointer position is painted through CSS vars. */
export default function PageBackdrop() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    let reduced = isMotionReduced()
    let targetX = 0.52
    let targetY = 0.42
    let currentX = targetX
    let currentY = targetY
    let frame = 0
    let disposed = false

    const write = () => {
      frame = 0
      currentX += (targetX - currentX) * (reduced ? 1 : 0.08)
      currentY += (targetY - currentY) * (reduced ? 1 : 0.08)
      node.style.setProperty('--ambient-x', `${(currentX * 100).toFixed(2)}%`)
      node.style.setProperty('--ambient-y', `${(currentY * 100).toFixed(2)}%`)
      node.style.setProperty('--ambient-shift-x', `${((currentX - .5) * 22).toFixed(2)}px`)
      node.style.setProperty('--ambient-shift-y', `${((currentY - .5) * 16).toFixed(2)}px`)
      if (!disposed && !reduced && !document.hidden) frame = requestAnimationFrame(write)
    }
    const schedule = () => { if (!frame && !disposed && !document.hidden) frame = requestAnimationFrame(write) }
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      targetX = Math.min(1, Math.max(0, event.clientX / Math.max(1, window.innerWidth)))
      targetY = Math.min(1, Math.max(0, event.clientY / Math.max(1, window.innerHeight)))
      schedule()
    }
    const onVisibility = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0 } else schedule() }
    const onPreference = () => { reduced = isMotionReduced(); cancelAnimationFrame(frame); frame = 0; write() }
    window.addEventListener('pointermove', onPointer, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    reducedQuery.addEventListener('change', onPreference)
    window.addEventListener(MOTION_PREFERENCE_EVENT, onPreference)
    write()
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onPointer)
      document.removeEventListener('visibilitychange', onVisibility)
      reducedQuery.removeEventListener('change', onPreference)
      window.removeEventListener(MOTION_PREFERENCE_EVENT, onPreference)
    }
  }, [])

  return <div ref={ref} aria-hidden="true" className="atlas-backdrop pointer-events-none fixed inset-0 z-0 overflow-hidden">
    <span className="atlas-backdrop-grid" />
    <span className="atlas-backdrop-glow" />
    <span className="atlas-backdrop-ring" />
  </div>
}
