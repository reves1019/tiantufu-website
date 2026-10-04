import { forwardRef, useEffect, useRef, useState, type HTMLAttributes, type PointerEvent } from 'react'
import { galleryActiveIndex, galleryPose } from '../../lib/circularGallery'
import { isMotionReduced, MOTION_PREFERENCE_EVENT } from '../../lib/motionPreference'

export interface GalleryItem {
  id?: string
  common: string
  binomial: string
  photo: { url: string; text: string; pos?: string; by: string }
}
interface GalleryLabels {
  region: string; previous: string; next: string; pause: string; play: string; read: string; hint: string
}
interface CircularGalleryProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  items: GalleryItem[]
  radius?: number
  /** Degrees per second, rather than degrees per frame. */
  autoRotateSpeed?: number
  onSelect?: (index: number) => void
  labels: GalleryLabels
  variant?: 'ring' | 'accordion'
}

/** Map sheets arranged in depth; the view stays stationary and the ring moves. */
export const CircularGallery = forwardRef<HTMLDivElement, CircularGalleryProps>(function CircularGallery(
  { items, radius = 540, autoRotateSpeed = 3, onSelect, labels, variant = 'ring', className = '', ...props }, ref) {
  const accordion = variant === 'accordion'
  const stage = useRef<HTMLDivElement>(null)
  const cards = useRef<(HTMLButtonElement | null)[]>([])
  const engine = useRef({ rotation: 0, target: 0, radius, active: 0, visible: false, hover: false, focus: false, reduced: false, flat: false, dragging: false, moving: false })
  const gesture = useRef({ start: 0, y: 0, rotation: 0, moved: false, pointer: -1 })
  const suppressClick = useRef(false)
  const [active, setActive] = useState(0)
  const [isFlat, setIsFlat] = useState(false)
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(paused)
  const speedRef = useRef(autoRotateSpeed)
  speedRef.current = autoRotateSpeed
  pausedRef.current = paused
  const current = items[active] ?? items[0]

  useEffect(() => {
    const node = stage.current
    if (!node || !items.length) return
    const state = engine.current
    state.rotation = state.target = 0
    state.active = -1
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const flat = window.matchMedia('(max-width: 899px)')
    let frame = 0, previous = 0
    const paint = () => {
      const index = galleryActiveIndex(state.rotation, items.length)
      if (index !== state.active) { state.active = index; setActive(index) }
      node.dataset.active = String(index)
      node.dataset.rotation = state.rotation.toFixed(2)
      cards.current.forEach((card, i) => {
        if (!card) return
        const angle = i * 360 / items.length + state.rotation
        const pose = galleryPose(angle, state.radius)
        card.style.transform = state.flat ? '' : `translate3d(${pose.x}px,0,${pose.z}px) rotateY(${pose.tilt}deg)`
        card.style.opacity = state.flat ? '1' : String(pose.opacity)
        card.style.zIndex = String(Math.round(1000 + pose.z))
      })
    }
    const tick = (now: number) => {
      const dt = previous ? Math.min((now - previous) / 1000, .05) : 0
      previous = now
      if (state.visible && !document.hidden && !state.flat) {
        if (state.moving) {
          state.rotation += (state.target - state.rotation) * (state.reduced ? 1 : 1 - Math.exp(-8 * dt))
          if (Math.abs(state.target - state.rotation) < .01) { state.rotation = state.target; state.moving = false }
        } else if (!state.reduced && !pausedRef.current && !state.hover && !state.focus && !state.dragging && items.length > 1) {
          state.rotation -= speedRef.current * dt
          state.target = state.rotation
        }
        paint()
      }
      frame = requestAnimationFrame(tick)
    }
    const preferences = () => { state.reduced = isMotionReduced(); state.flat = accordion || flat.matches; setIsFlat(accordion || flat.matches); paint() }
    const resize = new ResizeObserver(([entry]) => { state.radius = Math.min(radius, entry.contentRect.width * .46); paint() })
    const visibility = new IntersectionObserver(([entry]) => { state.visible = entry.isIntersecting }, { threshold: .1 })
    resize.observe(node); visibility.observe(node)
    reduced.addEventListener('change', preferences); flat.addEventListener('change', preferences)
    window.addEventListener(MOTION_PREFERENCE_EVENT, preferences)
    preferences(); frame = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(frame); resize.disconnect(); visibility.disconnect(); reduced.removeEventListener('change', preferences); flat.removeEventListener('change', preferences); window.removeEventListener(MOTION_PREFERENCE_EVENT, preferences) }
  }, [items.length, radius, accordion])

  const turn = (direction: number) => {
    const state = engine.current
    const index = ((state.active + direction) % items.length + items.length) % items.length
    if (state.flat) { cards.current[index]?.scrollIntoView({ behavior: state.reduced ? 'instant' : 'smooth', block: 'nearest', inline: 'center' }); state.active = index; setActive(index); return }
    state.target = Math.round((state.moving ? state.target : state.rotation) / (360 / items.length)) * (360 / items.length) - direction * 360 / items.length
    state.moving = true
  }
  const drag = (event: PointerEvent<HTMLDivElement>) => {
    if (engine.current.flat || !engine.current.dragging || gesture.current.pointer !== event.pointerId) return
    const delta = event.clientX - gesture.current.start
    if (Math.abs(delta) > 6) { gesture.current.moved = true; suppressClick.current = true; event.currentTarget.setPointerCapture(event.pointerId) }
    engine.current.rotation = engine.current.target = gesture.current.rotation + delta * .18
  }
  const release = (event: PointerEvent<HTMLDivElement>) => {
    if (gesture.current.pointer !== event.pointerId) return
    engine.current.dragging = false
    if (gesture.current.moved) { engine.current.target = Math.round(engine.current.rotation / (360 / items.length)) * (360 / items.length); engine.current.moving = true }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  const syncFlatSelection = () => {
    const node = stage.current
    if (!node || !engine.current.flat) return
    const center = node.scrollLeft + node.clientWidth / 2
    let closest = 0, distance = Infinity
    cards.current.forEach((card, i) => { if (!card) return; const next = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center); if (next < distance) { closest = i; distance = next } })
    if (closest !== engine.current.active) { engine.current.active = closest; setActive(closest) }
    node.dataset.active = String(closest)
  }
  if (!items.length) return null
  return <div ref={ref} className={`circular-gallery ${accordion ? 'is-accordion' : ''} ${className}`} role="region" aria-label={labels.region} onPointerEnter={() => { engine.current.hover = true }} onPointerLeave={() => { engine.current.hover = false }} onFocusCapture={() => { engine.current.focus = true }} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) engine.current.focus = false }} {...props}>
    <div ref={stage} className="circular-gallery-stage" onScroll={syncFlatSelection}
      onPointerDown={(event) => { if (event.button !== 0 || engine.current.flat) return; suppressClick.current = false; gesture.current = { start: event.clientX, y: event.clientY, rotation: engine.current.rotation, moved: false, pointer: event.pointerId }; engine.current.dragging = true; engine.current.moving = false }}
      onPointerMove={drag} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={() => { engine.current.dragging = false }}
      onKeyDown={(event) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); turn(event.key === 'ArrowRight' ? 1 : -1) } }}>
      {items.map((item, i) => <button type="button" className="circular-gallery-sheet" key={item.id ?? `${item.photo.url}-${i}`} ref={(node) => { cards.current[i] = node }}
        tabIndex={isFlat || i === active ? 0 : -1} aria-current={i === active ? 'true' : undefined} data-index={String(i + 1).padStart(2, '0')} aria-label={`${labels.read}：${item.common}`} onFocus={() => { if (engine.current.flat) return; const step = 360 / items.length; const turns = Math.round((engine.current.rotation + i * step) / 360); engine.current.target = -i * step + turns * 360; engine.current.moving = true }} onClick={() => { if (!suppressClick.current) onSelect?.(i); suppressClick.current = false }} onDragStart={(event) => event.preventDefault()}>
        <img src={item.photo.url} alt={item.photo.text} draggable={false} loading="lazy" decoding="async" style={{ objectPosition: item.photo.pos ?? 'center' }} />
        <span className="circular-gallery-meta"><strong>{item.common}</strong><small>{item.photo.by}</small></span>
        <span className="circular-gallery-read">{labels.read} ↗</span>
      </button>)}
    </div>
    <div className="circular-gallery-caption"><div><span className="circular-gallery-index">ARCHIVE / {String(active + 1).padStart(2, '0')} · {current?.binomial}</span><h3>{current?.common}</h3><p>{current?.photo.by}</p></div>{!accordion && <div className="circular-gallery-controls"><button type="button" onClick={() => turn(-1)} disabled={items.length < 2} aria-label={labels.previous}>←</button><span>{String(active + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}</span><button type="button" onClick={() => turn(1)} disabled={items.length < 2} aria-label={labels.next}>→</button><button type="button" className="circular-gallery-pause" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? labels.play : labels.pause}</button></div>}</div>
    <p className="circular-gallery-hint">{labels.hint}</p>
  </div>
})
