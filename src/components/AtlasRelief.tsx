import { useId, useRef } from 'react'

interface AtlasReliefProps {
  map: string
  emblem: string
  words: string[]
}

/** 古图铜盘与悬垂文字地形。静态 SVG 排版，动效只施加于整体包装层。 */
export default function AtlasRelief({ map, emblem, words }: AtlasReliefProps) {
  const uid = useId().replace(/:/g, '')
  const stageRef = useRef<HTMLDivElement>(null)
  const glyphs = [...(words.join('') || '经纬山川疆域探索绘制记录')]

  return (
    <div className="atlas-relief" aria-hidden="true"
      onPointerMove={(event) => {
        if (event.pointerType !== 'mouse' || !window.matchMedia('(min-width: 768px) and (prefers-reduced-motion: no-preference)').matches) return
        const rect = event.currentTarget.getBoundingClientRect()
        const x = (event.clientX - rect.left) / rect.width - 0.5
        const y = (event.clientY - rect.top) / rect.height - 0.5
        stageRef.current?.style.setProperty('transform', `rotateX(${-y * 4}deg) rotateY(${x * 6}deg)`)
      }}
      onPointerLeave={() => stageRef.current?.style.removeProperty('transform')}>
      <div ref={stageRef} className="atlas-relief-stage">
        <div className="atlas-relief-float">
          <svg viewBox="0 0 760 760" fill="none" className="h-full w-full">
            <defs>
              <clipPath id={`${uid}-map`}><ellipse cx="380" cy="228" rx="252" ry="112" /></clipPath>
              <linearGradient id={`${uid}-brass`} x1="115" y1="250" x2="640" y2="270" gradientUnits="userSpaceOnUse">
                <stop stopColor="#382619" /><stop offset=".23" stopColor="#b88d51" /><stop offset=".52" stopColor="#dec79b" /><stop offset=".72" stopColor="#9a7045" /><stop offset="1" stopColor="#3a281a" />
              </linearGradient>
              <linearGradient id={`${uid}-fade`} x1="380" y1="300" x2="380" y2="640" gradientUnits="userSpaceOnUse">
                <stop stopColor="#584534" /><stop offset="1" stopColor="#927e63" stopOpacity=".24" />
              </linearGradient>
              <filter id={`${uid}-shadow`} x="-50%" y="-80%" width="200%" height="260%"><feGaussianBlur stdDeviation="17" /></filter>
              <radialGradient id={`${uid}-shade`}><stop stopColor="#eadac0" stopOpacity="0" /><stop offset="1" stopColor="#50391e" stopOpacity=".32" /></radialGradient>
            </defs>
            <ellipse cx="420" cy="652" rx="210" ry="32" fill="#765739" opacity=".17" filter={`url(#${uid}-shadow)`} />
            <ellipse cx="380" cy="245" rx="260" ry="118" fill={`url(#${uid}-brass)`} />
            <ellipse cx="380" cy="230" rx="260" ry="118" fill="#d2b88e" stroke="#775534" strokeWidth="1.5" />
            <g clipPath={`url(#${uid}-map)`}>
              <image key={map} href={map} x="117" y="100" width="526" height="262" preserveAspectRatio="xMidYMid slice" opacity=".91" />
              <ellipse cx="380" cy="228" rx="252" ry="112" fill={`url(#${uid}-shade)`} />
              {[0, 1, 2, 3, 4].map((i) => <ellipse key={i} cx="380" cy="228" rx={42 + i * 49} ry="112" stroke="#493a26" strokeOpacity=".18" strokeWidth=".8" />)}
              {[160, 193, 228, 263, 296].map((y) => <path key={y} d={`M126 ${y} Q380 ${y + 34} 634 ${y}`} stroke="#493a26" strokeOpacity=".16" strokeWidth=".8" />)}
            </g>
            <ellipse cx="380" cy="228" rx="252" ry="112" stroke="#f4e5c8" strokeWidth="2" />
            <ellipse cx="380" cy="228" rx="256" ry="115" stroke="#8a6542" strokeWidth=".9" />
            <g stroke="#624831" strokeWidth=".7" opacity=".5">
              {Array.from({ length: 56 }, (_, i) => {
                const angle = i * Math.PI * 2 / 56
                return <path key={i} d={`M${380 + Math.cos(angle) * 253} ${228 + Math.sin(angle) * 113}L${380 + Math.cos(angle) * 260} ${228 + Math.sin(angle) * 118}`} />
              })}
            </g>
            <image href={emblem} x="335" y="167" width="90" height="110" opacity=".7" />
            <g fill={`url(#${uid}-fade)`} fontFamily="'Noto Serif SC', serif" fontSize="8.5">
              {Array.from({ length: 57 }, (_, column) => {
                const x = 143 + column * 8.4
                const baseY = 250 + Math.sqrt(Math.max(0, 1 - ((x - 380) / 254) ** 2)) * 99
                const count = 15 + Math.round(7 * Math.sin(column * .43) + 6 * Math.cos(column * .18))
                return <text key={column} opacity={.3 + (column % 7) * .085}>
                  {Array.from({ length: count }, (_, row) => <tspan key={row} x={x + Math.sin(row * .2 + column * .11) * row * .6} y={baseY + 19 + row * 10.5}>{glyphs[(column * 5 + row * 3) % glyphs.length]}</tspan>)}
                </text>
              })}
            </g>
            <path d="M380 56v40M371 66h18" stroke="#8b7354" strokeWidth=".8" opacity=".5" />
            <circle cx="380" cy="53" r="2.5" fill="#a53428" />
          </svg>
        </div>
      </div>
    </div>
  )
}
