import { useCallback, useEffect, useRef, useState, type Dispatch, type PointerEvent as ReactPointerEvent, type RefObject, type SetStateAction, type MouseEvent as ReactMouseEvent } from 'react'
import { zoomShelfAt, type ShelfCamera } from './shelfCamera'

type BaseCamera = { width: number; height: number; cx: number; cy: number; scale: number }
type Finger = { x: number; y: number; startX: number; startY: number; onButton: boolean }
const initial = { zoom: 1, x: 0, y: 0 }

export function useShelfCamera(viewport: RefObject<HTMLDivElement | null>, base: BaseCamera) {
  const [view, setView] = useState<ShelfCamera>(initial)
  const [interacting, setInteracting] = useState(false)
  const current = useRef(view), baseRef = useRef(base)
  baseRef.current = base
  const fingers = useRef(new Map<number, Finger>())
  const active = useRef(false), blockedClickUntil = useRef(0), wheelTimer = useRef<number | undefined>(undefined)
  const commit = useCallback((next: ShelfCamera) => { current.current = next; setView(next) }, [])

  // Interrupt an in-flight focus animation at its visible position before zooming.
  const begin = useCallback(() => {
    if (!active.current) {
      const world = viewport.current?.querySelector<HTMLElement>('.clue-world')
      if (world) {
        const matrix = new DOMMatrixReadOnly(getComputedStyle(world).transform)
        const b = baseRef.current
        if (matrix.a > 0 && b.scale > 0) commit({ zoom: matrix.a / b.scale, x: matrix.e + b.cx * matrix.a - b.width / 2, y: matrix.f + b.cy * matrix.a - b.height / 2 })
        // Disable interpolation immediately; React will keep this class while active.
        viewport.current?.classList.add('is-interacting')
      }
      active.current = true; setInteracting(true)
    }
  }, [commit, viewport])
  const finish = useCallback(() => {
    if (!fingers.current.size && wheelTimer.current === undefined) {
      active.current = false; setInteracting(false)
      viewport.current?.classList.remove('is-interacting')
    }
  }, [viewport])
  const resetCamera = useCallback(() => {
    clearTimeout(wheelTimer.current); wheelTimer.current = undefined
    for (const id of fingers.current.keys()) if (viewport.current?.hasPointerCapture(id)) viewport.current.releasePointerCapture(id)
    fingers.current.clear(); active.current = false; setInteracting(false)
    viewport.current?.classList.remove('is-interacting')
    commit(initial)
  }, [commit, viewport])
  const setZoom: Dispatch<SetStateAction<number>> = useCallback(value => {
    const v = current.current
    commit(zoomShelfAt(v, typeof value === 'function' ? value(v.zoom) : value, { x: 0, y: 0 }))
  }, [commit])
  const setPan: Dispatch<SetStateAction<{ x: number; y: number }>> = useCallback(value => {
    const v = current.current, pan = typeof value === 'function' ? value(v) : value
    commit({ ...v, ...pan })
  }, [commit])

  useEffect(() => {
    const element = viewport.current
    if (!element) return
    const activeFingers = fingers.current
    const wheel = (event: WheelEvent) => {
      if (!event.deltaY) return
      event.preventDefault()
      begin()
      const bounds = element.getBoundingClientRect()
      const anchor = { x: event.clientX - bounds.left - element.clientLeft - element.clientWidth / 2, y: event.clientY - bounds.top - element.clientTop - element.clientHeight / 2 }
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1)
      const factor = Math.exp(-Math.max(-240, Math.min(240, delta)) * .002)
      commit(zoomShelfAt(current.current, current.current.zoom * factor, anchor))
      clearTimeout(wheelTimer.current)
      wheelTimer.current = window.setTimeout(() => { wheelTimer.current = undefined; finish() }, 160)
    }
    // React's delegated wheel listener can be passive; only this canvas consumes wheel input.
    element.addEventListener('wheel', wheel, { passive: false })
    return () => { element.removeEventListener('wheel', wheel); clearTimeout(wheelTimer.current); wheelTimer.current = undefined; activeFingers.clear() }
  }, [begin, commit, finish, viewport])

  const point = (event: ReactPointerEvent<HTMLDivElement>) => {
    const element = event.currentTarget, bounds = element.getBoundingClientRect()
    return { x: event.clientX - bounds.left - element.clientLeft - element.clientWidth / 2, y: event.clientY - bounds.top - element.clientTop - element.clientHeight / 2 }
  }
  const capture = (element: HTMLDivElement, id: number) => { if (!element.hasPointerCapture(id)) element.setPointerCapture(id) }
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const onButton = !!(event.target as Element).closest('button')
    if (event.button !== 0 || (event.pointerType === 'mouse' && onButton)) return
    const p = point(event)
    fingers.current.set(event.pointerId, { ...p, startX: p.x, startY: p.y, onButton })
    if (fingers.current.size >= 2) {
      begin(); blockedClickUntil.current = performance.now() + 500
      for (const id of fingers.current.keys()) capture(event.currentTarget, id)
    } else if (!onButton) { begin(); capture(event.currentTarget, event.pointerId) }
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const finger = fingers.current.get(event.pointerId)
    if (!finger) return
    const before = [...fingers.current.values()].slice(0, 2), p = point(event)
    fingers.current.set(event.pointerId, { ...finger, ...p })
    if (fingers.current.size >= 2) {
      event.preventDefault(); begin(); blockedClickUntil.current = performance.now() + 500
      const after = [...fingers.current.values()].slice(0, 2)
      const distance = (points: Finger[]) => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
      const midpoint = (points: Finger[]) => ({ x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 })
      const oldDistance = distance(before)
      if (oldDistance > 2) commit(zoomShelfAt(current.current, current.current.zoom * distance(after) / oldDistance, midpoint(before), midpoint(after)))
    } else if (Math.hypot(p.x - finger.startX, p.y - finger.startY) > 5) {
      event.preventDefault(); begin(); capture(event.currentTarget, event.pointerId)
      blockedClickUntil.current = performance.now() + 500
      commit({ ...current.current, x: current.current.x + p.x - finger.x, y: current.current.y + p.y - finger.y })
    }
  }
  const endPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!fingers.current.delete(event.pointerId)) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    for (const [id, finger] of fingers.current) fingers.current.set(id, { ...finger, startX: finger.x, startY: finger.y })
    finish()
  }
  const suppressGestureClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.detail > 0 && performance.now() < blockedClickUntil.current) { event.preventDefault(); event.stopPropagation() }
  }
  return {
    zoom: view.zoom, pan: { x: view.x, y: view.y }, setZoom, setPan, interacting, resetCamera,
    bind: { onPointerDown, onPointerMove, onPointerUp: endPointer, onPointerCancel: endPointer, onLostPointerCapture: (event: ReactPointerEvent<HTMLDivElement>) => { if (event.target === event.currentTarget) endPointer(event) }, onClickCapture: suppressGestureClick, onDoubleClickCapture: suppressGestureClick },
  }
}
