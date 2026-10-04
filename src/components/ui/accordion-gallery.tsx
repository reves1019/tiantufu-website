import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
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

type ImageStatus = 'loading' | 'loaded' | 'error'
interface ImageState { src: string; status: ImageStatus; retry: number }

function imageStateFor(states: Record<string, ImageState>, item: AccordionGalleryItem): ImageState {
  const current = states[item.id]
  return current?.src === item.image ? current : { src: item.image, status: 'loading', retry: 0 }
}

/** Map portfolio rail: hover/focus expands a work, click opens the reader. */
export function AccordionGallery({ items, onOpen, label = '作品集浏览' }: AccordionGalleryProps) {
  const [active, setActive] = useState(0)
  const [imageStates, setImageStates] = useState<Record<string, ImageState>>({})
  const buttons = useRef<Array<HTMLButtonElement | null>>([])
  useEffect(() => {
    setActive((current) => Math.min(current, Math.max(0, items.length - 1)))
  }, [items.length])
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

  const updateImageState = (item: AccordionGalleryItem, status: ImageStatus) => {
    setImageStates((states) => {
      const current = imageStateFor(states, item)
      return { ...states, [item.id]: { ...current, status } }
    })
  }

  const retryImage = (item: AccordionGalleryItem) => {
    setImageStates((states) => {
      const current = imageStateFor(states, item)
      return { ...states, [item.id]: { ...current, status: 'loading', retry: current.retry + 1 } }
    })
  }

  return <ul className="accordion-gallery" aria-label={label}>
    {items.map((item, index) => {
      const imageState = imageStateFor(imageStates, item)
      const activeItem = active === index
      const imageLabel = imageState.status === 'error' ? '，图片加载失败，点击重试' : ''
      return <li
        key={item.id}
        className={`accordion-gallery-item ${activeItem ? 'is-active' : ''}`}
      >
        <button
          ref={(node) => { buttons.current[index] = node }}
          type="button"
          className={`accordion-gallery-card ${activeItem ? 'is-active' : ''} is-image-${imageState.status}`}
          tabIndex={activeItem ? 0 : -1}
          aria-current={activeItem ? 'true' : undefined}
          aria-expanded={activeItem}
          aria-label={`展开作品：${item.title}${imageLabel}`}
          aria-busy={imageState.status === 'loading' ? 'true' : undefined}
          onPointerEnter={() => setActive(index)}
          onPointerDown={() => setActive(index)}
          onFocus={() => setActive(index)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          onClick={() => {
            setActive(index)
            if (imageState.status === 'error') retryImage(item)
            else onOpen?.(index)
          }}
        >
          <img
            key={`${item.id}-${imageState.retry}`}
            src={item.image}
            alt={item.title}
            loading={index === 0 ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() => updateImageState(item, 'loaded')}
            onError={() => updateImageState(item, 'error')}
          />
          {imageState.status === 'loading' && <span className="accordion-gallery-status" role="status">图像加载中…</span>}
          {imageState.status === 'error' && <span className="accordion-gallery-status accordion-gallery-status-error" role="status">图像加载失败 · 点击重试</span>}
          <span className="accordion-gallery-caption"><strong>{item.title}</strong>{item.meta && <small>{item.meta}</small>}</span>
          <span className="accordion-gallery-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
        </button>
      </li>
    })}
  </ul>
}
