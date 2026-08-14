import { useEffect, useRef, useState } from 'react'
import EditableText from '../components/admin/EditableText'
import { site } from '../config/site'
import { useContent } from '../lib/contentStore'
import { CONTEST_INDEX, CULTURE_INDEX, NEWS_INDEX } from '../lib/pages'
import { requestScene } from '../lib/sceneBus'

/** 社团介绍页：以文本为主（简介 / 宗旨 / 历史 + 核心数据 + 年鉴），新闻与文化为独立子页 */
export default function AboutView() {
  const { content } = useContent()
  const about = content.about

  const railRef = useRef<HTMLDivElement>(null)
  const annalsFillRef = useRef<HTMLDivElement>(null)
  const annalsThumbRef = useRef<HTMLSpanElement>(null)
  const rafRef = useRef(0)
  const [annalsStart, setAnnalsStart] = useState(true)
  const [annalsEnd, setAnnalsEnd] = useState(true)

  const updateAnnals = () => {
    rafRef.current = 0
    const el = railRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    const p = max > 0 ? Math.min(1, Math.max(0, el.scrollLeft / max)) : 0
    if (annalsFillRef.current) annalsFillRef.current.style.width = `${p * 100}%`
    if (annalsThumbRef.current) annalsThumbRef.current.style.opacity = p > 0 && p < 1 ? '1' : '0.4'
    const start = el.scrollLeft <= 2
    const end = el.scrollLeft >= max - 2
    setAnnalsStart((v) => (v === start ? v : start))
    setAnnalsEnd((v) => (v === end ? v : end))
  }

  useEffect(() => {
    updateAnnals()
    const onResize = () => updateAnnals()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const onAnnalsScroll = () => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(updateAnnals)
  }

  const stepAnnals = (dir: 1 | -1) => {
    railRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' })
  }

  return (
    <section
      id="about"
      data-scroll-root
      className="relative h-full w-full overflow-y-auto"
    >
      <div className="relative z-10 mx-auto w-full max-w-[1700px] px-8 py-12 lg:px-12">
        <div className="scene-block flex items-baseline gap-4">
          <p className="font-mono text-xs tracking-[0.5em] text-brand-400">E 120° · 02 · 社团介绍 · {site.nameEn}</p>
          <span className="h-px w-16 bg-white/15" />
        </div>
        <EditableText
          as="h2"
          value={about.introTitle}
          path="about.introTitle"
          className="scene-block mt-3 font-display text-5xl tracking-[0.12em] text-parchment-100 lg:text-6xl"
        />

        {/* 社团简介 */}
        <EditableText
          as="p"
          multiline
          value={about.introBody}
          path="about.introBody"
          className="scene-block mt-5 max-w-3xl text-sm leading-relaxed text-parchment-300"
        />

        {/* 社团宗旨 */}
        <div className="scene-block mt-8 max-w-3xl border-l-2 border-brand-500/60 pl-5">
          <p className="font-mono text-xs tracking-[0.35em] text-brand-400">社团宗旨</p>
          <EditableText
            as="p"
            multiline
            value={about.mission}
            path="about.mission"
            className="mt-2 text-sm leading-relaxed text-parchment-300"
          />
        </div>

        {/* 社团历史 */}
        <div className="scene-block mt-6 max-w-3xl border-l-2 border-white/15 pl-5">
          <p className="font-mono text-xs tracking-[0.35em] text-brand-400">社团历史</p>
          <EditableText
            as="p"
            multiline
            value={about.history}
            path="about.history"
            className="mt-2 text-sm leading-relaxed text-parchment-300"
          />
        </div>

        {/* 核心数据 */}
        <div className="scene-block mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {about.stats.map((stat, i) => (
            <div
              key={stat.label}
              className="rounded-lg border border-white/10 bg-ink-950/45 p-5 backdrop-blur-sm transition-colors duration-300 hover:border-brand-500/50"
            >
              <p className="flex items-baseline gap-1.5">
                <EditableText
                  as="span"
                  value={stat.value}
                  path={`about.stats.${i}.value`}
                  className="font-display text-4xl text-parchment-100"
                />
                <EditableText
                  as="span"
                  value={stat.suffix}
                  path={`about.stats.${i}.suffix`}
                  className="text-base text-gold-400"
                />
              </p>
              <EditableText
                as="p"
                value={stat.label}
                path={`about.stats.${i}.label`}
                className="mt-1.5 text-sm tracking-[0.2em] text-parchment-300"
              />
              <EditableText
                as="p"
                value={stat.note}
                path={`about.stats.${i}.note`}
                className="mt-0.5 text-xs text-parchment-500"
              />
            </div>
          ))}
        </div>

        {/* 年鉴（历史大事记，横向滑动 + 自定义进度条） */}
        <div className="scene-block mt-8 max-w-[1300px]">
          <div className="flex items-center justify-between gap-4">
            <p className="font-mono text-xs tracking-[0.35em] text-brand-400">年鉴 · 重大事件</p>
            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={() => stepAnnals(-1)}
                disabled={annalsStart}
                aria-label="向左滑动"
                className={`flex h-8 w-8 items-center justify-center rounded-md border text-sm transition-all duration-300 ${
                  annalsStart
                    ? 'cursor-default border-white/5 text-white/15'
                    : 'border-white/15 text-parchment-300 hover:border-brand-500/60 hover:text-brand-400 hover:shadow-[0_0_14px_rgba(199,27,27,0.3)]'
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => stepAnnals(1)}
                disabled={annalsEnd}
                aria-label="向右滑动"
                className={`flex h-8 w-8 items-center justify-center rounded-md border text-sm transition-all duration-300 ${
                  annalsEnd
                    ? 'cursor-default border-white/5 text-white/15'
                    : 'border-white/15 text-parchment-300 hover:border-brand-500/60 hover:text-brand-400 hover:shadow-[0_0_14px_rgba(199,27,27,0.3)]'
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
          <div
            ref={railRef}
            onScroll={onAnnalsScroll}
            className="no-scrollbar mt-4 flex snap-x gap-4 overflow-x-auto pb-3"
          >
            {about.annals.map((item, i) => (
              <div
                key={item.title}
                className="w-72 shrink-0 snap-start rounded-lg border border-white/10 bg-ink-950/45 p-5 backdrop-blur-sm transition-colors duration-300 hover:border-brand-500/50"
              >
                <p className="font-mono text-[10px] tracking-[0.25em] text-brand-400">
                  {String(i + 1).padStart(2, '0')} · {item.date}
                </p>
                <EditableText as="h4" value={item.title} path={`about.annals.${i}.title`} className="mt-2 text-lg tracking-[0.1em] text-parchment-100" />
                <EditableText as="p" multiline value={item.desc} path={`about.annals.${i}.desc`} className="mt-2 text-xs leading-relaxed text-parchment-500" />
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="relative h-[2px] flex-1 overflow-hidden rounded-full bg-white/10">
              <div ref={annalsFillRef} className="annals-fill h-full rounded-full" style={{ width: '0%' }} />
            </div>
            <span ref={annalsThumbRef} className="annals-thumb h-1.5 w-1.5 shrink-0 rounded-full" style={{ opacity: 0.4 }} />
          </div>
        </div>

        {/* 子页入口：新闻 / 文化 / 大赛 */}
        <div className="scene-block mt-10 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => requestScene(NEWS_INDEX)}
            className="rounded-md bg-brand-500 px-7 py-3 text-sm tracking-[0.2em] text-white shadow-[0_0_24px_rgba(199,27,27,0.35)] transition-all duration-300 hover:bg-brand-600"
          >
            新闻动态 →
          </button>
          <button
            type="button"
            onClick={() => requestScene(CULTURE_INDEX)}
            className="rounded-md border border-white/15 bg-ink-950/55 px-7 py-3 text-sm tracking-[0.2em] text-parchment-100 backdrop-blur-sm transition-all duration-300 hover:border-brand-500/60 hover:text-brand-400"
          >
            社团文化 →
          </button>
          <button
            type="button"
            onClick={() => requestScene(CONTEST_INDEX)}
            className="rounded-md border border-brand-500/40 bg-ink-950/55 px-7 py-3 text-sm tracking-[0.2em] text-brand-400 backdrop-blur-sm transition-all duration-300 hover:border-brand-500 hover:bg-brand-500/10"
          >
            单图制图大赛 →
          </button>
        </div>
      </div>
    </section>
  )
}
