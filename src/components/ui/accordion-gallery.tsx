import { useRef, useState, type KeyboardEvent } from 'react'
import './accordion-gallery.css'
import { isMotionReduced } from '../../lib/motionPreference'

export interface AccordionGalleryItem {
  id: string
  title: string
  image: string
  meta?: string
}

interface AccordionGalleryProps {
  items: AccordionGalleryItem[]
  onOpen?: (index: number) => void
  label?: string
}

/** Map portfolio rail: hover/focus expands a work, click opens the reader. */
export function AccordionGallery({ items, onOpen, label = '作品集浏览' }: AccordionGalleryProps) {
  const [active, setActive] = useState(0)
  const buttons = useRef<Array<HTMLButtonElement | null>>([])
  if (!items.length) return null

  const reveal = (index: number, focus = false) => {
    const button = buttons.current[index]
    if (!button) return
    setActive(index)
    if (focus) {
      button.focus({ preventScroll: true })
      const reduced = isMotionReduced()
      button.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest', inline: 'center' })
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
    let next = index + direction
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = items.length - 1
    if (direction || event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      reveal(Math.max(0, Math.min(items.length - 1, next)), true)
    }
  }

  return <ul className="accordion-gallery" aria-label={label}>
    {items.map((item, index) => <li
      key={item.id}
      className={`accordion-gallery-item ${active === index ? 'is-active' : ''}`}
    >
      <button
        ref={(node) => { buttons.current[index] = node }}
        type="button"
        className={`accordion-gallery-card ${active === index ? 'is-active' : ''}`}
        tabIndex={active === index ? 0 : -1}
        aria-current={active === index ? 'true' : undefined}
        aria-label={`展开作品：${item.title}`}
        onMouseEnter={() => setActive(index)}
        onFocus={() => setActive(index)}
        onKeyDown={(event) => handleKeyDown(event, index)}
        onClick={() => { setActive(index); onOpen?.(index) }}
      >
        <img src={item.image} alt={item.title} loading="lazy" decoding="async" />
        <span className="accordion-gallery-caption"><strong>{item.title}</strong>{item.meta && <small>{item.meta}</small>}</span>
        <span className="accordion-gallery-index">{String(index + 1).padStart(2, '0')}</span>
      </button>
    </li>)}
  </ul>
}

