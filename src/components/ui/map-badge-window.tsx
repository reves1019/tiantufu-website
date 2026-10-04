import { useState } from 'react'
import type { CSSProperties } from 'react'
import './map-badge-window.css'

export interface MapBadgeWindowProps {
  mapSrc: string
  badgeSrc: string
  label?: string
  meta?: string
  footerLabel?: string
  footerHint?: string
  coordinate?: string
  pauseLabel?: string
  resumeLabel?: string
}

/**
 * A quiet transition plate: the map drifts behind the alpha silhouette of the
 * Tiantufu badge. The mask and the image layer stay independent, so the
 * silhouette remains crisp while the map moves on its own compositor layer.
 */
export function MapBadgeWindow({
  mapSrc,
  badgeSrc,
  label = '穿过徽章，阅读一段旧世界',
  meta = 'ARCHIVE WINDOW · TIANTUFU',
  footerLabel = '地图不是背景，是入口。',
  footerHint = 'SCROLL / KEEP READING',
  coordinate = 'E 104° · N 35°',
  pauseLabel = '暂停地图漂移',
  resumeLabel = '继续地图漂移',
}: MapBadgeWindowProps) {
  const [paused, setPaused] = useState(false)
  const mapStyle = { backgroundImage: `url("${mapSrc}")` } as CSSProperties
  const maskStyle = {
    maskImage: `url("${badgeSrc}")`,
    WebkitMaskImage: `url("${badgeSrc}")`,
  } as CSSProperties

  return (
    <section className="badge-map-transition" aria-label={label}>
      <div className="badge-map-transition__heading">
        <span className="badge-map-transition__eyebrow">{meta}</span>
        <span className="badge-map-transition__line" aria-hidden="true" />
        <span className="badge-map-transition__caption">{label}</span>
      </div>
      <figure className={`badge-map-window${paused ? ' is-paused' : ''}`}>
        <div className="badge-map-window__stage">
          <div className="badge-map-window__paper" style={mapStyle} aria-hidden="true" />
          <div className="badge-map-window__wash" aria-hidden="true" />
          <div className="badge-map-window__cutout" style={maskStyle} aria-hidden="true">
            <div className="badge-map-window__cutout-map" style={mapStyle} />
          </div>
          <img className="badge-map-window__seal" src={badgeSrc} alt="" aria-hidden="true" />
          <span className="badge-map-window__coordinate" aria-hidden="true">{coordinate}</span>
          <button
            type="button"
            className="badge-map-window__pause"
            aria-pressed={paused}
            onClick={() => setPaused((value) => !value)}
          >
            <span aria-hidden="true">{paused ? 'Ⅱ' : '▷'}</span>
            {paused ? resumeLabel : pauseLabel}
          </button>
        </div>
        <figcaption className="badge-map-window__footer">
          <span>{footerLabel}</span>
          <span>{footerHint}</span>
        </figcaption>
      </figure>
    </section>
  )
}

