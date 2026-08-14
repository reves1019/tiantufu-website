import { useEffect, useRef, useState } from 'react'

interface TrailItem {
  id: number
  x: number
  y: number
  src: string
  seed: number
}

interface ImageTrailProps {
  images: string[]
  /** 单张尾迹图片尺寸（px） */
  size?: number
  /** 最多同时存在的尾迹数量 */
  max?: number
}

/**
 * 图片鼠标轨迹（视频中的 Image Trail / federicopian.com 交互）：
 * 鼠标在区域内移动时，作品图片以小尾迹跟随光标，随后放大淡出。
 * 仅使用 transform/opacity 动画，60fps；prefers-reduced-motion 时自动停用。
 */
export default function ImageTrail({ images, size = 76, max = 12 }: ImageTrailProps) {
  const [items, setItems] = useState<TrailItem[]>([])
  const hostRef = useRef<HTMLDivElement>(null)
  const lastRef = useRef({ x: -999, y: -999, t: 0 })
  const idRef = useRef(0)

  useEffect(() => {
    if (images.length === 0) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const onMove = (event: MouseEvent) => {
      const host = hostRef.current
      if (!host) return
      // 仅当所在页面处于可见状态时才生成尾迹
      if (getComputedStyle(host).opacity === '0') return
      const rect = host.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return
      const now = performance.now()
      // 节流：移动距离或时间不足时不生成，避免过密
      if (Math.hypot(x - lastRef.current.x, y - lastRef.current.y) < 28 && now - lastRef.current.t < 90) return
      lastRef.current = { x, y, t: now }

      const id = ++idRef.current
      const item: TrailItem = {
        id,
        x,
        y,
        src: images[(id - 1) % images.length],
        seed: id,
      }
      setItems((prev) => [...prev.slice(-(max - 1)), item])
      window.setTimeout(() => {
        setItems((prev) => prev.filter((it) => it.id !== id))
      }, 1000)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [images, max])

  return (
    <div ref={hostRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {items.map((item) => (
        <div
          key={item.id}
          className="absolute"
          style={{
            left: item.x,
            top: item.y,
            transform: `translate(-50%, -50%) rotate(${(item.seed % 5) - 2}deg)`,
          }}
        >
          <img
            src={item.src}
            alt=""
            className="trail-img rounded-md border border-white/20 object-cover shadow-[0_10px_28px_rgba(0,0,0,0.55)]"
            style={{ width: size, height: size }}
            draggable={false}
          />
        </div>
      ))}
    </div>
  )
}
