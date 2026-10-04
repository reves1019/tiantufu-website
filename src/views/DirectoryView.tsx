import { useRef, useState } from 'react'
import EditableText from '../components/admin/EditableText'
import { useContent } from '../lib/contentStore'
import { exhibitionCatalog } from '../lib/exhibitionCatalog'
import { useExhibitionMotion } from '../lib/useExhibitionMotion'
import { TOPIC_INDEX, WORKS_INDEX } from '../lib/pages'
import { setActiveTopicId } from '../lib/topicBus'
import { requestScene } from '../lib/sceneBus'
import { CreativeButton } from '../components/ui/creative-button'

export default function DirectoryView() {
  const { content, admin } = useContent()
  const root = useRef<HTMLElement>(null)
  const [active, setActive] = useState(content.topics[0]?.id ?? '')
  const maps = exhibitionCatalog(content.worksArchive, content.members, content.ui.member.representative)
  const ui = content.ui.exhibition
  useExhibitionMotion(root, admin, content.topics.length)
  return <section ref={root} id="directory" data-scroll-root className="atlas-night editorial-page relative h-full w-full overflow-y-auto overflow-x-hidden"><div className="editorial-container">
    <header className="editorial-centered"><h1 className="editorial-title mx-auto w-full max-w-6xl"><EditableText as="span" value={content.ui.directory.title} path="ui.directory.title" /></h1><EditableText as="p" value={ui.themeIntro} path="ui.exhibition.themeIntro" className="reading-copy" /></header>
    <div className="theme-galleries">{content.topics.map((topic, index) => {
      const works = maps.filter(({ work }) => work.topic === topic.id)
      const cover = works[0]?.work
      return <article key={topic.id} className={active === topic.id ? 'theme-gallery is-active' : 'theme-gallery'} onMouseEnter={() => setActive(topic.id)} onFocus={() => setActive(topic.id)} data-exhibit-reveal>
        <button type="button" className="theme-cover" onClick={() => { setActiveTopicId(topic.id); requestScene(TOPIC_INDEX) }} aria-label={ui.enterGallery + '：' + topic.name}>{cover ? <img src={cover.image} alt={cover.title} loading="lazy" /> : <span>{ui.empty}</span>}<span className="theme-cover-action"><b>ENTER GALLERY</b><small>{ui.enterGallery} ↗</small></span></button>
        <div className="theme-gallery-copy"><EditableText as="h2" value={topic.name} path={`topics.${index}.name`} /><EditableText as="p" multiline value={topic.desc} path={`topics.${index}.desc`} className="reading-copy" /><div className="editorial-keywords">{(topic.keywords ?? []).map((word, i) => <EditableText key={i} as="span" value={word} path={`topics.${index}.keywords.${i}`} />)}</div><span className="theme-map-count">{works.length} {ui.countUnit}</span></div>
      </article>
    })}</div>
    <footer className="editorial-end"><EditableText as="p" value={ui.manifesto} path="ui.exhibition.manifesto" /><CreativeButton text={ui.browseCatalogue} onClick={() => requestScene(WORKS_INDEX)} /></footer>
  </div></section>
}
