import { useEffect, useState } from 'react'
import { heroConfig } from '../config/site'

export default function MapSlideshow() {
  const [index, setIndex] = useState(0)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setShown(true), 80)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!heroConfig.maps.enabled || heroConfig.maps.srcs.length === 0) return
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % heroConfig.maps.srcs.length)
    }, heroConfig.maps.intervalMs)
    return () => window.clearInterval(timer)
  }, [])

  if (!heroConfig.maps.enabled || heroConfig.maps.srcs.length === 0) return null

  const panDuration = heroConfig.maps.intervalMs + heroConfig.maps.fadeMs

  return (
    <div
      aria-hidden="true"
      className={`map-slideshow absolute inset-0 z-[1] overflow-hidden transition-opacity duration-[1500ms] ${
        shown ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="h-full w-full [perspective:1400px]">
        {heroConfig.maps.srcs.map((src, i) => {
          const current = i === index
          return (
            <img
              key={src}
              src={src}
              alt=""
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[2000ms] ${
                current ? 'opacity-100' : 'opacity-0'
              } ${i % 2 === 0 ? 'map-pan-left' : 'map-pan-right'}`}
              style={{
                animationDuration: `${panDuration}ms`,
                transitionDuration: `${heroConfig.maps.fadeMs}ms`,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
