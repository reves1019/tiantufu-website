import { useEffect, useRef, useState } from 'react'
import EditableText from '../components/admin/EditableText'
import { useContent } from '../lib/contentStore'
import { getActiveNewsIndex, setActiveNewsIndex } from '../lib/newsBus'
import { NEWS_INDEX } from '../lib/pages'
import { requestScene } from '../lib/sceneBus'
import { useExhibitionMotion } from '../lib/useExhibitionMotion'
import { CreativeButton } from '../components/ui/creative-button'

export default function NewsDetailView() {
  const { content, admin } = useContent()
  const root = useRef<HTMLElement>(null)
  const [activeIndex, setActiveIndex] = useState<number | null>(() => getActiveNewsIndex())
  useEffect(() => {
    const onNews = (event: Event) => { setActiveIndex((event as CustomEvent).detail.index); if (root.current) root.current.scrollTop = 0 }
    window.addEventListener('ttf-news', onNews)
    return () => window.removeEventListener('ttf-news', onNews)
  }, [])
  const ui = content.ui.newsDetail
  const item = activeIndex === null ? undefined : content.about.news[activeIndex]
  useExhibitionMotion(root, admin, activeIndex ?? -1)
  return <section ref={root} id="news-detail" data-scroll-root className="atlas-night editorial-page h-full overflow-y-auto overflow-x-hidden"><div className="editorial-container article-container">
    <CreativeButton direction="top" text={ui.backNews} onClick={() => requestScene(NEWS_INDEX)} />
    <header className="article-header">{item && <div className="article-meta"><EditableText value={item.tag ?? '公告'} path={`about.news.${activeIndex}.tag`} /><EditableText value={item.date} path={`about.news.${activeIndex}.date`} /></div>}<EditableText as="h1" value={item?.title ?? ui.fallbackTitle} path={item ? `about.news.${activeIndex}.title` : 'ui.newsDetail.fallbackTitle'} className="editorial-title w-full max-w-6xl" /></header>
    <article className="article-body" data-exhibit-reveal><EditableText as="p" multiline value={item ? item.body ?? item.desc : ui.emptyBody} path={item ? `about.news.${activeIndex}.body` : 'ui.newsDetail.emptyBody'} className="reading-copy" /></article>
    {item && <nav className="article-neighbours" aria-label={ui.relatedLabel}>{([-1, 1] as const).map((direction) => { const index = activeIndex! + direction; const next = content.about.news[index]; return next && <button key={direction} onClick={() => setActiveNewsIndex(index)}><span>{direction < 0 ? ui.previous : ui.next}</span><strong>{next.title}</strong></button> })}</nav>}
    <footer className="journal-footer"><CreativeButton direction="top" text={ui.backNews} onClick={() => requestScene(NEWS_INDEX)} /></footer>
  </div></section>
}
