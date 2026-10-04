import type { ReactNode } from 'react'
import './review-marquee.css'

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
}

function ReviewCard({ item }: { item: ReviewMarqueeItem }) {
  return <article className="review-marquee-card" aria-label={`${item.name} · ${item.role}`}>
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
  return <div className={`review-marquee-row ${reverse ? 'is-reverse' : ''}`} aria-hidden="true">
    <div className="review-marquee-track">
      {items.map((item) => <ReviewCard key={`${item.id}-a`} item={item} />)}
      {items.map((item) => <ReviewCard key={`${item.id}-b`} item={item} />)}
    </div>
  </div>
}

/** Two quiet, hover-pausable rows for short author notes and exhibition voices. */
export function ReviewMarquee({ items, label = '制图者手记' }: ReviewMarqueeProps) {
  const first = items.filter((_, index) => index % 2 === 0)
  const second = items.filter((_, index) => index % 2 === 1)
  return <section className="review-marquee" aria-label={label}>
    <span className="sr-only">{label}</span>
    <ReviewRow items={first.length ? first : items} />
    <ReviewRow items={second.length ? second : items} reverse />
    <div className="review-marquee-vignette review-marquee-vignette-left" aria-hidden="true" />
    <div className="review-marquee-vignette review-marquee-vignette-right" aria-hidden="true" />
  </section>
}

