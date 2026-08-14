import TiltCard from '../components/TiltCard'
import EditableText from '../components/admin/EditableText'
import { useContent } from '../lib/contentStore'
import { NEWS_INDEX } from '../lib/pages'
import { requestScene } from '../lib/sceneBus'

/** 单图制图大赛页：往届数据 / 获奖名单 / 优秀作品 / 细则 / B站宣传视频 */
export default function ContestView() {
  const { content } = useContent()
  const contest = content.contest
  const members = content.members

  return (
    <section id="contest" data-scroll-root className="relative h-full w-full overflow-y-auto">
      <div className="relative z-10 mx-auto w-full max-w-[1700px] px-8 pb-12 pt-28 lg:px-12">
        {/* 顶部标题 + 返回 */}
        <div className="scene-block flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-[0.5em] text-brand-400">E 120° · 10 · CONTEST · 赛事活动</p>
            <EditableText
              as="h1"
              value={contest.title}
              path="contest.title"
              className="mt-3 w-full font-display text-4xl tracking-[0.1em] text-parchment-100 lg:text-6xl"
            />
            <EditableText
              as="p"
              value={contest.subtitle}
              path="contest.subtitle"
              className="mt-2 font-serif-en text-sm italic tracking-[0.3em] text-parchment-400"
            />
          </div>
          <button
            type="button"
            onClick={() => requestScene(NEWS_INDEX)}
            className="rounded-md border border-white/15 bg-ink-950/55 px-6 py-2.5 text-sm tracking-[0.2em] text-parchment-100 backdrop-blur-sm transition-all duration-300 hover:border-brand-500/60 hover:text-brand-400"
          >
            ← 返回
          </button>
        </div>

        {/* 往届数据 + 获奖名单 */}
        <div className="scene-block mt-10 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="font-mono text-xs tracking-[0.35em] text-brand-400">往届数据</p>
            <div className="mt-4 space-y-3">
              {contest.editions.map((edition, i) => (
                <div
                  key={edition.edition}
                  className="flex flex-wrap items-center gap-4 rounded-lg border border-white/10 bg-ink-950/45 px-5 py-4 backdrop-blur-sm"
                >
                  <span className="font-mono text-sm text-brand-400">#{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-lg tracking-[0.12em] text-parchment-100">{edition.edition}</span>
                  <span className="ml-auto font-mono text-xs tracking-[0.1em] text-parchment-500">
                    {edition.year} · 参赛 {edition.participants} · 获奖 {edition.awards}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="font-mono text-xs tracking-[0.35em] text-brand-400">获奖者名单</p>
            <div className="mt-4 space-y-3">
              {contest.winners.map((winner) => (
                <div key={winner.edition} className="rounded-lg border border-white/10 bg-ink-950/45 px-5 py-4 backdrop-blur-sm">
                  <p className="font-mono text-xs tracking-[0.2em] text-brand-400">{winner.edition}</p>
                  <p className="mt-2 text-sm tracking-[0.12em] text-parchment-300">{winner.names.join(' · ')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 往届优秀作品（占位：网格，后续可改瀑布流/轮播） */}
        <p className="scene-block mt-10 font-mono text-xs tracking-[0.35em] text-brand-400">往届优秀作品（占位 · 后续可调整为瀑布流/轮播）</p>
        <div className="scene-block mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {(contest.works ?? []).map((work, i) => {
            const author = members.find((member) => member.name === work.author)
            return (
              <TiltCard key={`${work.title}-${i}`} className="h-full">
                <div className="group h-full overflow-hidden rounded-lg border border-white/10 bg-ink-950/45 backdrop-blur-sm">
                  <div className="aspect-[16/10] overflow-hidden bg-ink-900">
                    <img
                      src={work.image}
                      alt={work.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <img
                      src={author?.avatar ?? members[0]?.avatar}
                      alt=""
                      loading="lazy"
                      className="h-8 w-8 rounded-full border border-brand-500/50 bg-ink-900 object-cover"
                    />
                    <div className="min-w-0">
                      <EditableText as="p" value={work.title} path={`contest.works.${i}.title`} className="truncate text-sm text-parchment-100" />
                      <EditableText as="p" value={work.author} path={`contest.works.${i}.author`} className="truncate text-[10px] text-parchment-500" />
                    </div>
                    <span className="ml-auto shrink-0 rounded-full border border-brand-500/30 bg-brand-500/10 px-2 py-0.5 font-mono text-[9px] tracking-[0.15em] text-brand-400">
                      {work.edition}
                    </span>
                  </div>
                  <EditableText as="p" multiline value={work.desc} path={`contest.works.${i}.desc`} className="px-4 pb-4 text-xs leading-relaxed text-parchment-500" />
                </div>
              </TiltCard>
            )
          })}
        </div>

        {/* 比赛细则 + B站宣传视频 */}
        <div className="scene-block mt-10 grid gap-6 pb-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-lg border border-white/10 bg-ink-950/45 p-6 backdrop-blur-sm">
            <p className="font-mono text-xs tracking-[0.35em] text-brand-400">比赛细则</p>
            <EditableText
              as="p"
              multiline
              value={contest.rules}
              path="contest.rules"
              className="mt-3 text-sm leading-relaxed text-parchment-300"
            />
          </div>
          <a
            href={contest.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="group flex flex-col items-center justify-center rounded-lg border border-white/10 bg-ink-950/45 p-6 backdrop-blur-sm transition-colors duration-300 hover:border-brand-500/60"
          >
            <span className="text-3xl text-brand-400 transition-transform duration-300 group-hover:scale-110">▶</span>
            <p className="mt-3 font-mono text-xs tracking-[0.3em] text-brand-400">B 站宣传视频</p>
            <EditableText
              as="span"
              value={contest.videoUrl}
              path="contest.videoUrl"
              className="mt-2 w-full break-all text-center text-[10px] text-parchment-500"
            />
          </a>
        </div>
      </div>
    </section>
  )
}
