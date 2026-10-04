import { useEffect, useState } from 'react'
import { heroConfig } from '../config/site'
import { useContent } from '../lib/contentStore'

export default function MapSlideshow() {
  const { content } = useContent()
  const maps = content.media.maps
  const [index, setIndex] = useState(0)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (!heroConfig.maps.enabled || maps.length === 0) return
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % maps.length)
    }, heroConfig.maps.intervalMs)
    return () => window.clearInterval(timer)
  }, [maps.length])

  if (!heroConfig.maps.enabled || maps.length === 0) return null

  const panDuration = heroConfig.maps.intervalMs + heroConfig.maps.fadeMs

  return (
    <div
      aria-hidden="true"
      className={`map-slideshow absolute inset-0 z-[1] overflow-hidden transition-opacity duration-[1500ms] ${
        shown ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="h-full w-full [perspective:1400px]">
        {maps.map((src, i) => {
          const current = i === index
          const next = i === (index + 1) % maps.length
          return (
            <img
              key={src}
              src={src}
              alt=""
              loading={current || next ? 'eager' : 'lazy'}
              decoding="async"
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[2000ms] ${
                current ? 'opacity-100' : 'opacity-0'
              } ${current ? (i % 2 === 0 ? 'map-pan-left' : 'map-pan-right') : ''}`}
              style={{
                animationDuration: `${panDuration}ms`,
                transitionDuration: `${heroConfig.maps.fadeMs}ms`,
                filter: 'sepia(0.24) saturate(0.72) brightness(0.68) contrast(0.9)',
              }}
              onLoad={() => {
                if (i === 0) setShown(true)
              }}
              onError={() => {
                if (i === 0) setShown(true)
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
