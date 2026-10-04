import { useRef, useState } from 'react'
import EditableText from '../components/admin/EditableText'
import Lightbox from '../components/Lightbox'
import { useContent } from '../lib/contentStore'
import { NEWS_INDEX } from '../lib/pages'
import { requestScene } from '../lib/sceneBus'
import { useExhibitionMotion } from '../lib/useExhibitionMotion'
import { safePublicUrl } from '../lib/memberProfile'
import { CreativeButton, CreativeButtonLink } from '../components/ui/creative-button'

export default function ContestView() {
  const { content, admin } = useContent()
  const root = useRef<HTMLElement>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [reading, setReading] = useState<number | null>(null)
  const contest = content.contest
  const ui = content.ui.contest
  const works = contest.works ?? []
  const editions = [...new Set([...contest.editions.map((entry) => entry.edition), ...works.map((entry) => entry.edition)])]
  const active = selected && editions.includes(selected) ? selected : null
  const shown = works.map((work, index) => ({ work, index })).filter(({ work }) => !active || work.edition === active)
  const draft = /20XX|占位|获奖者一/.test(JSON.stringify(contest))
  const video = !/xxxxxx|占位/i.test(contest.videoUrl) ? safePublicUrl(contest.videoUrl) : null
  const images = shown.map(({ work }) => {
    const source = content.members.find((member) => member.work.image === work.image)
    return { src: source?.work.fullImage || work.image, title: work.title, author: work.author, desc: work.desc }
  })
  useExhibitionMotion(root, admin, `${active}-${shown.length}`)
  return <section ref={root} id="contest" aria-label={contest.title} data-scroll-root className="atlas-night editorial-page contest-archive h-full overflow-y-auto overflow-x-hidden"><div className="editorial-container">
    <CreativeButton direction="top" text={ui.back} onClick={() => requestScene(NEWS_INDEX)} />
    <header className="contest-header" data-exhibit-reveal><p className="linear-modal-kicker">{ui.kicker}</p><EditableText as="h1" value={contest.title} path="contest.title" className="editorial-title w-full max-w-6xl" /><EditableText as="p" value={contest.subtitle} path="contest.subtitle" className="reading-copy" /></header>
    {draft && <EditableText as="p" value={ui.draftNotice} path="ui.contest.draftNotice" className="archive-notice" />}
    <section className="contest-editions" aria-label={ui.editionsTitle}><EditableText as="h2" value={ui.editionsTitle} path="ui.contest.editionsTitle" /><div className="edition-ledger">{contest.editions.map((edition, i) => <article key={i} data-exhibit-reveal aria-label={`${edition.edition} · ${edition.year}`}><div><EditableText as="h3" value={edition.edition} path={`contest.editions.${i}.edition`} /><EditableText as="p" value={edition.year} path={`contest.editions.${i}.year`} /></div><dl><div><dt>{ui.participantsLabel}</dt><dd><EditableText value={edition.participants} path={`contest.editions.${i}.participants`} /></dd></div><div><dt>{ui.awardsLabel}</dt><dd><EditableText value={edition.awards} path={`contest.editions.${i}.awards`} /></dd></div></dl></article>)}</div></section>
    <section className="contest-gallery" aria-label={ui.worksTitle}><EditableText as="h2" value={ui.worksTitle} path="ui.contest.worksTitle" /><div className="journal-filter" role="group" aria-label={ui.filterLabel} aria-controls="contest-results">{[null, ...editions].map((edition) => <button type="button" key={edition ?? 'all'} aria-pressed={active === edition} onClick={() => { setSelected(edition); setReading(null) }}>{edition ?? ui.allEditions}<span aria-hidden="true">{edition ? works.filter((work) => work.edition === edition).length : works.length}</span></button>)}</div>
      <p className="reading-copy mt-4" role="status" aria-live="polite">{active ? `${active} · ` : ''}共 {shown.length} 幅优秀作品</p>
      <div id="contest-results" className="contest-map-grid">{shown.map(({ work, index }, i) => <article key={index} data-exhibit-reveal aria-label={`${work.title} · ${work.author}`}><button type="button" className="contest-map-cover" onClick={() => setReading(i)} aria-label={`${content.ui.works.readMap} · ${work.title}`}><img src={work.image} alt={work.title} loading="lazy" data-exhibit-image /><span>{content.ui.works.readMap} ↗</span></button><div className="contest-map-caption"><EditableText as="h3" value={work.title} path={`contest.works.${index}.title`} /><span>{work.edition}</span></div><EditableText as="p" value={work.author} path={`contest.works.${index}.author`} className="contest-map-author" /><EditableText as="p" multiline value={work.desc} path={`contest.works.${index}.desc`} className="reading-copy" />{/占位/.test(work.title + work.desc) && <p className="archive-sample-label">{ui.sampleWork}</p>}</article>)}</div>
      {!shown.length && <p className="journal-empty reading-copy" role="status">{ui.noWorks}</p>}
    </section>
    <div className="contest-colophon"><section aria-label={ui.winnersTitle}><EditableText as="h2" value={ui.winnersTitle} path="ui.contest.winnersTitle" />{contest.winners.filter((winner) => !active || winner.edition === active).map((winner) => { const index = contest.winners.indexOf(winner); return <div className="contest-winner" key={index}><EditableText as="h3" value={winner.edition} path={`contest.winners.${index}.edition`} /><div>{winner.names.map((name, i) => <EditableText key={i} as="p" value={name} path={`contest.winners.${index}.names.${i}`} />)}</div></div> })}</section><section data-exhibit-reveal aria-label={ui.rulesTitle}><EditableText as="h2" value={ui.rulesTitle} path="ui.contest.rulesTitle" /><EditableText as="p" multiline value={contest.rules} path="contest.rules" className="reading-copy" /></section></div>
    <footer className="journal-footer">{video ? <CreativeButtonLink text={ui.videoTitle} href={video} target="_blank" rel="noopener noreferrer" /> : <p className="reading-copy">{ui.videoPending}</p>}<CreativeButton direction="top" text={ui.back} onClick={() => requestScene(NEWS_INDEX)} /></footer>
  </div>{reading !== null && images[reading] && <Lightbox images={images} index={reading} onClose={() => setReading(null)} onIndexChange={setReading} />}</section>
}
