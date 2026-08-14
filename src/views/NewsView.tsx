import { useMemo, useState } from 'react'
import EditableText from '../components/admin/EditableText'
import { useContent } from '../lib/contentStore'
import { setActiveNewsIndex } from '../lib/newsBus'
import { ABOUT_INDEX, CONTEST_INDEX, NEWS_DETAIL_INDEX } from '../lib/pages'
import { requestScene } from '../lib/sceneBus'

/** 社团新闻子页：近期新闻列表 + 单图制图大赛入口 */
export default function NewsView() {
  const { content } = useContent()
  const news = content.about.news
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(6)

  const tags = useMemo(() => Array.from(new Set(news.map((item) => item.tag ?? '公告'))), [news])
  const filtered = useMemo(
    () =>
      news
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => selectedTag === null || (item.tag ?? '公告') === selectedTag),
    [news, selectedTag],
  )
  const shown = filtered.slice(0, visibleCount)

  const selectTag = (tag: string | null) => {
    setSelectedTag(tag)
    setVisibleCount(6)
  }

  const toggleExpand = () => {
    setVisibleCount((v) => (v >= filtered.length ? 6 : Math.min(filtered.length, v + 6)))
  }

  return (
    <section id="news" data-scroll-root className="relative h-full w-full overflow-y-auto">
      <div className="relative z-10 mx-auto w-full max-w-[1700px] px-8 pb-12 pt-24 lg:px-12">
        <div className="scene-block">
          <p className="font-mono text-xs tracking-[0.5em] text-brand-400">E 120° · 08 · NEWS · 社团新闻</p>
          <h1 className="mt-4 font-display text-5xl tracking-[0.14em] text-parchment-100 lg:text-6xl">新闻动态</h1>
          <p className="mt-3 text-sm tracking-[0.2em] text-parchment-400">近期社团动态与公告（占位内容，后续替换）</p>
        </div>

        {/* 分类筛选 chips */}
        <div className="scene-block no-scrollbar mt-8 flex items-center gap-3 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => selectTag(null)}
            className={`shrink-0 rounded-full border px-4 py-1.5 font-mono text-[10px] tracking-[0.2em] transition-all duration-300 ${
              selectedTag === null
                ? 'border-brand-500 bg-brand-500/15 text-brand-400 shadow-[0_0_14px_rgba(199,27,27,0.25)]'
                : 'border-white/10 bg-ink-950/45 text-parchment-300 hover:border-brand-500/40 hover:text-brand-400'
            }`}
          >
            全部 · {filtered.length}
          </button>
          {tags.map((tag) => {
            const active = selectedTag === tag
            return (
              <button
                key={tag}
                type="button"
                onClick={() => selectTag(tag)}
                className={`shrink-0 rounded-full border px-4 py-1.5 font-mono text-[10px] tracking-[0.2em] transition-all duration-300 ${
                  active
                    ? 'border-brand-500 bg-brand-500/15 text-brand-400 shadow-[0_0_14px_rgba(199,27,27,0.25)]'
                    : 'border-white/10 bg-ink-950/45 text-parchment-300 hover:border-brand-500/40 hover:text-brand-400'
                }`}
              >
                {tag}
              </button>
            )
          })}
        </div>

        <div className="scene-block mt-10 grid gap-4 md:grid-cols-2">
          {shown.map(({ item, index: i }) => (
            <button
              key={item.title}
              type="button"
              onClick={() => {
                setActiveNewsIndex(i)
                requestScene(NEWS_DETAIL_INDEX)
              }}
              className="group rounded-lg border border-white/10 bg-ink-950/45 p-6 text-left backdrop-blur-sm transition-all duration-300 hover:border-brand-500/50 hover:shadow-[0_0_24px_rgba(199,27,27,0.16)]"
            >
              <div className="flex items-center justify-between gap-3">
                <EditableText as="span" value={item.date} path={`about.news.${i}.date`} className="font-mono text-[10px] tracking-[0.3em] text-brand-400" />
                <EditableText
                  as="span"
                  value={item.tag ?? '公告'}
                  path={`about.news.${i}.tag`}
                  className="shrink-0 rounded-full border border-brand-500/40 bg-brand-500/10 px-2.5 py-0.5 font-mono text-[9px] tracking-[0.2em] text-brand-400"
                />
              </div>
              <span className="mt-2 flex items-center gap-2">
                <EditableText as="h3" value={item.title} path={`about.news.${i}.title`} className="text-lg tracking-[0.1em] text-parchment-100 transition-colors group-hover:text-brand-400" />
                <span className="ml-auto font-mono text-[10px] tracking-[0.15em] text-parchment-500 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">详情 →</span>
              </span>
              <EditableText as="p" multiline value={item.desc} path={`about.news.${i}.desc`} className="mt-2 text-sm leading-relaxed text-parchment-500" />
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="scene-block mt-16 text-center font-mono text-sm tracking-[0.3em] text-parchment-500">
            该分类暂无新闻（占位提示）
          </p>
        )}

        {filtered.length > 6 && (
          <div className="scene-block mt-10 flex justify-center">
            <button
              type="button"
              onClick={toggleExpand}
              className="rounded-full border border-brand-500/40 bg-ink-950/55 px-8 py-3 font-mono text-xs tracking-[0.25em] text-brand-400 backdrop-blur-sm transition-all duration-300 hover:border-brand-500 hover:bg-brand-500/10 hover:shadow-[0_0_24px_rgba(199,27,27,0.3)]"
            >
              {visibleCount >= filtered.length ? '收起 ↑' : '展开更多动态 ↓'}
            </button>
          </div>
        )}

        <div className="scene-block mt-10 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => requestScene(CONTEST_INDEX)}
            className="rounded-md bg-brand-500 px-7 py-3 text-sm tracking-[0.2em] text-white shadow-[0_0_24px_rgba(199,27,27,0.35)] transition-all duration-300 hover:bg-brand-600"
          >
            天图府·单图制图大赛 →
          </button>
          <button
            type="button"
            onClick={() => requestScene(ABOUT_INDEX)}
            className="rounded-md border border-white/15 bg-ink-950/55 px-7 py-3 text-sm tracking-[0.2em] text-parchment-100 backdrop-blur-sm transition-all duration-300 hover:border-brand-500/60 hover:text-brand-400"
          >
            ← 返回社团介绍
          </button>
        </div>
      </div>
    </section>
  )
}
