import { useEffect, useRef, useState } from 'react'
import { useContent } from '../lib/contentStore'
import { HOME_INDEX } from '../lib/pages'
import { requestScene } from '../lib/sceneBus'
import { isMotionReduced, MOTION_PREFERENCE_EVENT } from '../lib/motionPreference'
import { FlowButton } from './ui/flow-button'
import { SplitTextReveal } from '../recipes/deepsee-inspired/split-text-reveal/src'

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
  const scenes = intro.scenes.length ? intro.scenes : [{ title: content.site.name, titleEn: content.site.nameEn, text: content.site.slogan, textEn: content.site.slogan }]
  const maps = content.media.maps
  const [reduced, setReduced] = useState(isMotionReduced)

  const [phase, setPhase] = useState<'welcome' | 'story'>('welcome')
  const [chapter, setChapter] = useState(0)
  const [typed, setTyped] = useState('')
  const [typing, setTyping] = useState(false)
  const [atEnd, setAtEnd] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [gone, setGone] = useState(() => {
    try { return sessionStorage.getItem(SEEN_KEY) === '1' } catch { return false }
  })
  const timersRef = useRef<number[]>([])
  const typingTimerRef = useRef<number | null>(null)
  const ballRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const dotHoverRef = useRef<HTMLDivElement>(null)
  const mouseRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 })

  useEffect(() => {
    const onMotionPreference = (event: Event) => setReduced(Boolean((event as CustomEvent<{ reduced?: boolean }>).detail?.reduced))
    window.addEventListener(MOTION_PREFERENCE_EVENT, onMotionPreference)
    return () => window.removeEventListener(MOTION_PREFERENCE_EVENT, onMotionPreference)
  }, [])

  // Optional replay: visiting the site never forces a long introduction.
  useEffect(() => {
    if (!gone) {
      try { sessionStorage.setItem(SEEN_KEY, '1') } catch { /* storage can be unavailable in private contexts */ }
    }
  }, [gone])

  useEffect(() => {
    const open = () => { setPhase('welcome'); setChapter(0); setHidden(false); setGone(false) }
    window.addEventListener('ttf-intro-open', open)
    return () => window.removeEventListener('ttf-intro-open', open)
  }, [])

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id))
    timersRef.current = []
    if (typingTimerRef.current !== null) window.clearInterval(typingTimerRef.current)
    typingTimerRef.current = null
  }
  const later = (fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, ms))
  }

  // 自动播放时间线：打字机 → 停留 → 下一章 / 结尾按钮
  useEffect(() => {
    if (phase !== 'story' || gone) return
    clearTimers()
    setTyped('')
    setAtEnd(false)
    setTyping(true)

    const text = scenes[Math.min(chapter, scenes.length - 1)].text
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
    typingTimerRef.current = interval

    return () => {
      window.clearInterval(interval)
      clearTimers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, chapter, gone, reduced])

  useEffect(() => () => clearTimers(), [])

  useEffect(() => {
    if (gone) return
    const previous = document.activeElement as HTMLElement | null
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { clearTimers(); setGone(true); return }
      if (event.key !== 'Tab') return
      const buttons = [...(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
      const first = buttons[0], last = buttons[buttons.length - 1]
      if (!first) return
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); previous?.focus() }
  }, [gone])

  // 悬停按钮/链接时圆点放大，增强“复古仪器准星”感
  useEffect(() => {
    if (gone) return
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
  }, [gone])

  // 数码地球发光小球：跟随鼠标平滑移动（rAF 插值）
  useEffect(() => {
    if (gone) return
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
        ballRef.current.style.transform = `translate3d(${bx - 7}px, ${by - 7}px, 0)`
      }
      if (!reduced) raf = requestAnimationFrame(tick)
    }
    if (!reduced) raf = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [reduced, gone])

  if (gone) return null

  const finish = (target?: number) => {
    clearTimers()
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
      if (typingTimerRef.current !== null) window.clearInterval(typingTimerRef.current)
      typingTimerRef.current = null
      setTyped(scenes[Math.min(chapter, scenes.length - 1)].text)
      setTyping(false)
      later(() => chapter < scenes.length - 1 ? setChapter((c) => c + 1) : setAtEnd(true), DWELL_MS)
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
      ref={dialogRef} role="dialog" aria-modal="true" aria-label={intro.welcomeTitle}
      className={`atlas-paper atlas-intro fixed inset-0 z-[110] overflow-hidden bg-ink-950 transition-opacity duration-500 ${
        hidden ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={advance}
    >
      {phase === 'welcome' && <button type="button" className="absolute right-6 top-6 z-40 px-4 py-3 text-sm text-parchment-200" onClick={(event) => { event.stopPropagation(); finish() }}>{intro.skipLabel} ×</button>}
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
          <div className="intro-welcome-card relative flex w-[min(720px,94vw)] flex-col items-center px-7 py-10 sm:px-14 sm:py-14">
            <div className="intro-welcome-kicker">TIANTUFU · FIELD ARCHIVE <span>序章 / PROLOGUE</span></div>
            <div className="intro-emblem-shell" aria-hidden="true">
              <span className="intro-emblem-orbit" />
              <img src={content.media.brand.emblem} alt="" className="intro-emblem-image relative z-10 h-36 w-36 object-contain sm:h-48 sm:w-48" />
            </div>
            <h1 className="mt-7 font-display text-5xl tracking-[0.14em] text-parchment-100 sm:text-6xl sm:tracking-[0.18em] lg:text-8xl">
              <SplitTextReveal as="span">{intro.welcomeTitle}</SplitTextReveal>
            </h1>
            <p className="mt-3 font-serif-en text-[10px] tracking-[0.32em] text-brand-300 sm:text-xs">{intro.welcomeTitleEn}</p>
            <p className="mt-6 max-w-xl font-reading text-sm leading-8 text-parchment-200 sm:text-base">{intro.welcomeSlogan}</p>
            <p className="mt-1 font-serif-en text-[10px] tracking-[0.2em] text-parchment-500 sm:text-xs">{intro.welcomeSloganEn}</p>
          <FlowButton
            variant="outline"
            text={intro.startLabelEn}
            onClick={(event) => {
              event.stopPropagation()
              setPhase('story')
              setChapter(0)
            }}
            className="mt-10 px-14 py-4 text-sm tracking-[0.3em]"
          />
            <span className="mt-3 font-mono text-[9px] tracking-[0.24em] text-parchment-500">{intro.startLabelEn}</span>
          </div>
        </div>
      ) : (
        <div className="relative z-10 h-full">
          {/* 地图背景：章节间交叉淡入淡出，徐徐而动 */}
          {scenes.map((_, i) => (
            <img
              key={i}
              src={maps[i % (maps.length || 1)]}
              alt=""
              className={`intro-map-zoom absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
                i === chapter ? 'opacity-45' : 'opacity-0'
              }`}
            />
          ))}
          <div className="atlas-intro-shade absolute inset-0" />

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

          {/* 底部叙事台：地图保持连续展开，文本在画面下方逐字出现 */}
          <div
            key={chapter}
            className="intro-copy-shell intro-story-dock pointer-events-none absolute inset-x-0 bottom-16 z-20 mx-auto w-[min(880px,90vw)] px-5 sm:bottom-20"
          >
            <div className="intro-line intro-story-panel">
              <div className="intro-story-rule" aria-hidden="true" />
              <div className="intro-story-meta">
                <span>{String(chapter + 1).padStart(2, '0')} / {String(scenes.length).padStart(2, '0')}</span>
                <span>TIANTUFU FIELD NOTE</span>
              </div>
              <h2 className="mt-3 font-display text-3xl tracking-[0.14em] text-parchment-100 sm:text-4xl">
                <SplitTextReveal as="span" key={`${chapter}-title`}>{current.title}</SplitTextReveal>
              </h2>
              <p className="mt-2 font-serif-en text-[10px] tracking-[0.24em] text-brand-300 sm:text-xs">{current.titleEn ?? 'TIANTUFU ARCHIVE'}</p>
              <p className="mt-4 min-h-[4.5em] max-w-3xl text-sm leading-8 text-parchment-200 sm:text-base">
                {typed}
                {typing && (
                  <span className="ml-1 inline-block h-4 w-[2px] animate-pulse bg-brand-400 align-middle" />
                )}
              </p>
              <p className="mt-2 max-w-2xl font-serif-en text-[11px] leading-6 text-parchment-400">{current.textEn ?? ''}</p>
            </div>

            {/* 最后一章：进入首页 */}
            {atEnd && (
              <>
                <FlowButton
                  variant="solid"
                  text={intro.enterHomeLabelEn}
                  onClick={(event) => {
                    event.stopPropagation()
                    finish(HOME_INDEX)
                  }}
                  className="intro-line pointer-events-auto mt-5 w-full rounded-full px-8 py-3.5 text-sm tracking-[0.25em] shadow-[0_0_36px_rgba(199,27,27,0.45)] sm:w-auto sm:min-w-[300px]"
                  style={{ animationDelay: '0.15s' }}
                />
                <p className="mt-2 text-center font-mono text-[9px] tracking-[0.22em] text-parchment-500">{intro.enterHomeLabelEn}</p>
              </>
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
                  className={`h-1.5 rounded-full transition-[width,background-color] duration-500 ${
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
