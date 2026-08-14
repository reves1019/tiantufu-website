import { useState } from 'react'
import GlobeDome from '../components/GlobeDome'
import LetterSwap from '../components/LetterSwap'
import Magnetic from '../components/Magnetic'
import EditableText from '../components/admin/EditableText'
import { heroConfig } from '../config/site'
import { useContent } from '../lib/contentStore'
import { ABOUT_INDEX, JOIN_INDEX, MEMBER_INDEX, NEWS_INDEX, WORKS_INDEX } from '../lib/pages'
import { setActiveMemberId } from '../lib/memberBus'
import { requestScene } from '../lib/sceneBus'

export default function HomeView() {
  const { content, admin } = useContent()
  const [videoEnded, setVideoEnded] = useState(false)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement
    if (target.closest('button, a')) return
    requestScene(ABOUT_INDEX)
  }

  return (
    <section
      id="home"
      onClick={handleClick}
      className="relative flex h-full w-full cursor-pointer flex-col items-center justify-center overflow-hidden"
    >
      {/* 片头视频（入场动画，只播一次后淡出） */}
      {heroConfig.video.enabled && (
        <video
          className="absolute inset-0 z-[1] h-full w-full object-cover"
          style={{
            opacity: videoEnded ? 0 : heroConfig.video.opacity,
            transition: 'opacity 1500ms ease',
          }}
          src={heroConfig.video.src}
          autoPlay
          muted
          loop={heroConfig.video.loop}
          playsInline
          preload="metadata"
          aria-hidden="true"
          onEnded={() => {
            if (heroConfig.video.fadeOutOnEnd) setVideoEnded(true)
          }}
          onError={(event) => {
            event.currentTarget.style.display = 'none'
          }}
        />
      )}

      {/* 星球穹顶 */}
      <GlobeDome className="top-[45%] z-[3] w-[min(1500px,95vw)]" />

      {/* 标题区（Shopify 式滑入） */}
      <div className="relative z-10 mx-auto flex max-w-[1700px] flex-col items-center px-6 pb-44 pt-24 text-center md:pb-40">
        {admin ? (
          <EditableText
            as="h1"
            value={content.site.name}
            path="site.name"
            className="scene-block w-[min(80vw,1100px)] text-center font-display text-[clamp(76px,11vw,150px)] font-medium leading-none tracking-[0.14em] text-parchment-100"
          />
        ) : (
          <LetterSwap
            as="h1"
            text={content.site.name}
            className="scene-block font-display text-[clamp(76px,11vw,150px)] font-medium leading-none tracking-[0.14em] text-parchment-100"
          />
        )}
        <p className="scene-block mt-5 font-serif-en text-sm italic tracking-[0.45em] text-parchment-400 md:text-base">
          TiantuMansion
        </p>
        <div className="scene-block mt-10 flex flex-wrap items-center justify-center gap-4">
          <Magnetic>
            <button
              type="button"
              onClick={() => requestScene(ABOUT_INDEX)}
              className="btn-sheen inline-block rounded-md bg-brand-500 px-12 py-4 text-sm tracking-[0.22em] text-white shadow-[0_0_36px_rgba(255,143,163,0.4)] transition-all duration-300 hover:bg-brand-600 hover:shadow-[0_0_52px_rgba(255,143,163,0.6)]"
            >
              进入天图府
            </button>
          </Magnetic>
          <Magnetic>
            <button
              type="button"
              onClick={() => requestScene(JOIN_INDEX)}
              className="inline-block rounded-md border border-white/25 bg-ink-950/40 px-10 py-4 text-sm tracking-[0.22em] text-parchment-100 backdrop-blur-sm transition-all duration-300 hover:border-brand-400 hover:text-brand-400"
            >
              加入我们
            </button>
          </Magnetic>
        </div>
      </div>

      {/* 内容预览入口：精选作品 + 最新动态（QmlmReader 门户首页启发） */}
      <div
        onClick={(event) => event.stopPropagation()}
        className="absolute inset-x-0 bottom-0 z-10 mx-auto w-full max-w-[1700px] px-4 pb-4 sm:px-6 lg:px-10 lg:pb-6"
      >
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 rounded-xl border border-white/10 bg-ink-950/55 p-4 shadow-[0_0_40px_rgba(0,0,0,0.45)] backdrop-blur-xl md:flex-row md:items-center md:justify-between md:gap-6">
          {/* 精选作品缩略图 */}
          <div className="flex items-center gap-3">
            <span className="hidden shrink-0 font-mono text-[10px] tracking-[0.3em] text-brand-400 md:block">精选作品</span>
            <div className="flex items-center gap-2">
              {content.members.slice(0, 3).map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => {
                    setActiveMemberId(member.id)
                    requestScene(MEMBER_INDEX)
                  }}
                  title={member.work.title}
                  className="group relative h-12 w-[72px] overflow-hidden rounded-md border border-white/10 transition-all duration-300 hover:border-brand-500/60 hover:shadow-[0_0_18px_rgba(199,27,27,0.35)] md:w-20"
                >
                  <img
                    src={member.work.image}
                    alt={member.work.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/85 to-transparent px-1 pb-0.5 pt-3 text-left font-mono text-[8px] tracking-[0.08em] text-parchment-200">
                    {member.name}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => requestScene(WORKS_INDEX)}
              className="hidden shrink-0 font-mono text-[10px] tracking-[0.2em] text-parchment-500 transition-colors hover:text-brand-400 lg:block"
            >
              查看全部作品 →
            </button>
          </div>

          {/* 最新动态（桌面） */}
          <div className="hidden min-w-0 flex-1 items-center gap-4 border-l border-white/10 pl-4 md:flex">
            <span className="shrink-0 font-mono text-[10px] tracking-[0.3em] text-brand-400">最新动态</span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              {content.about.news.slice(0, 2).map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => requestScene(NEWS_INDEX)}
                  className="truncate text-left font-mono text-[10px] tracking-[0.12em] text-parchment-300 transition-colors hover:text-brand-400"
                >
                  <span className="text-brand-400/80">{item.date}</span> · {item.title}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => requestScene(NEWS_INDEX)}
              className="shrink-0 font-mono text-[10px] tracking-[0.2em] text-parchment-500 transition-colors hover:text-brand-400"
            >
              查看全部 →
            </button>
          </div>

          {/* 移动端：1 张缩略图 + 1 条动态 */}
          <div className="flex min-w-0 items-center gap-3 md:hidden">
            <button
              type="button"
              onClick={() => {
                const first = content.members[0]
                if (first) {
                  setActiveMemberId(first.id)
                  requestScene(MEMBER_INDEX)
                }
              }}
              className="h-10 w-16 shrink-0 overflow-hidden rounded-md border border-white/10"
            >
              {content.members[0] && (
                <img src={content.members[0].work.image} alt="" loading="lazy" className="h-full w-full object-cover" />
              )}
            </button>
            <button
              type="button"
              onClick={() => requestScene(NEWS_INDEX)}
              className="min-w-0 flex-1 truncate text-left font-mono text-[10px] tracking-[0.12em] text-parchment-300"
            >
              {content.about.news[0]
                ? `${content.about.news[0].date} · ${content.about.news[0].title}`
                : '最新动态（占位）'}
            </button>
            <button
              type="button"
              onClick={() => requestScene(WORKS_INDEX)}
              className="shrink-0 font-mono text-[10px] tracking-[0.2em] text-brand-400"
            >
              作品 →
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
