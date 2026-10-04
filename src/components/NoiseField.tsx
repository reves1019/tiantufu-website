import { useEffect, useRef } from 'react'
import { isMotionReduced, MOTION_PREFERENCE_EVENT } from '../lib/motionPreference'

interface Particle {
  x: number
  y: number
  r: number
  vx: number
  vy: number
  a: number
  warm: boolean
}

interface Glow {
  x: number
  y: number
  r: number
  vx: number
  vy: number
}

/**
 * 动态噪点/尘埃背景（视频中 WebGL Noise Background 的轻量 Canvas 版）：
 * 暗红微光颗粒与柔光晕缓慢漂移，增强“勘探/深空”氛围；prefers-reduced-motion 时定格一帧。
 */
export default function NoiseField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let reduced = isMotionReduced()
    let width = 0
    let height = 0
    let dpr = 1

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const particles: Particle[] = Array.from({ length: 90 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.6 + Math.random() * 1.8,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.13,
      a: 0.05 + Math.random() * 0.15,
      warm: Math.random() < 0.55,
    }))

    const glows: Glow[] = Array.from({ length: 4 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.18 + Math.random() * 0.22,
      vx: (Math.random() - 0.5) * 0.00013,
      vy: (Math.random() - 0.5) * 0.00011,
    }))

    let raf = 0
    const draw = (now: number) => {
      ctx.clearRect(0, 0, width, height)

      // 大范围柔光晕（暗红）
      for (const g of glows) {
        g.x += g.vx
        g.y += g.vy
        if (g.x < 0 || g.x > 1) g.vx *= -1
        if (g.y < 0 || g.y > 1) g.vy *= -1
        const gx = g.x * width
        const gy = g.y * height
        const gr = g.r * Math.max(width, height)
        const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr)
        grad.addColorStop(0, 'rgba(199,27,27,0.05)')
        grad.addColorStop(1, 'rgba(199,27,27,0)')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, width, height)
      }

      // 尘埃颗粒（暖红 + 米白，缓慢漂移 + 微闪烁）
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = width
        if (p.x > width) p.x = 0
        if (p.y < 0) p.y = height
        if (p.y > height) p.y = 0
        const twinkle = 0.6 + 0.4 * Math.sin(now * 0.0012 + p.r * 37)
        ctx.fillStyle = p.warm
          ? `rgba(231,71,71,${p.a * twinkle})`
          : `rgba(232,227,216,${p.a * 0.7 * twinkle})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }

      if (!reduced) raf = requestAnimationFrame(draw)
    }

    const onMotionPreference = () => {
      reduced = isMotionReduced()
      cancelAnimationFrame(raf)
      raf = 0
      if (reduced) draw(0)
      else raf = requestAnimationFrame(draw)
    }
    if (reduced) draw(0)
    else raf = requestAnimationFrame(draw)
    window.addEventListener(MOTION_PREFERENCE_EVENT, onMotionPreference)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener(MOTION_PREFERENCE_EVENT, onMotionPreference)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 z-[4] h-full w-full opacity-80" />
}
