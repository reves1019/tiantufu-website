import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import './review-marquee.css'
import { isMotionReduced, MOTION_PREFERENCE_EVENT } from '../../lib/motionPreference'

export interface ReviewMarqueeItem {
  id: string
  name: string
  role: string
  body: ReactNode
  avatar?: string
  index?: string
}

interface ReviewMarqueeProps {
  items: ReviewMarqueeItem[]
  label?: string
  /** Optional map/portrait images shown as a restrained cursor trail while browsing the notes. */
  trailImages?: string[]
}

interface TrailItem {
  id: number
  x: number
  y: number
  src: string
  rotation: number
}

function ReviewCard({ item, duplicate = false }: { item: ReviewMarqueeItem; duplicate?: boolean }) {
  return <article
    className="review-marquee-card"
    role="listitem"
    aria-label={`${item.name} · ${item.role}`}
    aria-hidden={duplicate ? true : undefined}
    tabIndex={duplicate ? undefined : 0}
  >
    <div className="review-marquee-card-header">
      {item.avatar
        ? <img src={item.avatar} alt="" loading="lazy" decoding="async" />
        : <span className="review-marquee-avatar" aria-hidden="true">{item.name.slice(0, 1)}</span>}
      <div>
        <h3>{item.name}</h3>
        <p>{item.role}</p>
      </div>
      <span className="review-marquee-index">{item.index ?? 'FIELD NOTE'}</span>
    </div>
    <blockquote>{item.body}</blockquote>
  </article>
}

function ReviewRow({ items, reverse }: { items: ReviewMarqueeItem[]; reverse?: boolean }) {
  if (!items.length) return null
  return <div className={`review-marquee-row ${reverse ? 'is-reverse' : ''}`} role="list">
    <div className="review-marquee-track">
      {items.map((item) => <ReviewCard key={`${item.id}-a`} item={item} />)}
      {items.map((item) => <ReviewCard key={`${item.id}-b`} item={item} duplicate />)}
    </div>
  </div>
}

/** Two quiet, hover-pausable rows for short author notes and exhibition voices. */
export function ReviewMarquee({ items, label = '制图者手记', trailImages = [] }: ReviewMarqueeProps) {
  // Keep each row as a contiguous half, matching the reference Marquee demo
  // (the second half then travels in the opposite direction).
  const splitAt = Math.floor(items.length / 2)
  const first = items.slice(0, splitAt)
  const second = items.slice(splitAt)
  const hostRef = useRef<HTMLElement>(null)
  const lastPointerRef = useRef({ x: -999, y: -999, t: 0 })
  const idRef = useRef(0)
  const timerRefs = useRef<number[]>([])
  const [trail, setTrail] = useState<TrailItem[]>([])
  const cursorImages = useMemo(() => {
    const avatars = items.map((item) => item.avatar).filter((src): src is string => Boolean(src))
    return [...trailImages, ...avatars].filter(Boolean)
  }, [items, trailImages])

  useEffect(() => {
    const host = hostRef.current
    if (!host || cursorImages.length < 1) return
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || isMotionReduced()) return
      const rect = host.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return
      const now = performance.now()
      const previous = lastPointerRef.current
      if (Math.hypot(x - previous.x, y - previous.y) < 28 && now - previous.t < 95) return
      lastPointerRef.current = { x, y, t: now }

      const id = ++idRef.current
      const next: TrailItem = {
        id,
        x,
        y,
        src: cursorImages[(id - 1) % cursorImages.length],
        rotation: ((id % 5) - 2) * 2,
      }
      setTrail((current) => [...current.slice(-4), next])
      const timer = window.setTimeout(() => {
        setTrail((current) => current.filter((item) => item.id !== id))
      }, 900)
      timerRefs.current.push(timer)
    }
    const onLeave = () => setTrail([])
    const onMotionPreference = () => { if (isMotionReduced()) setTrail([]) }
    host.addEventListener('pointermove', onMove, { passive: true })
    host.addEventListener('pointerleave', onLeave)
    window.addEventListener(MOTION_PREFERENCE_EVENT, onMotionPreference)
    return () => {
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerleave', onLeave)
      window.removeEventListener(MOTION_PREFERENCE_EVENT, onMotionPreference)
      timerRefs.current.forEach((timer) => window.clearTimeout(timer))
      timerRefs.current = []
    }
  }, [cursorImages])

  return <section ref={hostRef} className="review-marquee" aria-label={label}>
    <span className="sr-only">{label}</span>
    <div className="review-marquee-trail" aria-hidden="true">
      {trail.map((item) => <img
        key={item.id}
        src={item.src}
        alt=""
        className="review-marquee-trail-image"
        draggable={false}
        style={{
          left: item.x,
          top: item.y,
          '--trail-rotation': `${item.rotation}deg`,
        } as CSSProperties}
      />)}
    </div>
    <ReviewRow items={first.length ? first : items} />
    <ReviewRow items={second.length ? second : items} reverse />
    <div className="review-marquee-vignette review-marquee-vignette-left" aria-hidden="true" />
    <div className="review-marquee-vignette review-marquee-vignette-right" aria-hidden="true" />
  </section>
}

