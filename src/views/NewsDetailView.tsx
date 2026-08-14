import { useEffect, useState } from 'react'
import EditableText from '../components/admin/EditableText'
import { useContent } from '../lib/contentStore'
import { getActiveNewsIndex } from '../lib/newsBus'
import { NEWS_INDEX } from '../lib/pages'
import { requestScene } from '../lib/sceneBus'

/** 新闻详情隐藏页：展示单条新闻标题、日期、分类与正文，返回新闻列表 */
export default function NewsDetailView() {
  const { content } = useContent()
  const news = content.about.news
  const [activeIndex, setActiveIndex] = useState<number | null>(() => getActiveNewsIndex())

  useEffect(() => {
    const onNews = (event: Event) => {
      setActiveIndex((event as CustomEvent).detail.index as number)
    }
    window.addEventListener('ttf-news', onNews)
    return () => window.removeEventListener('ttf-news', onNews)
  }, [])

  const index = Math.max(0, activeIndex ?? 0)
  const item = news[index]

  return (
    <section id="news-detail" data-scroll-root className="relative h-full w-full overflow-y-auto">
      <div className="relative z-10 mx-auto w-full max-w-[1100px] px-8 pb-14 pt-28 lg:px-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-[0.5em] text-brand-400">E 120° · 17 · NEWS · 新闻详情</p>
            {item ? (
              <>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <EditableText
                    as="span"
                    value={item.tag ?? '公告'}
                    path={`about.news.${index}.tag`}
                    className="rounded-full border border-brand-500/40 bg-brand-500/10 px-3 py-1 font-mono text-[10px] tracking-[0.2em] text-brand-400"
                  />
                  <EditableText
                    as="span"
                    value={item.date}
                    path={`about.news.${index}.date`}
                    className="font-mono text-[10px] tracking-[0.3em] text-parchment-500"
                  />
                </div>
                <EditableText
                  as="h1"
                  value={item.title}
                  path={`about.news.${index}.title`}
                  className="mt-4 w-full font-display text-4xl leading-tight tracking-[0.12em] text-parchment-100 lg:text-6xl"
                />
              </>
            ) : (
              <h1 className="mt-4 font-display text-4xl tracking-[0.12em] text-parchment-100 lg:text-6xl">
                新闻详情（占位）
              </h1>
            )}
          </div>
          <button
            type="button"
            onClick={() => requestScene(NEWS_INDEX)}
            className="rounded-md border border-white/15 bg-ink-950/55 px-6 py-2.5 text-sm tracking-[0.2em] text-parchment-100 backdrop-blur-sm transition-all duration-300 hover:border-brand-500/60 hover:text-brand-400"
          >
            ← 返回新闻
          </button>
        </div>

        <div className="scene-block mt-10">
          <div className="h-px w-full bg-gradient-to-r from-brand-500/60 via-white/10 to-transparent" />
          {item ? (
            <EditableText
              as="p"
              multiline
              value={item.body ?? item.desc}
              path={`about.news.${index}.body`}
              className="mt-8 whitespace-pre-line text-base leading-loose text-parchment-300"
            />
          ) : (
            <p className="mt-8 text-base leading-loose text-parchment-300">新闻正文占位：请从新闻列表选择一条新闻查看详情。</p>
          )}
        </div>
      </div>
    </section>
  )
}
