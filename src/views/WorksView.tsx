import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lightbox from '../components/Lightbox'
import EditableText from '../components/admin/EditableText'
import { useContent } from '../lib/contentStore'
import { MEMBER_INDEX } from '../lib/pages'
import { setActiveMemberId } from '../lib/memberBus'
import { requestScene } from '../lib/sceneBus'
import { isMemberPublished, isPortraitPlaceholderWork } from '../lib/publicCatalog'
import { exhibitionCatalog } from '../lib/exhibitionCatalog'
import { isMotionReduced } from '../lib/motionPreference'

const readingPlace = { topic: '', category: '', author: '', count: 12, scroll: 0 }
gsap.registerPlugin(useGSAP, ScrollTrigger)

export default function WorksView() {
  const { content, admin } = useContent()
  const ui = content.ui.works
  const exhibit = content.ui.exhibition
  const root = useRef<HTMLElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const [topic, setTopic] = useState(readingPlace.topic)
  const [category, setCategory] = useState(readingPlace.category)
  const [author, setAuthor] = useState(readingPlace.author)
  const [count, setCount] = useState(readingPlace.count)
  const [advanced, setAdvanced] = useState(Boolean(category || author))
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const catalogue = useMemo(() => exhibitionCatalog(content.worksArchive, content.members, content.ui.member.representative), [content.worksArchive, content.members, content.ui.member.representative])
  const members = content.members.filter(isMemberPublished)
  const filtered = catalogue.filter(({ work, member }) => (!topic || work.topic === topic) && (!category || work.category === category) && (!author || member?.id === author || work.author === author))
  const images = filtered.map(({ work, member }) => ({ src: work.fullImage ?? (member?.work.image === work.image ? member.work.fullImage : undefined) ?? work.image, title: work.title, desc: work.desc, author: work.author, story: work.story }))
  useGSAP(() => {
    if (admin || !root.current) return
    const media = gsap.matchMedia()
    media.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
      gsap.utils.toArray<HTMLElement>('.collection-map-cover', root.current).forEach((image) => {
        gsap.fromTo(image, { scale: .97, opacity: .75 }, { scale: 1, opacity: 1, ease: 'none', scrollTrigger: {
          trigger: image, scroller: root.current, start: 'top 96%', end: 'top 72%', scrub: .5,
        } })
      })
    })
    return () => media.revert()
  }, { scope: root, dependencies: [topic, category, author, count, catalogue.length, admin], revertOnUpdate: true })
  useEffect(() => {
    const node = root.current
    if (!node) return
    node.scrollTop = readingPlace.scroll
    return () => { readingPlace.scroll = node.scrollTop }
  }, [])
  useEffect(() => { Object.assign(readingPlace, { topic, category, author, count }) }, [topic, category, author, count])
  const openAuthor = (id: string) => { setActiveMemberId(id); requestScene(MEMBER_INDEX) }
  const reset = () => { setTopic(''); setCategory(''); setAuthor(''); setCount(12) }
  const featured = catalogue[0]

  return <section ref={root} id="works" data-scroll-root className="atlas-night collection-page relative h-full w-full overflow-x-hidden overflow-y-auto">
    <div className="collection-inner">
      <header className="collection-header">
        <div><EditableText as="h1" value={exhibit.catalogueTitle} path="ui.exhibition.catalogueTitle" /><EditableText as="p" value={exhibit.catalogueIntro} path="ui.exhibition.catalogueIntro" className="reading-copy" /><button type="button" className="collection-text-link" onClick={() => list.current?.scrollIntoView({ behavior: isMotionReduced() ? 'auto' : 'smooth', block: 'start' })}>{exhibit.browseCatalogue} ↓</button></div>
        {featured && <button type="button" className="collection-feature" onClick={() => { reset(); setLightboxIndex(0) }} aria-label={`${ui.readMap} · ${featured.work.title}`}><img src={featured.work.image} alt={featured.work.title} loading="eager" /><span>{featured.work.title}<small>{featured.work.author} · {ui.readMap} ↗</small></span></button>}
      </header>
        <div ref={list} className="collection-list" id="collection-catalogue">
        <h2 className="collection-section-title"><EditableText as="span" value={exhibit.collectionTitle} path="ui.exhibition.collectionTitle" /><span className="collection-count">{filtered.length} {exhibit.countUnit}</span></h2>
        <div className="map-catalogue-filters"><div role="group" aria-label={ui.catalogue} className="map-theme-filters"><button type="button" aria-pressed={!topic} onClick={() => { setTopic(''); setCount(12) }}>{ui.filterAll}<span>{catalogue.length}</span></button>{content.topics.map((entry) => <button type="button" key={entry.id} aria-pressed={topic === entry.id} onClick={() => { setTopic(entry.id); setCount(12) }}>{entry.name}<span>{catalogue.filter(({ work }) => work.topic === entry.id).length}</span></button>)}</div><button type="button" aria-expanded={advanced} aria-controls="map-advanced-filters" onClick={() => setAdvanced(!advanced)}>{ui.advancedFilters} {advanced ? '−' : '＋'}</button></div>
        {advanced && <div id="map-advanced-filters" className="map-advanced-filters"><label>{ui.allTypes}<select aria-label={ui.allTypes} value={category} onChange={(event) => { setCategory(event.target.value); setCount(12) }}><option value="">{ui.allTypes}</option>{content.worksCategories.map((entry) => <option key={entry}>{entry}</option>)}</select></label><label>{ui.authorLabel}<select aria-label={ui.authorLabel} value={author} onChange={(event) => { setAuthor(event.target.value); setCount(12) }}><option value="">{ui.allMembers}</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label></div>}
        {(topic || category || author) && <button type="button" className="collection-text-link" onClick={reset}>{exhibit.resetFilters} ×</button>}
        <div className="collection-map-grid">{filtered.slice(0, count).map(({ work, member, index }, i) => <article className="collection-map" key={work.id}>
          <button type="button" className="collection-map-cover" onClick={() => setLightboxIndex(i)} aria-label={`${ui.readMap} · ${work.title}`}><img src={work.image} alt={work.title} loading="lazy" /><span><b>READ MAP</b><small>{ui.readMap} ↗</small></span></button>
          <div className="collection-map-caption"><div>{index >= 0 ? <EditableText as="h3" value={work.title} path={`worksArchive.${index}.title`} /> : <h3>{work.title}</h3>}<p>{content.topics.find((entry) => entry.id === work.topic)?.name ?? work.category}</p></div>{member ? <button type="button" className="collection-byline" onClick={() => openAuthor(member.id)}><img src={member.avatar} alt="" loading="lazy" />{member.name} ↗</button> : <span>{work.author}</span>}</div>
        </article>)}</div>
        {!filtered.length && <p className="map-catalogue-empty">{ui.empty}</p>}
        <div className="collection-list-end"><p aria-live="polite">{exhibit.shownLabel} {Math.min(count, filtered.length)} / {filtered.length}</p>{filtered.length > 12 && <button type="button" className="map-expand" onClick={() => setCount(count >= filtered.length ? 12 : count + 12)}>{count >= filtered.length ? ui.collapse : ui.expand}</button>}</div>
      </div>
      <section className="collection-authors"><EditableText as="h2" value={exhibit.authorArchive} path="ui.exhibition.authorArchive" /><div className="author-dossier-grid">{members.map((member) => { const dossierWork = member.works?.find((work) => !isPortraitPlaceholderWork(work, member)) ?? (!isPortraitPlaceholderWork(member.work, member) ? member.work : null); return <button type="button" key={member.id} className="author-dossier" onClick={() => openAuthor(member.id)} aria-label={`${ui.authorPage} · ${member.name}`}><div className="author-dossier-folder">{dossierWork ? <img className="author-dossier-map" src={dossierWork.image} alt={dossierWork.title} loading="lazy" /> : <div className="author-dossier-pending"><span>作品档案</span><strong>作品图待补</strong><small>先浏览作者介绍 ↗</small></div>}<img className="author-dossier-portrait" src={member.avatar} alt="" loading="lazy" /><span>{ui.authorPage} ↗</span></div><h3>{member.name}</h3><p>{member.role}</p></button>})}</div></section>
    </div>
    {lightboxIndex !== null && <Lightbox images={images} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onIndexChange={setLightboxIndex} />}
  </section>
}
