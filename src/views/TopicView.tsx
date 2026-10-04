import { useEffect, useRef, useState } from 'react'
import Lightbox from '../components/Lightbox'
import EditableText from '../components/admin/EditableText'
import { useContent } from '../lib/contentStore'
import { DIRECTORY_INDEX, MEMBER_INDEX } from '../lib/pages'
import { setActiveMemberId } from '../lib/memberBus'
import { getActiveTopicId } from '../lib/topicBus'
import { requestScene } from '../lib/sceneBus'
import { exhibitionCatalog } from '../lib/exhibitionCatalog'
import { catalogueImage } from '../lib/catalogueImage'
import { useExhibitionMotion } from '../lib/useExhibitionMotion'
import { CreativeButton } from '../components/ui/creative-button'

export default function TopicView() {
  const { content, admin } = useContent()
  const root = useRef<HTMLElement>(null)
  const [activeId, setActiveId] = useState<string | null>(() => getActiveTopicId())
  const [reading, setReading] = useState<number | null>(null)
  useEffect(() => {
    const onTopic = (event: Event) => { setActiveId((event as CustomEvent).detail.id as string); setReading(null); if (root.current) root.current.scrollTop = 0 }
    window.addEventListener('ttf-topic', onTopic)
    return () => window.removeEventListener('ttf-topic', onTopic)
  }, [])
  const index = content.topics.findIndex((entry) => entry.id === activeId)
  const topic = content.topics[index]
  const maps = exhibitionCatalog(content.worksArchive, content.members, content.ui.member.representative).filter(({ work }) => work.topic === topic?.id)
  useExhibitionMotion(root, admin, `${activeId}-${maps.length}`)
  return <section ref={root} id="topic" data-scroll-root className="atlas-night editorial-page relative h-full w-full overflow-y-auto overflow-x-hidden"><div className="editorial-container">
    <CreativeButton direction="top" text={content.ui.topic.backDirectory} onClick={() => requestScene(DIRECTORY_INDEX)} />
    {!topic ? <p className="author-unavailable">{content.ui.exhibition.themeUnavailable}</p> : <>
      <header className="topic-reading-header"><EditableText as="h1" value={topic.name} path={`topics.${index}.name`} className="editorial-title w-full max-w-6xl" /><div><EditableText as="p" multiline value={topic.desc} path={`topics.${index}.desc`} className="reading-copy" /><div className="editorial-keywords">{(topic.keywords ?? []).map((word, i) => <EditableText key={i} as="span" value={word} path={`topics.${index}.keywords.${i}`} />)}</div></div></header>
      <div className="collection-section-title"><EditableText as="h2" value={content.ui.topic.worksAuthors} path="ui.topic.worksAuthors" /><span className="collection-count">{maps.length} {content.ui.exhibition.countUnit}</span></div>
      <div className={`collection-map-grid ${maps.length === 1 ? 'topic-single-map' : ''}`}>{maps.map(({ work, member, index: workIndex }, i) => <article className="collection-map" key={work.id} data-exhibit-reveal><button type="button" className="collection-map-cover" aria-label={content.ui.works.readMap + ' · ' + work.title} onClick={() => setReading(i)}><img src={work.image} alt={work.title} loading="lazy" /><span>{content.ui.works.readMap} ↗</span></button><div className="collection-map-caption"><div>{workIndex >= 0 ? <EditableText as="h3" value={work.title} path={`worksArchive.${workIndex}.title`} /> : <h3>{work.title}</h3>}<p>{work.category}</p></div>{member ? <button type="button" className="collection-byline" onClick={() => { setActiveMemberId(member.id); requestScene(MEMBER_INDEX) }}><img src={member.avatar} alt="" loading="lazy" />{member.name} ↗</button> : <span>{work.author}</span>}</div></article>)}</div>
      {!maps.length && <EditableText as="p" value={content.ui.topic.empty} path="ui.topic.empty" className="exhibit-empty" />}
    </>}
  </div>{reading !== null && <Lightbox images={maps.map(catalogueImage)} index={reading} onClose={() => setReading(null)} onIndexChange={setReading} />}</section>
}
