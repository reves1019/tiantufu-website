import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useContent } from '../lib/contentStore'
import { clampView, zoomAt, type MapView } from '../lib/mapViewport'
import { isMapMotionSettled, stepMapMotion, type MapMotionState } from '../lib/mapMotion'
import { isMotionReduced, MOTION_PREFERENCE_EVENT } from '../lib/motionPreference'

export interface LightboxImage { src: string; title: string; desc?: string; story?: string; author?: string }
interface Props { images: LightboxImage[]; index: number; onClose: () => void; onIndexChange?: (index: number) => void }
const initialView: MapView = { zoom: 1, x: 0, y: 0 }

function MapCanvas({ item }: { item: LightboxImage }) {
  const { content } = useContent()
  const ui = content.ui.lightbox
  const viewport = useRef<HTMLDivElement>(null)
  const image = useRef<HTMLImageElement>(null)
  const minimap = useRef<HTMLDivElement>(null)
  const minimapWindow = useRef<HTMLSpanElement>(null)
  const motion = useRef<MapMotionState>({ view: initialView, target: initialView, vx: 0, vy: 0 })
  const [view, setView] = useState(initialView)
  const [size, setSize] = useState({ width: 1, height: 1 })
  const [natural, setNatural] = useState({ width: 0, height: 0 })
  const [failed, setFailed] = useState(false)
  const naturalRef = useRef({ width: 0, height: 0 })
  const sizeRef = useRef({ width: 1, height: 1 })
  const geometry = useRef({ imageWidth: 1, imageHeight: 1, width: 1, height: 1 })
  const frame = useRef<number | null>(null)
  const lastFrame = useRef(0)
  const reportedZoom = useRef(1)
  const reducedMotion = useRef(false)
  const pointers = useRef(new Map<number, { x: number; y: number; time: number }>())
  const scale = natural.width ? Math.min(Math.max(1, size.width - 32) / natural.width, Math.max(1, size.height - 32) / natural.height) : 1
  const imageWidth = Math.max(1, natural.width * scale), imageHeight = Math.max(1, natural.height * scale)
  geometry.current = { imageWidth, imageHeight, ...size }

  const paint = useCallback((next: MapView) => {
    const g = geometry.current
    if (image.current) image.current.style.transform = `translate(-50%, -50%) translate(${next.x}px, ${next.y}px) scale(${next.zoom})`
    const zoomed = next.zoom > 1.005
    if (minimap.current) {
      minimap.current.style.opacity = zoomed ? '1' : '0'
      minimap.current.style.visibility = zoomed ? 'visible' : 'hidden'
    }
    if (minimapWindow.current && zoomed) {
      minimapWindow.current.style.width = `${Math.min(100, sizeRef.current.width / (g.imageWidth * next.zoom) * 100)}%`
      minimapWindow.current.style.height = `${Math.min(100, sizeRef.current.height / (g.imageHeight * next.zoom) * 100)}%`
      minimapWindow.current.style.left = `${50 - next.x / (g.imageWidth * next.zoom) * 100}%`
      minimapWindow.current.style.top = `${50 - next.y / (g.imageHeight * next.zoom) * 100}%`
    }
    if (Math.abs(next.zoom - reportedZoom.current) >= 0.01 || (!zoomed && reportedZoom.current !== 1)) {
      reportedZoom.current = next.zoom
      setView(next)
    }
  }, [])

  const schedule = useCallback(() => {
    if (frame.current !== null) return
    frame.current = requestAnimationFrame(function tick(now) {
      frame.current = null
      const dt = lastFrame.current ? Math.min(1 / 20, Math.max(0, (now - lastFrame.current) / 1000)) : 1 / 60
      lastFrame.current = now
      motion.current = stepMapMotion(motion.current, dt, geometry.current, reducedMotion.current)
      paint(motion.current.view)
      if (!isMapMotionSettled(motion.current) && !document.hidden) schedule()
      else lastFrame.current = 0
    })
  }, [paint])

  const setImmediate = useCallback((next: MapView) => {
    const bounded = clampView(next, geometry.current.imageWidth, geometry.current.imageHeight, geometry.current.width, geometry.current.height)
    motion.current = { view: bounded, target: bounded, vx: 0, vy: 0 }
    reportedZoom.current = bounded.zoom
    setView(bounded)
    paint(bounded)
  }, [paint])

  const targetZoom = useCallback((next: MapView) => {
    const bounded = clampView(next, geometry.current.imageWidth, geometry.current.imageHeight, geometry.current.width, geometry.current.height)
    motion.current = { ...motion.current, target: bounded, vx: 0, vy: 0 }
    if (reducedMotion.current) setImmediate(bounded)
    else schedule()
  }, [schedule, setImmediate])

  useEffect(() => {
    const node = viewport.current
    if (!node) return
    const frameStore = frame
    const pointerStore = pointers
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotion.current = isMotionReduced()
    const onMotionPreference = () => { reducedMotion.current = isMotionReduced(); if (reducedMotion.current) setImmediate(motion.current.view); else schedule() }
    const onAppMotionPreference = () => onMotionPreference()
    media.addEventListener?.('change', onMotionPreference)
    window.addEventListener(MOTION_PREFERENCE_EVENT, onAppMotionPreference)
    const resetGeometry = (nextSize: { width: number; height: number }) => {
      sizeRef.current = nextSize
      setSize(nextSize)
      const currentNatural = naturalRef.current
      const nextScale = currentNatural.width ? Math.min(Math.max(1, nextSize.width - 32) / currentNatural.width, Math.max(1, nextSize.height - 32) / currentNatural.height) : 1
      geometry.current = { imageWidth: Math.max(1, currentNatural.width * nextScale), imageHeight: Math.max(1, currentNatural.height * nextScale), ...nextSize }
      setImmediate(initialView)
    }
    const observer = new ResizeObserver(([entry]) => resetGeometry({ width: entry.contentRect.width, height: entry.contentRect.height }))
    observer.observe(node)
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = node.getBoundingClientRect()
      const anchorX = event.clientX - rect.left - rect.width / 2, anchorY = event.clientY - rect.top - rect.height / 2
      const current = motion.current.target
      targetZoom(zoomAt(current, current.zoom * Math.exp(-event.deltaY * 0.002), anchorX, anchorY))
    }
    node.addEventListener('wheel', wheel, { passive: false })
    return () => { observer.disconnect(); node.removeEventListener('wheel', wheel); media.removeEventListener?.('change', onMotionPreference); window.removeEventListener(MOTION_PREFERENCE_EVENT, onAppMotionPreference); if (frameStore.current !== null) cancelAnimationFrame(frameStore.current); frameStore.current = null; pointerStore.current.clear() }
  }, [schedule, setImmediate, targetZoom])

  const zoomIn = () => targetZoom(zoomAt(motion.current.target, motion.current.target.zoom * 1.5, 0, 0))
  const zoomOut = () => targetZoom(zoomAt(motion.current.target, motion.current.target.zoom / 1.5, 0, 0))
  const reset = () => setImmediate(initialView)
  return <div className="map-reading-panel">
    <div className="map-reader-tools" role="group" aria-label={ui.dialogLabel}>
      <button type="button" aria-label={ui.zoomOut} disabled={view.zoom <= 1} onClick={zoomOut}>−</button>
      <output aria-live="polite">{Math.round(view.zoom * 100)}%</output>
      <button type="button" aria-label={ui.zoomIn} disabled={view.zoom >= 8} onClick={zoomIn}>＋</button>
      <button type="button" onClick={reset}>{ui.reset}</button>
    </div>
    <div ref={viewport} className="map-reader-viewport" data-testid="map-viewport" tabIndex={0} aria-label={ui.guide}
      onKeyDown={(event) => {
        const current = motion.current.target
        if (event.key === '+' || event.key === '=') targetZoom(zoomAt(current, current.zoom * 1.5, 0, 0))
        else if (event.key === '-') targetZoom(zoomAt(current, current.zoom / 1.5, 0, 0))
        else if (event.key === '0') reset()
        else if (current.zoom > 1 && event.key.startsWith('Arrow')) targetZoom({ ...current, x: current.x + (event.key === 'ArrowLeft' ? 60 : event.key === 'ArrowRight' ? -60 : 0), y: current.y + (event.key === 'ArrowUp' ? 60 : event.key === 'ArrowDown' ? -60 : 0) })
        else return
        event.preventDefault(); event.stopPropagation()
      }}
      onDoubleClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const current = motion.current.target
        targetZoom(current.zoom > 1 ? initialView : zoomAt(current, 2.5, event.clientX - rect.left - rect.width / 2, event.clientY - rect.top - rect.height / 2))
      }}
      onPointerDown={(event) => { if (event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); motion.current = { ...motion.current, target: motion.current.view, vx: 0, vy: 0 }; pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY, time: performance.now() }) }}
      onPointerMove={(event) => {
        const previous = pointers.current.get(event.pointerId)
        if (!previous) return
        const before = [...pointers.current.values()]
        const now = performance.now()
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY, time: now })
        const after = [...pointers.current.values()]
        if (after.length >= 2) {
          const distance = (points: typeof after) => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
          const rect = event.currentTarget.getBoundingClientRect()
          const oldX = (before[0].x + before[1].x) / 2, oldY = (before[0].y + before[1].y) / 2
          const newX = (after[0].x + after[1].x) / 2, newY = (after[0].y + after[1].y) / 2
          const current = motion.current.view
          const next = zoomAt(current, current.zoom * distance(after) / Math.max(1, distance(before)), oldX - rect.left - rect.width / 2, oldY - rect.top - rect.height / 2)
          setImmediate({ ...next, x: next.x + newX - oldX, y: next.y + newY - oldY })
        } else {
          const current = motion.current.view
          const dx = event.clientX - previous.x, dy = event.clientY - previous.y
          const next = clampView({ ...current, x: current.x + dx, y: current.y + dy }, geometry.current.imageWidth, geometry.current.imageHeight, geometry.current.width, geometry.current.height)
          const dt = Math.max(.008, (now - previous.time) / 1000)
          motion.current = { view: next, target: next, vx: motion.current.vx * .65 + dx / dt * .35, vy: motion.current.vy * .65 + dy / dt * .35 }
          paint(next)
        }
      }}
      onPointerUp={(event) => { pointers.current.delete(event.pointerId); if (!pointers.current.size) schedule() }} onPointerCancel={(event) => { pointers.current.delete(event.pointerId); if (!pointers.current.size) schedule() }} onLostPointerCapture={(event) => { pointers.current.delete(event.pointerId); if (!pointers.current.size) schedule() }}>
      {!natural.width && <p role="status" className="map-reader-status">{failed ? ui.loadError : ui.loading}</p>}
      <img ref={image} src={item.src} alt={item.title} draggable={false} onError={() => setFailed(true)} onLoad={(event) => { const dims = { width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }; naturalRef.current = dims; setNatural(dims) }}
        className="map-reader-image" style={{ width: imageWidth, height: imageHeight, opacity: natural.width ? 1 : 0, transform: 'translate(-50%, -50%)' }} />
      <div ref={minimap} className="map-minimap" aria-label={ui.overview} aria-hidden="true"><img src={item.src} alt="" draggable={false} /><span ref={minimapWindow} /></div>
    </div>
    <p className="map-reader-guide">{ui.guide}</p>
  </div>
}

export default function Lightbox({ images, index, onClose, onIndexChange }: Props) {
  const { content } = useContent()
  const ui = content.ui.lightbox
  const dialog = useRef<HTMLDivElement>(null)
  const [notesOpen, setNotesOpen] = useState(() => window.matchMedia('(min-width: 1024px)').matches)
  const callbacks = useRef({ onClose, onIndexChange, index, count: images.length })
  callbacks.current = { onClose, onIndexChange, index, count: images.length }
  const item = images[Math.max(0, Math.min(index, images.length - 1))]
  useEffect(() => {
    const root = dialog.current
    if (!root) return
    const trigger = document.activeElement as HTMLElement | null
    const siblings = [...document.body.children].filter((node) => node !== root) as HTMLElement[]
    const previous = siblings.map((node) => node.inert)
    siblings.forEach((node) => { node.inert = true })
    root.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
    const key = (event: KeyboardEvent) => {
      const current = callbacks.current
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); current.onClose() }
      else if (event.key === 'Tab') {
        const nodes = [...root.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"], a[href]')].filter((node) => node.getClientRects().length)
        const first = nodes[0], last = nodes[nodes.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      } else if (!event.defaultPrevented && (event.key === 'ArrowRight' || event.key === 'ArrowLeft') && current.count > 1) {
        event.preventDefault(); current.onIndexChange?.((current.index + (event.key === 'ArrowRight' ? 1 : -1) + current.count) % current.count)
      }
    }
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('keydown', key); siblings.forEach((node, i) => { node.inert = previous[i] }); if (trigger?.isConnected) trigger.focus() }
  }, [])
  if (!item) return null
  return createPortal(<div ref={dialog} role="dialog" aria-modal="true" aria-label={ui.dialogLabel} className="map-reader atlas-night">
    <header className="map-reader-heading"><div><h2>{item.title}</h2><span className="map-reader-number">{String(index + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}</span></div><div className="reader-header-actions"><button type="button" aria-expanded={notesOpen} aria-controls="map-reading-notes" onClick={() => setNotesOpen(!notesOpen)}>{notesOpen ? content.ui.exhibition.hideStory : content.ui.exhibition.viewStory}</button><button type="button" data-testid="lightbox-close" onClick={onClose} aria-label={ui.close}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button></div></header>
    <div className={`map-reader-body ${notesOpen ? '' : 'reader-without-notes'}`}><MapCanvas key={`${item.src}-${index}`} item={item} />{notesOpen && <aside id="map-reading-notes" className="map-reader-story"><h3>{ui.storyTitle}</h3>{item.author && <p className="map-reader-author">{item.author}</p>}{item.desc && !item.desc.includes('占位') && <p className="map-reader-description">{item.desc}</p>}<div className="map-reader-note">{item.story || ui.pendingStory}</div></aside>}</div>
    {images.length > 1 && <nav className="reader-bottom-nav" aria-label={ui.dialogLabel}><button type="button" onClick={() => onIndexChange?.((index - 1 + images.length) % images.length)}>← {ui.previous}</button><span>{item.author}</span><button type="button" onClick={() => onIndexChange?.((index + 1) % images.length)}>{ui.next} →</button></nav>}
  </div>, document.body)
}
