import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { isMotionReduced, MOTION_PREFERENCE_EVENT } from '../lib/motionPreference'

interface PortfolioCollageProps {
  images: string[]
  paused?: boolean
}

const COLLAGE_STYLES = `
.portfolio-gallery {
  background: #080807;
  isolation: isolate;
  scrollbar-color: #8c4b3f #171410;
}
.portfolio-collage {
  position: sticky;
  top: 0;
  z-index: 0;
  height: 100dvh;
  margin-bottom: -100dvh;
  overflow: hidden;
  pointer-events: none;
  background: #080807;
  contain: paint;
}
.portfolio-collage-wall {
  display: flex;
  height: 100%;
  flex-direction: column;
  justify-content: center;
  gap: 42px;
  transform: rotate(-7deg) scale(1.15);
  transform-origin: center;
}
.portfolio-collage-rail {
  display: flex;
  width: max-content;
  flex: none;
  align-items: center;
  animation: portfolio-collage-drift var(--collage-duration) linear infinite;
  animation-delay: var(--collage-delay);
  animation-play-state: paused;
}
.portfolio-collage-rail[data-reverse="true"] { animation-direction: reverse; }
.portfolio-collage[data-running="true"] .portfolio-collage-rail {
  animation-play-state: running;
  will-change: transform;
}
.portfolio-collage-group {
  display: flex;
  min-width: 100vw;
  flex: none;
  align-items: center;
  justify-content: space-around;
  gap: 32px;
  padding-right: 32px;
}
.portfolio-collage-print {
  flex: none;
  width: var(--print-width);
  height: var(--print-height);
  padding: 7px;
  background: #a99b80;
  box-shadow: 0 12px 22px #0008;
  transform: rotate(var(--print-angle));
}
.portfolio-collage-print img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(.5) sepia(.18);
  background: #15120e;
}
.portfolio-collage-scrim {
  position: absolute;
  inset: 0;
  background: #080807cc;
}
.portfolio-collage-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #080807b8 0%, transparent 34%, #08080778 68%, #080807d4 100%);
}
.portfolio-gallery .portfolio-archive {
  padding-top: 48px;
  border-top: 1px solid #e8e3d82b;
}
.portfolio-gallery .portfolio-filters button { min-height: 44px; }
.portfolio-gallery .portfolio-archive button { min-height: 40px; }
.portfolio-gallery .portfolio-archive [class*="cursor-zoom-in"] { opacity: 1; }
@keyframes portfolio-collage-drift {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(-50%, 0, 0); }
}
@media (max-width: 767px) {
  .portfolio-collage-wall { gap: 70px; transform: rotate(-9deg) scale(1.15); }
  .portfolio-collage-group { gap: 26px; padding-right: 26px; }
  .portfolio-collage-print { padding: 5px; }
  .portfolio-collage-scrim { background: #080807d1; }
}
@media (prefers-reduced-motion: reduce) {
  .portfolio-collage-rail { animation: none !important; transform: translate3d(-8%, 0, 0); will-change: auto !important; }
}
`

/** Slow-moving contact sheets made only from the site's own member artwork. */
export default function PortfolioCollage({ images, paused = false }: PortfolioCollageProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  const uniqueImages = useMemo(
    () => Array.from(new Set(images.filter((image) => image.trim().length > 0))).slice(0, compact ? 4 : 18),
    [images, compact],
  )
  const rails = useMemo(() => {
    if (!uniqueImages.length) return []
    const railCount = compact ? 2 : 3
    const printCount = compact ? 2 : 5
    return Array.from({ length: railCount }, (_, row) =>
      Array.from({ length: printCount }, (_, column) => uniqueImages[(row * printCount + column) % uniqueImages.length]),
    )
  }, [compact, uniqueImages])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const compactViewport = window.matchMedia('(max-width: 767px)')
    let inView = false
    let pageActive = !document.documentElement.dataset.page || document.documentElement.dataset.page === 'works'

    const syncPlayback = () => {
      host.dataset.running = String(inView && pageActive && document.visibilityState === 'visible' && !isMotionReduced() && !paused)
    }
    const onScene = (event: Event) => {
      pageActive = (event as CustomEvent<{ id?: string }>).detail?.id === 'works'
      syncPlayback()
    }
    const onCompactViewport = () => setCompact(compactViewport.matches)
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
      syncPlayback()
    })
    observer.observe(host)
    document.addEventListener('visibilitychange', syncPlayback)
    window.addEventListener('ttf-scene', onScene)
    reducedMotion.addEventListener('change', syncPlayback)
    window.addEventListener(MOTION_PREFERENCE_EVENT, syncPlayback)
    compactViewport.addEventListener('change', onCompactViewport)
    syncPlayback()

    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', syncPlayback)
      window.removeEventListener('ttf-scene', onScene)
      reducedMotion.removeEventListener('change', syncPlayback)
      window.removeEventListener(MOTION_PREFERENCE_EVENT, syncPlayback)
      compactViewport.removeEventListener('change', onCompactViewport)
    }
  }, [paused])

  return (
    <div ref={hostRef} aria-hidden="true" className="portfolio-collage" data-running="false" data-collage-images={rails.length * (compact ? 4 : 10)}>
      <style>{COLLAGE_STYLES}</style>
      <div className="portfolio-collage-wall">
        {rails.map((prints, row) => {
          const duration = [84, 108, 128][row]
          return (
            <div
              key={row}
              className="portfolio-collage-rail"
              data-reverse={row % 2 !== 0}
              style={{ '--collage-duration': `${duration}s`, '--collage-delay': `${-duration * (.13 + row * .17)}s` } as CSSProperties}
            >
              {[0, 1].map((copy) => (
                <div key={copy} className="portfolio-collage-group">
                  {prints.map((src, column) => (
                    <div
                      key={`${column}-${src}`}
                      className="portfolio-collage-print"
                      style={{
                        '--print-width': `${compact ? 230 + column * 35 : [280, 350, 390, 300, 360][column]}px`,
                        '--print-height': `${compact ? 180 + column * 22 : [208, 246, 228, 216, 254][column]}px`,
                        '--print-angle': `${[-3, 2, -1, 3, -2][(column + row) % 5]}deg`,
                      } as CSSProperties}
                    >
                      <img src={src} alt="" loading="lazy" decoding="async" draggable={false} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )
        })}
      </div>
      <div className="portfolio-collage-scrim" />
      <div className="portfolio-collage-shade" />
    </div>
  )
}
