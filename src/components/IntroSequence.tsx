import { useEffect, useRef, useState } from 'react'
import { brandAssets, heroConfig } from '../config/site'
import { useContent } from '../lib/contentStore'
import { HOME_INDEX } from '../lib/pages'
import { requestScene } from '../lib/sceneBus'

const SEEN_KEY = 'ttf-intro-seen'
const CHAR_MS = 38 // 打字机每个字符间隔
const DWELL_MS = 2400 // 文本展示完成后的停留时长（放慢）

/**
 * 开场序章（自动播放 + 打字机，无滚轮顿挫）：
 * 开始页 → 点击「开始体验」→ 章节自动切换：地图背景交叉淡入淡出，
 * 右侧文案用打字机逐字弹出，展示完成后停留片刻再进入下一章；
 * 最后一章出现「进入首页」→ 淡出后进入首页（#home）。
 * 会话首次播放（sessionStorage），可跳过；保留跟随鼠标的数码地球发光小球。
 */
export default function IntroSequence() {
  const { content } = useContent()
  const intro = content.intro
  const scenes = intro.scenes
  const maps = heroConfig.maps.srcs
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const [phase, setPhase] = useState<'welcome' | 'story'>('welcome')
  const [chapter, setChapter] = useState(0)
  const [typed, setTyped] = useState('')
  const [typing, setTyping] = useState(false)
  const [atEnd, setAtEnd] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [gone, setGone] = useState(false)
  const timersRef = useRef<number[]>([])
  const ballRef = useRef<HTMLDivElement>(null)
  const dotHoverRef = useRef<HTMLDivElement>(null)
  const mouseRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 })

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id))
    timersRef.current = []
  }
  const later = (fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, ms))
  }

  // 自动播放时间线：打字机 → 停留 → 下一章 / 结尾按钮
  useEffect(() => {
    if (phase !== 'story') return
    clearTimers()
    setTyped('')
    setAtEnd(false)
    setTyping(true)

    const text = scenes[chapter].text
    const scheduleNext = () => {
      if (chapter === scenes.length - 1) {
        setAtEnd(true)
      } else {
        setChapter((c) => c + 1)
      }
    }

    if (reduced) {
      setTyped(text)
      setTyping(false)
      later(scheduleNext, 900)
      return
    }

    let i = 0
    const interval = window.setInterval(() => {
      i += 1
      setTyped(text.slice(0, i))
      if (i >= text.length) {
        window.clearInterval(interval)
        setTyping(false)
        later(scheduleNext, DWELL_MS)
      }
    }, CHAR_MS)

    return () => {
      window.clearInterval(interval)
      clearTimers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, chapter])

  useEffect(() => () => clearTimers(), [])

  // 悬停按钮/链接时圆点放大，增强“复古仪器准星”感
  useEffect(() => {
    const onOver = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (target.closest?.('button, a')) dotHoverRef.current?.style.setProperty('transform', 'scale(1.45)')
    }
    const onOut = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (target.closest?.('button, a')) dotHoverRef.current?.style.removeProperty('transform')
    }
    window.addEventListener('mouseover', onOver)
    window.addEventListener('mouseout', onOut)
    return () => {
      window.removeEventListener('mouseover', onOver)
      window.removeEventListener('mouseout', onOut)
    }
  }, [])

  // 数码地球发光小球：跟随鼠标平滑移动（rAF 插值）
  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      mouseRef.current = { x: event.clientX, y: event.clientY }
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    let raf = 0
    let bx = window.innerWidth / 2
    let by = window.innerHeight / 2
    const tick = () => {
      bx += (mouseRef.current.x - bx) * 0.12
      by += (mouseRef.current.y - by) * 0.12
      if (ballRef.current) {
        ballRef.current.style.transform = `translate3d(${bx - 28}px, ${by - 28}px, 0)`
      }
      if (!reduced) raf = requestAnimationFrame(tick)
    }
    if (!reduced) raf = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [reduced])

  if (sessionStorage.getItem(SEEN_KEY) === '1' || gone) return null

  const finish = (target?: number) => {
    sessionStorage.setItem(SEEN_KEY, '1')
    setHidden(true)
    window.setTimeout(() => {
      if (target !== undefined) {
        if (target === HOME_INDEX) window.history.replaceState(null, '', '#home')
        requestScene(target)
      }
    }, 450)
    window.setTimeout(() => setGone(true), 650)
  }

  // 点击任意处：打字中则立即补全文本，否则提前进入下一章
  const advance = () => {
    if (phase !== 'story' || atEnd) return
    if (typing) {
      setTyped(scenes[chapter].text)
      setTyping(false)
    } else if (chapter < scenes.length - 1) {
      clearTimers()
      setChapter((c) => c + 1)
    } else {
      // 最后一章：点击直接出示「进入首页」
      clearTimers()
      setAtEnd(true)
    }
  }

  const current = scenes[Math.min(chapter, scenes.length - 1)]

  return (
    <div
      className={`fixed inset-0 z-[110] overflow-hidden bg-ink-950 transition-opacity duration-500 ${
        hidden ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={advance}
    >
      {/* 数码地球发光小球（跟随鼠标） */}
      <div
        ref={ballRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-30 h-3.5 w-3.5"
        style={{ transform: 'translate3d(-999px, -999px, 0)' }}
      >
        <div ref={dotHoverRef} className="relative h-full w-full transition-transform duration-300 ease-out">
          <div className="intro-dot-glow absolute -inset-[7px] rounded-full bg-brand-500/30 blur-[7px]" />
          <div className="absolute -inset-[3px] rounded-full border border-white/20" />
          <div
            className="intro-dot-ring-spin absolute -inset-[6px] rounded-full opacity-60"
            style={{ background: 'repeating-conic-gradient(rgba(255,255,255,0.22) 0deg 1.5deg, transparent 1.5deg 45deg)' }}
          />
          <div className="intro-dot-core absolute inset-0 rounded-full shadow-[0_0_10px_rgba(199,27,27,0.8),0_0_24px_rgba(199,27,27,0.45)]" />
        </div>
      </div>

      {phase === 'welcome' ? (
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
          <img src={brandAssets.emblemRound} alt="天图府" className="h-28 w-28 opacity-90" />
          <h1 className="mt-8 font-display text-5xl tracking-[0.14em] text-parchment-100 sm:text-6xl sm:tracking-[0.18em] lg:text-8xl">
            {intro.welcomeTitle}
          </h1>
          <p className="mt-5 font-serif-en text-sm italic tracking-[0.45em] text-parchment-400">
            {intro.welcomeSlogan}
          </p>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              setPhase('story')
              setChapter(0)
            }}
            className="mt-14 rounded-full border border-white/40 px-14 py-4 text-sm tracking-[0.3em] text-parchment-100 transition-all duration-300 hover:border-brand-400 hover:text-brand-400"
          >
            {intro.startLabel}
          </button>
        </div>
      ) : (
        <div className="relative z-10 h-full">
          {/* 地图背景：章节间交叉淡入淡出，徐徐而动 */}
          {scenes.map((_, i) => (
            <img
              key={i}
              src={maps[i % maps.length]}
              alt=""
              className={`intro-map-zoom absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
                i === chapter ? 'opacity-45' : 'opacity-0'
              }`}
            />
          ))}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(7,9,13,0.35)_0%,rgba(7,9,13,0.82)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_82%_18%,rgba(199,27,27,0.12)_0%,transparent_45%)]" />

          {/* 跳过 */}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              finish()
            }}
            className="absolute right-8 top-24 z-20 font-mono text-[10px] tracking-[0.3em] text-parchment-500 transition-colors hover:text-brand-400"
          >
            {intro.skipLabel} »
          </button>

          {/* 右侧说明卡：打字机逐字弹出 */}
          <div
            key={chapter}
            className="pointer-events-none absolute right-6 top-1/2 z-20 w-[min(390px,82vw)] -translate-y-1/2 sm:right-[6%] sm:w-[min(390px,36vw)]"
          >
            <div className="intro-line rounded-xl border border-white/10 bg-ink-950/75 p-7 shadow-[0_0_46px_rgba(199,27,27,0.2)] backdrop-blur-xl">
              <p className="font-mono text-[10px] tracking-[0.5em] text-brand-400">
                {String(chapter + 1).padStart(2, '0')} / {String(scenes.length).padStart(2, '0')}
              </p>
              <h2 className="mt-3 font-display text-3xl tracking-[0.14em] text-parchment-100">
                {current.title}
              </h2>
              <p className="mt-4 min-h-[6em] text-sm leading-relaxed text-parchment-300">
                {typed}
                {typing && (
                  <span className="ml-1 inline-block h-4 w-[2px] animate-pulse bg-brand-400 align-middle" />
                )}
              </p>
            </div>

            {/* 最后一章：进入首页 */}
            {atEnd && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  finish(HOME_INDEX)
                }}
                className="intro-line pointer-events-auto mt-5 w-full rounded-md bg-brand-500 px-8 py-3.5 text-sm tracking-[0.25em] text-white shadow-[0_0_36px_rgba(199,27,27,0.45)] transition-all duration-300 hover:bg-brand-600"
                style={{ animationDelay: '0.15s' }}
              >
                {intro.enterHomeLabel}
              </button>
            )}
          </div>

          {/* 底部进度 */}
          <div className="absolute bottom-8 left-8 z-20 flex items-center gap-3">
            <span className="font-mono text-[10px] tracking-[0.3em] text-parchment-400">
              {String(chapter + 1).padStart(2, '0')} / {String(scenes.length).padStart(2, '0')}
            </span>
            <div className="flex items-center gap-2">
              {scenes.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    i === chapter ? 'w-7 bg-brand-500' : 'w-1.5 bg-white/25'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
