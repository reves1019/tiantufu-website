import { useRef, useState } from 'react'
import EditableText from '../components/admin/EditableText'
import { useContent } from '../lib/contentStore'
import { ABOUT_INDEX, JOIN_INDEX } from '../lib/pages'
import { requestScene } from '../lib/sceneBus'
import { useExhibitionMotion } from '../lib/useExhibitionMotion'
import { exhibitionCatalog } from '../lib/exhibitionCatalog'
import { CreativeButton } from '../components/ui/creative-button'
import { ImageFlow } from '../components/lab/AtlasInteractions'
import Lightbox from '../components/Lightbox'
import { catalogueImage } from '../lib/catalogueImage'

export default function CultureView() {
  const { content, admin } = useContent()
  const root = useRef<HTMLElement>(null)
  const [opened, setOpened] = useState<number | null>(0)
  const [reading, setReading] = useState<number | null>(null)
  const ui = content.ui.culture
  const maps = exhibitionCatalog(content.worksArchive, content.members, '地图')
  const featured = maps.slice(0, 3)
  useExhibitionMotion(root, admin, opened ?? -1)
  return <section ref={root} id="culture" data-scroll-root className="atlas-night editorial-page h-full overflow-y-auto overflow-x-hidden"><div className="editorial-container">
    <button className="collection-text-link" onClick={() => requestScene(ABOUT_INDEX)}>{ui.backAbout}</button>
    <header className="journal-header culture-header"><div><EditableText as="h1" value={ui.title} path="ui.culture.title" className="editorial-title w-full max-w-6xl" /><EditableText as="p" multiline value={ui.subtitle} path="ui.culture.subtitle" className="reading-copy" /></div>{featured.length > 0 && <div className="culture-map-browser"><ImageFlow label="社团文化地图" items={featured.map(({ work }) => ({ id: work.id, title: work.title, image: work.image, alt: work.title, author: work.author, color: '#3d5041' }))} openLabel={content.ui.works.readMap} onOpen={id => { const index = featured.findIndex(({ work }) => work.id === id); if (index >= 0) setReading(index) }} /></div>}</header>
    <div className="culture-ledger">{content.about.culture.map((item, i) => { const isOpen = opened === i || admin; return <article key={i} className={`culture-entry ${isOpen ? 'is-open' : ''}`}><h2><button aria-expanded={isOpen} aria-controls={`culture-body-${i}`} onClick={() => setOpened(opened === i ? null : i)}><span>{item.title}</span><span aria-hidden="true">{isOpen ? '−' : '+'}</span></button></h2>{admin && <EditableText value={item.title} path={`about.culture.${i}.title`} />}<div className="culture-entry-reveal" id={`culture-body-${i}`} ref={(element) => { if (element) element.inert = !isOpen }} aria-hidden={!isOpen}><div><EditableText as="p" multiline value={item.desc} path={`about.culture.${i}.desc`} className="reading-copy" /></div></div></article> })}</div>
    <footer className="journal-footer" data-exhibit-reveal><CreativeButton text={content.ui.contact.joinCard} onClick={() => requestScene(JOIN_INDEX)} /><CreativeButton direction="top" text={ui.backAbout} onClick={() => requestScene(ABOUT_INDEX)} /></footer>
  </div>{reading !== null && featured[reading] && <Lightbox images={featured.map(catalogueImage)} index={reading} onClose={() => setReading(null)} onIndexChange={setReading} />}</section>
}
