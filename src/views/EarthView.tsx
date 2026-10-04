import { useMemo, useState } from 'react'
import Lightbox from '../components/Lightbox'
import EditableText from '../components/admin/EditableText'
import KeywordAdminPanel from '../components/admin/KeywordAdminPanel'
import { useContent } from '../lib/contentStore'
import { exhibitionCatalog } from '../lib/exhibitionCatalog'
import { catalogueImage } from '../lib/catalogueImage'
import { setActiveMemberId } from '../lib/memberBus'
import { MEMBER_INDEX } from '../lib/pages'
import { requestScene } from '../lib/sceneBus'
import { clearSpotlight, updateSpotlight } from '../components/Spotlight'

export default function EarthView() {
  const { content, admin } = useContent()
  const ui = content.ui.exhibition
  const maps = useMemo(() => exhibitionCatalog(content.worksArchive, content.members, content.ui.member.representative), [content.worksArchive, content.members, content.ui.member.representative])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const [filter, setFilter] = useState('')
  const filtered = maps.filter(({ work, member }) => !filter || (work.topic || member?.topic) === filter)
  const selected = filtered.findIndex(({ work }) => work.id === selectedId)
  const activeIndex = Math.max(0, selected)
  const active = filtered[activeIndex]
  const images = filtered.map(catalogueImage)
  const railHint = ui.railHint.includes('拖动') ? '点击缩略图选择地图 · 方向键切换' : ui.railHint

  const move = (direction: number) => {
    if (!filtered.length) return
    setSelectedId(filtered[(activeIndex + direction + filtered.length) % filtered.length].work.id)
  }
  return <section id="earth" className="exhibit-page explore-page relative h-full w-full overflow-y-auto overflow-x-hidden" data-scroll-root>
    <div className="exhibit-container">
      <header className="explore-heading"><div><EditableText as="h1" value={ui.exploreTitle} path="ui.exhibition.exploreTitle" /><EditableText as="p" value={ui.exploreIntro} path="ui.exhibition.exploreIntro" multiline /></div>
        <div className="explore-count" aria-live="polite">{filtered.length ? String(activeIndex + 1).padStart(2, '0') : '00'} / {String(filtered.length).padStart(2, '0')}</div>
      </header>
      <div className="explore-filters" role="group" aria-label={content.ui.works.allTopics}>
        <button type="button" aria-pressed={!filter} onClick={() => setFilter('')}>{content.ui.works.filterAll}</button>
        {content.topics.map(topic => <button key={topic.id} type="button" aria-pressed={filter === topic.id} onClick={() => setFilter(topic.id)}>{topic.name}</button>)}
      </div>
      {active ? <figure className="explore-stage">
        <button key={active.work.id} type="button" className="explore-image" onClick={() => setReading(true)} aria-label={ui.readMap + '：' + active.work.title}><img src={active.work.image} alt={active.work.title} /><span className="exhibit-image-action">{ui.readMap} ↗</span></button>
        <figcaption><div><h2>{active.work.title}</h2>{active.member ? <button type="button" className="exhibit-text-link" onClick={() => { setActiveMemberId(active.member!.id); requestScene(MEMBER_INDEX) }}>{active.work.author} ↗</button> : <p>{active.work.author}</p>}</div>
          <div className="explore-arrows"><button type="button" aria-label={ui.previousMap} disabled={filtered.length < 2} onClick={() => move(-1)}><span className="explore-arrow-label">PREV MAP</span><span aria-hidden="true">←</span></button><button type="button" aria-label={ui.nextMap} disabled={filtered.length < 2} onClick={() => move(1)}><span className="explore-arrow-label">NEXT MAP</span><span aria-hidden="true">→</span></button></div>
        </figcaption>
      </figure> : <p role="status" aria-live="polite" className="exhibit-empty">{ui.empty}</p>}
      <p className="explore-hint">{railHint}</p>
      <div className="explore-rail" role="group" aria-label={ui.selectMap}
        onKeyDown={(event) => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1) } }}>
        {filtered.map(({ work }, index) => <button key={work.id} type="button" aria-pressed={activeIndex === index} onClick={() => setSelectedId(work.id)} onPointerMove={updateSpotlight} onPointerLeave={clearSpotlight} className="explore-thumbnail spotlight-surface"><img src={work.image} alt="" loading="lazy" draggable={false} /><span>{work.title}</span><small>{work.author}</small></button>)}
      </div>
      {admin && <KeywordAdminPanel />}
    </div>
    {reading && active && <Lightbox images={images} index={activeIndex} onIndexChange={(index) => setSelectedId(filtered[index].work.id)} onClose={() => setReading(false)} />}
  </section>
}
