import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import type { AtlasCard, Point } from './types'
import { tint } from './dom'
import { canvasPoint, erasedFraction } from './model'
import { CardArt } from './CardArt'
import './styles.css'

export interface ScratchCardProps { item: AtlasCard; onReveal?: () => void; threshold?: number }
const WIDTH = 480
const HEIGHT = 640
const BRUSH_RADIUS = 30

/** 换作品时使用 key={item.id}：React 同时重建揭晓状态和画布。 */
export function ScratchCard({ item, onReveal, threshold = .45 }: ScratchCardProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [revealed, setRevealed] = useState(false)
  const [generation, setGeneration] = useState(0)
  const last = useRef<Point | null>(null)
  const revealedOnce = useRef(false)
  const reveal = () => {
    if (revealedOnce.current) return
    revealedOnce.current = true
    setRevealed(true)
    onReveal?.()
  }

  useEffect(() => {
    const context = canvas.current?.getContext('2d')
    if (!context) return
    context.globalCompositeOperation = 'source-over'
    const gold = context.createLinearGradient(0, 0, WIDTH, HEIGHT)
    gold.addColorStop(0, '#58452b')
    gold.addColorStop(.45, '#dfbd77')
    gold.addColorStop(.6, '#a37c3b')
    gold.addColorStop(1, '#dec18a')
    context.fillStyle = gold
    context.fillRect(0, 0, WIDTH, HEIGHT)
    context.strokeStyle = '#fff3'
    for (let offset = -HEIGHT; offset < WIDTH; offset += 18) {
      context.beginPath()
      context.moveTo(offset, 0)
      context.lineTo(offset + HEIGHT, HEIGHT)
      context.stroke()
    }
    context.fillStyle = '#302919'
    context.font = '22px serif'
    context.textAlign = 'center'
    context.fillText('拂去金箔 · 发现山河', WIDTH / 2, HEIGHT / 2)
    last.current = null
  }, [generation, item.id])

  const draw = (event: PointerEvent<HTMLCanvasElement>) => {
    const node = event.currentTarget
    if (revealed || !node.hasPointerCapture(event.pointerId)) return
    const point = canvasPoint({ x: event.clientX, y: event.clientY }, node.getBoundingClientRect(), WIDTH, HEIGHT)
    const context = node.getContext('2d')
    if (!context || !point) return
    // 擦除的是覆盖层，下面的真实 img 不进入画布，也不会被破坏。
    context.globalCompositeOperation = 'destination-out'
    context.lineWidth = BRUSH_RADIUS * 2
    context.lineCap = 'round'
    context.beginPath()
    context.moveTo(last.current?.x ?? point.x, last.current?.y ?? point.y)
    context.lineTo(point.x, point.y)
    context.stroke()
    // 单击也留下圆点，连接相邻采样点则避免快速移动留下空隙。
    context.beginPath()
    context.arc(point.x, point.y, BRUSH_RADIUS, 0, Math.PI * 2)
    context.fill()
    last.current = point
  }

  const finish = (event: PointerEvent<HTMLCanvasElement>) => {
    last.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    const pixels = event.currentTarget.getContext('2d')?.getImageData(0, 0, WIDTH, HEIGHT).data
    const target = Number.isFinite(threshold) ? Math.max(.1, Math.min(.9, threshold)) : .45
    if (pixels && erasedFraction(pixels) >= target) reveal()
  }

  return <div className="atlas-scratch">
    <div className="atlas-art atlas-scratch-surface" style={tint(item.color)} data-revealed={revealed}>
      <div aria-hidden={!revealed}><CardArt item={item} /></div>
      <canvas
        ref={canvas}
        width={WIDTH}
        height={HEIGHT}
        aria-label="刮开地图，或使用下方直接揭晓按钮"
        onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); draw(event) }}
        onPointerMove={draw}
        onPointerUp={finish}
        onPointerCancel={finish}
      />
    </div>
    <div className="atlas-controls">
      <button type="button" onClick={reveal} disabled={revealed}>直接揭晓</button>
      <button type="button" onClick={() => {
        revealedOnce.current = false
        setRevealed(false)
        setGeneration(previous => previous + 1)
      }}>重新覆盖</button>
    </div>
    <p role="status">{revealed ? `已揭晓：${item.title}` : '拖动手指或鼠标，揭开一幅地图。'}</p>
  </div>
}
