import { useEffect, useRef } from 'react'
import { useContent } from '../lib/contentStore'
import { isMotionReduced, MOTION_PREFERENCE_EVENT } from '../lib/motionPreference'

const CHAR_POOL = [...'天图府探索构建绘制记录经纬山海01{}[]<>/=;:*#.']
const DESKTOP_COUNT = 820
const COMPACT_COUNT = 520
const RED: [number, number, number] = [199, 27, 27]
const WHITE: [number, number, number] = [255, 255, 255]
const LOGO_GRID = 48

interface SpherePoint {
  x: number
  y: number
  z: number
  ch: string
}

interface LogoCell {
  x: number
  y: number
  seed: number
}

interface CodeSphereProps {
  /** 0-1：悬停关键词时指南针星核的回应强度（呼吸闪烁增强） */
  intensity?: number
}

function makePoints(count: number): SpherePoint[] {
  const points: SpherePoint[] = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = golden * i
    points.push({
      x: Math.cos(theta) * r,
      y,
      z: Math.sin(theta) * r,
      ch: CHAR_POOL[i % CHAR_POOL.length],
    })
  }
  return points
}

/**
 * 代码地球（交互式）：
 * - 文字球：白→红渐变 + 三维光照明暗，随鼠标轻微转动（视差）
 * - 指南针徽章：点阵/颗粒粒子重构（红核 + 霓虹粉光晕），呼吸闪烁 + 缓慢旋转
 * - intensity：悬停关键词时增强星核呼吸与光晕，作为同步回应
 */
export default function CodeSphere({ intensity = 0 }: CodeSphereProps) {
  const { content } = useContent()
  const emblem = content.media.brand.emblem
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const intensityRef = useRef(intensity)

  useEffect(() => {
    intensityRef.current = intensity
  }, [intensity])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let reduced = isMotionReduced()
    const compact = window.innerWidth < 900 || (window.devicePixelRatio || 1) > 2
    const points = makePoints(compact ? COMPACT_COUNT : DESKTOP_COUNT)
    let logoCells: LogoCell[] = []

    // 将指南针 Logo 采样为点阵
    const logoImg = new Image()
    logoImg.crossOrigin = 'anonymous'
    logoImg.src = emblem
    logoImg.onload = () => {
      const c = document.createElement('canvas')
      c.width = LOGO_GRID
      c.height = LOGO_GRID
      const g = c.getContext('2d')
      if (!g) return
      g.drawImage(logoImg, 0, 0, LOGO_GRID, LOGO_GRID)
      const data = g.getImageData(0, 0, LOGO_GRID, LOGO_GRID).data
      const cells: LogoCell[] = []
      for (let y = 0; y < LOGO_GRID; y++) {
        for (let x = 0; x < LOGO_GRID; x++) {
          if (data[(y * LOGO_GRID + x) * 4 + 3] > 110) {
            cells.push({
              x: (x / (LOGO_GRID - 1)) * 2 - 1,
              y: (y / (LOGO_GRID - 1)) * 2 - 1,
              seed: x * 31 + y * 17,
            })
          }
        }
      }
      logoCells = cells
      if (reduced && visible) drawFrame(performance.now())
    }

    let raf = 0
    let width = 0
    let height = 0
    let dpr = 1
    let targetYaw = 0
    let yaw = 0
    let visible = false

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (reduced && visible) drawFrame(performance.now())
    }
    resize()
    window.addEventListener('resize', resize)

    const onMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const dx = event.clientX - (rect.left + rect.width / 2)
      targetYaw = Math.max(-0.9, Math.min(0.9, dx * 0.0016))
    }
    canvas.addEventListener('mousemove', onMove)

    const drawFrame = (now: number) => {
      yaw += (targetYaw - yaw) * 0.06
      const angleY = (reduced ? 0 : now * 0.00016) + yaw
      const breathe = 1 + Math.sin(now * 0.0008) * 0.02
      const R = Math.min(width, height) * 0.42 * breathe
      const cx = width / 2
      const cy = height / 2
      const tilt = 0.42
      const cosA = Math.cos(angleY)
      const sinA = Math.sin(angleY)
      const cosT = Math.cos(tilt)
      const sinT = Math.sin(tilt)
      const lx = -0.45
      const ly = -0.65
      const lz = 0.55
      const lightLen = Math.sqrt(lx * lx + ly * ly + lz * lz)

      ctx.clearRect(0, 0, width, height)

      for (const p of points) {
        const x1 = p.x * cosA + p.z * sinA
        const z1 = -p.x * sinA + p.z * cosA
        const y2 = p.y * cosT - z1 * sinT
        const z2 = p.y * sinT + z1 * cosT
        const x2 = x1

        const brightness = Math.max(0, (x2 * lx + y2 * ly + z2 * lz) / lightLen)
        const alpha = 0.08 + brightness * 0.72
        const size = (compact ? 5.6 : 6.2) + brightness * 3.2
        const sx = cx + x2 * R
        const sy = cy + y2 * R * 0.92

        let color: string
        if (p.ch === '天' || p.ch === '图' || p.ch === '府') {
          color = `rgba(218,143,104,${0.5 + brightness * 0.5})`
        } else {
          const mix = brightness
          const r = Math.round(WHITE[0] + (RED[0] - WHITE[0]) * (1 - mix))
          const g = Math.round(WHITE[1] + (RED[1] - WHITE[1]) * (1 - mix))
          const b = Math.round(WHITE[2] + (RED[2] - WHITE[2]) * (1 - mix))
          color = `rgba(${r},${g},${b},${alpha})`
        }

        ctx.font = `${size}px Consolas, ui-monospace, monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = color
        ctx.fillText(p.ch, sx, sy)
      }

      // 点阵/颗粒指南针徽章（纸金色颗粒与朱红核心，降低高频绘制量）
      if (logoCells.length > 0) {
        const focus = Math.min(1, Math.max(0, intensityRef.current))
        const logoSize = Math.min(width, height) * 0.44
        const cellSize = (logoSize / LOGO_GRID) * (compact ? 1.35 : 1.25)
        const breatheLogo = 0.45 + (0.25 + 0.75 * focus) * 0.55 * Math.abs(Math.sin(now * 0.0009))
        const rot = reduced ? 0 : now * 0.00009
        const cosR = Math.cos(rot)
        const sinR = Math.sin(rot)
        for (const cell of logoCells) {
          if ((cell.seed * 13) % 3 === 0) continue
          const flicker = Math.sin(now * 0.006 + cell.seed) > -0.5 ? 1 : 0
          const rx = cell.x * cosR - cell.y * sinR
          const ry = cell.x * sinR + cell.y * cosR
          const px = cx + rx * (logoSize / 2)
          const py = cy + ry * (logoSize / 2)
          // 极少量粒子带暖纸色光晕，其余只画单点，避免一格两次绘制。
          if ((cell.seed & 3) === 0) {
            ctx.fillStyle = `rgba(226,196,148,${(0.08 + 0.13 * focus) * breatheLogo * flicker})`
            ctx.beginPath()
            ctx.arc(px, py, cellSize * 0.68, 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.fillStyle = `rgba(199,27,27,${0.24 + 0.62 * breatheLogo * flicker})`
          ctx.beginPath()
          ctx.arc(px, py, cellSize * 0.3, 0, Math.PI * 2)
          ctx.fill()
        }
      }

    }

    const tick = (now: number) => {
      raf = 0
      if (!visible || document.visibilityState === 'hidden') return
      drawFrame(now)
      if (!reduced) raf = requestAnimationFrame(tick)
    }
    const start = () => {
      if (!visible || document.visibilityState === 'hidden') return
      if (reduced) drawFrame(performance.now())
      else if (!raf) raf = requestAnimationFrame(tick)
    }
    const stop = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }
    const onVisibility = () => (document.visibilityState === 'hidden' ? stop() : start())
    const onMotionPreference = () => {
      reduced = isMotionReduced()
      stop()
      if (visible) {
        drawFrame(performance.now())
        if (!reduced) start()
      }
    }
    const observer = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([entry]) => {
          visible = Boolean(entry?.isIntersecting)
          if (visible) start()
          else stop()
        }, { rootMargin: '80px' })
      : null
    if (observer) observer.observe(canvas)
    else {
      visible = true
      start()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener(MOTION_PREFERENCE_EVENT, onMotionPreference)

    return () => {
      stop()
      observer?.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener(MOTION_PREFERENCE_EVENT, onMotionPreference)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousemove', onMove)
      logoImg.onload = null
    }
  }, [emblem])

  return <canvas ref={canvasRef} className="h-full w-full" />
}
