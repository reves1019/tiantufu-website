import { useEffect, useRef, useState } from 'react'
import EditableText from '../components/admin/EditableText'
import { useContent } from '../lib/contentStore'
import { CONTEST_INDEX, CULTURE_INDEX, JOIN_INDEX, MEMBER_INDEX, NEWS_INDEX } from '../lib/pages'
import { requestScene } from '../lib/sceneBus'
import { isMemberPublished } from '../lib/publicCatalog'
import { setActiveMemberId } from '../lib/memberBus'
import { useExhibitionMotion } from '../lib/useExhibitionMotion'
import { FlowButton } from '../components/ui/flow-button'
import { LinearModal } from '../components/ui/linear-modal'
import { isMotionReduced } from '../lib/motionPreference'

export default function AboutView() {
  const { content, admin } = useContent()
  const about = content.about
  const root = useRef<HTMLElement>(null)
  const rail = useRef<HTMLDivElement>(null)
  const fill = useRef<HTMLDivElement>(null)
  const frame = useRef(0)
  const [ends, setEnds] = useState({ start: true, end: true })
  const [authorIndex, setAuthorIndex] = useState(0)
  const authors = content.members.filter(isMemberPublished)
  const author = authors[Math.min(authorIndex, authors.length - 1)]
  useExhibitionMotion(root, admin, about.annals.length, true)
  useEffect(() => {
    const node = rail.current
    if (!node) return
    const update = () => {
      frame.current = 0
      const max = Math.max(0, node.scrollWidth - node.clientWidth)
      const p = max ? Math.max(0, Math.min(1, node.scrollLeft / max)) : 0
      if (fill.current) fill.current.style.transform = `scaleX(${p})`
      const next = { start: node.scrollLeft <= 2, end: node.scrollLeft >= max - 2 }
      setEnds((current) => current.start === next.start && current.end === next.end ? current : next)
    }
    const schedule = () => { if (!frame.current) frame.current = requestAnimationFrame(update) }
    const observer = new ResizeObserver(schedule)
    observer.observe(node)
    ;[...node.children].forEach((child) => observer.observe(child))
    node.addEventListener('scroll', schedule, { passive: true })
    update()
    return () => { observer.disconnect(); node.removeEventListener('scroll', schedule); cancelAnimationFrame(frame.current) }
  }, [about.annals.length])
  const step = (direction: number) => rail.current?.scrollBy({ left: direction * 340, behavior: isMotionReduced() ? 'auto' : 'smooth' })
  return <section ref={root} id="about" data-scroll-root className="atlas-night editorial-page relative h-full w-full overflow-y-auto overflow-x-hidden"><div className="editorial-container">
    <header className="society-header"><EditableText as="h1" value={about.introTitle} path="about.introTitle" className="editorial-title w-full max-w-6xl" /><EditableText as="p" multiline value={about.introBody} path="about.introBody" className="reading-copy" /></header>
    <div className="society-reading"><div className="society-reading-title"><EditableText as="h2" value={content.ui.exhibition.manifesto} path="ui.exhibition.manifesto" />{author && <div className="society-author"><div className="exhibit-portraits">{authors.map((entry, i) => <button key={entry.id} type="button" aria-label={entry.name} aria-pressed={i === authorIndex} onClick={() => setAuthorIndex(i)}><img src={entry.avatar} alt="" loading="lazy" /></button>)}</div><p>{author.name}</p><button type="button" className="collection-text-link" onClick={() => { setActiveMemberId(author.id); requestScene(MEMBER_INDEX) }}>{content.ui.exhibition.authorPage} ↗</button></div>}</div><div className="society-chapters">
      <article data-exhibit-reveal><div className="society-chapter-head"><EditableText as="h2" value={content.ui.about.missionLabel} path="ui.about.missionLabel" /><LinearModal trigger={<span>打开全文 ↗</span>} triggerClassName="society-chapter-trigger" title={content.ui.about.missionLabel} kicker="TIANTUFU · SOCIETY NOTE" description={<p>{about.mission}</p>} /></div><EditableText as="p" multiline value={about.mission} path="about.mission" className="reading-copy" /></article>
      <article data-exhibit-reveal><div className="society-chapter-head"><EditableText as="h2" value={content.ui.about.historyLabel} path="ui.about.historyLabel" /><LinearModal trigger={<span>打开全文 ↗</span>} triggerClassName="society-chapter-trigger" title={content.ui.about.historyLabel} kicker="TIANTUFU · ARCHIVE NOTE" description={<p>{about.history}</p>} /></div><EditableText as="p" multiline value={about.history} path="about.history" className="reading-copy" /></article>
    </div></div>
    <div className="society-statistics">{about.stats.map((stat, i) => <div key={i}><p><EditableText as="span" value={stat.value} path={`about.stats.${i}.value`} /><EditableText as="span" value={stat.suffix} path={`about.stats.${i}.suffix`} /></p><EditableText as="h3" value={stat.label} path={`about.stats.${i}.label`} /><EditableText as="p" value={stat.note} path={`about.stats.${i}.note`} className="society-stat-note" /></div>)}</div>
    <section className="society-annals"><div className="exhibit-heading"><EditableText as="h2" value={content.ui.about.annalsLabel} path="ui.about.annalsLabel" /><div className="explore-arrows"><button type="button" disabled={ends.start} aria-label="向左滑动" onClick={() => step(-1)}><span className="explore-arrow-label">PREV</span><span aria-hidden="true">←</span></button><button type="button" disabled={ends.end} aria-label="向右滑动" onClick={() => step(1)}><span className="explore-arrow-label">NEXT</span><span aria-hidden="true">→</span></button></div></div><div ref={rail} className="society-annals-rail no-scrollbar" tabIndex={0} aria-label={content.ui.about.annalsLabel} onKeyDown={(event) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); step(event.key === 'ArrowLeft' ? -1 : 1) } }}>{about.annals.map((event, i) => <article key={i}><EditableText as="p" value={event.date} path={`about.annals.${i}.date`} className="society-date" /><EditableText as="h3" value={event.title} path={`about.annals.${i}.title`} /><EditableText as="p" multiline value={event.desc} path={`about.annals.${i}.desc`} className="reading-copy" /></article>)}</div><div className="society-annals-track" aria-hidden="true"><div ref={fill} /></div></section>
    {about.introBody.includes('占位') && <p className="editorial-pending">{content.ui.exhibition.aboutNotice}</p>}
    <nav className="society-pages">{[{label:content.ui.about.newsCta,index:NEWS_INDEX},{label:content.ui.about.cultureCta,index:CULTURE_INDEX},{label:content.ui.about.contestCta,index:CONTEST_INDEX}].map((entry) => <button type="button" key={entry.index} onClick={() => requestScene(entry.index)}>{entry.label}<span aria-hidden="true">↗</span></button>)}</nav>
    <footer className="editorial-end"><EditableText as="p" value={content.site.slogan} path="site.slogan" /><FlowButton variant="solid" text={content.ui.home.secondaryCta} onClick={() => requestScene(JOIN_INDEX)} /></footer>
  </div></section>
}
