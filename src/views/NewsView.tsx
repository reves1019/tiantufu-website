import { useRef, useState } from 'react'
import EditableText from '../components/admin/EditableText'
import { useContent } from '../lib/contentStore'
import { setActiveNewsIndex } from '../lib/newsBus'
import { ABOUT_INDEX, CONTEST_INDEX, NEWS_DETAIL_INDEX } from '../lib/pages'
import { requestScene } from '../lib/sceneBus'
import { useExhibitionMotion } from '../lib/useExhibitionMotion'
import { exhibitionCatalog } from '../lib/exhibitionCatalog'
import { FlowButton } from '../components/ui/flow-button'
import { LinearModal } from '../components/ui/linear-modal'

let readingPlace: { tag: string | null; count: number } = { tag: null, count: 6 }

export default function NewsView() {
  const { content, admin } = useContent()
  const root = useRef<HTMLElement>(null)
  const news = content.about.news
  const ui = content.ui.news
  const [selectedTag, setSelectedTag] = useState(readingPlace.tag)
  const [visibleCount, setVisibleCount] = useState(readingPlace.count)
  const tags = [...new Set(news.map((item) => item.tag?.trim() || '公告'))]
  const activeTag = selectedTag && tags.includes(selectedTag) ? selectedTag : null
  const filtered = news.map((item, index) => ({ item, index })).filter(({ item }) => !activeTag || (item.tag?.trim() || '公告') === activeTag)
  const shown = filtered.slice(0, visibleCount)
  const map = exhibitionCatalog(content.worksArchive, content.members, '地图')[0]?.work
  useExhibitionMotion(root, admin, `${activeTag}-${shown.length}`)
  const select = (tag: string | null) => { setSelectedTag(tag); setVisibleCount(6); readingPlace = { tag, count: 6 } }
  const expand = () => { const count = visibleCount >= filtered.length ? 6 : visibleCount + 6; setVisibleCount(count); readingPlace = { tag: activeTag, count } }
  return <section ref={root} id="news" aria-label={ui.title} data-scroll-root className="atlas-night editorial-page journal-page h-full overflow-y-auto overflow-x-hidden"><div className="editorial-container">
    <button type="button" className="collection-text-link" onClick={() => requestScene(ABOUT_INDEX)}>{ui.backAbout}</button>
    <header className="journal-header" data-exhibit-reveal><div><p className="linear-modal-kicker">{ui.kicker}</p><EditableText as="h1" value={ui.title} path="ui.news.title" className="editorial-title w-full max-w-6xl" /><EditableText as="p" multiline value={ui.subtitle} path="ui.news.subtitle" className="reading-copy" /></div><button type="button" className="journal-feature" onClick={() => requestScene(CONTEST_INDEX)} aria-label={ui.contestCta}>{map && <img src={map.image} alt="" loading="lazy" data-exhibit-image />}<span>{ui.contestCta}</span></button></header>
    <div className="journal-filter" role="group" aria-label={ui.filterLabel} aria-controls="news-results">{[null, ...tags].map((tag) => <button type="button" key={tag ?? 'all'} aria-pressed={activeTag === tag} onClick={() => select(tag)}>{tag ?? ui.allFilter}<span aria-hidden="true">{tag ? news.filter((item) => (item.tag?.trim() || '公告') === tag).length : news.length}</span></button>)}</div>
    <p className="reading-copy mt-4" role="status" aria-live="polite">{activeTag ? `${activeTag} · ` : ''}共 {filtered.length} 条动态，当前展示 {Math.min(shown.length, filtered.length)} 条</p>
    <div id="news-results" className="journal-list" aria-live="polite">{shown.map(({ item, index }) => <article key={index} id={`news-entry-${index}`} aria-labelledby={`news-entry-title-${index}`} className="journal-entry" data-exhibit-reveal><div className="journal-entry-meta"><EditableText value={item.date} path={`about.news.${index}.date`} /><EditableText value={item.tag ?? '公告'} path={`about.news.${index}.tag`} /></div><div><h2 id={`news-entry-title-${index}`}><LinearModal
      trigger={<><span>{item.title}</span><span aria-hidden="true">↗</span></>}
      triggerClassName="journal-entry-title"
      triggerAriaLabel={`${item.title} · ${ui.detailHint}`}
      kicker={`${item.date} · ${item.tag ?? '公告'}`}
      title={item.title}
      description={<p>{item.body ?? item.desc}</p>}
      footer={(close) => <FlowButton text="打开完整报道" onClick={() => { close(); setActiveNewsIndex(index); requestScene(NEWS_DETAIL_INDEX) }} />}
    /></h2>{admin && <EditableText value={item.title} path={`about.news.${index}.title`} />}<EditableText as="p" multiline value={item.desc} path={`about.news.${index}.desc`} className="reading-copy" /></div></article>)}</div>
    {!filtered.length && <p className="reading-copy journal-empty" role="status">{ui.empty}</p>}
    {filtered.length > 6 && <FlowButton className="journal-more" aria-controls="news-results" aria-expanded={visibleCount >= filtered.length} onClick={expand} text={visibleCount >= filtered.length ? content.ui.works.collapse : ui.expand} />}
    <footer className="journal-footer" data-exhibit-reveal><FlowButton variant="solid" text={ui.contestCta} onClick={() => requestScene(CONTEST_INDEX)} /><button type="button" className="collection-text-link" onClick={() => requestScene(ABOUT_INDEX)}>{ui.backAbout}</button></footer>
  </div></section>
}
