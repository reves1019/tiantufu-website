import { useEffect, useRef, useState } from 'react'
import Lightbox from '../components/Lightbox'
import EditableText from '../components/admin/EditableText'
import { useContent } from '../lib/contentStore'
import { getActiveMemberId, setActiveMemberId } from '../lib/memberBus'
import { WORKS_INDEX } from '../lib/pages'
import { requestScene } from '../lib/sceneBus'
import { memberGallery } from '../lib/memberGallery'
import { isMemberPublished } from '../lib/publicCatalog'
import { memberDomains, safePublicUrl } from '../lib/memberProfile'
import { useExhibitionMotion } from '../lib/useExhibitionMotion'
import { CreativeButton, CreativeButtonLink } from '../components/ui/creative-button'
import { AccordionGallery } from '../components/ui/accordion-gallery'
import { clearSpotlight, updateSpotlight } from '../components/Spotlight'

export default function MemberView() {
  const { content, admin, account } = useContent()
  const root = useRef<HTMLElement>(null)
  const [activeId, setActiveId] = useState<string | null>(() => getActiveMemberId())
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  useEffect(() => {
    const onMember = (event: Event) => { setActiveId((event as CustomEvent).detail.id as string); setLightboxIndex(null); if (root.current) root.current.scrollTop = 0 }
    window.addEventListener('ttf-member', onMember)
    return () => window.removeEventListener('ttf-member', onMember)
  }, [])
  const memberIndex = content.members.findIndex((member) => member.id === activeId)
  const member = content.members[memberIndex]
  const exhibit = content.ui.exhibition
  const allowed = member && (admin || account?.memberId === member.id || isMemberPublished(member))
  const gallery = allowed ? memberGallery(member, memberIndex, content.worksArchive, admin || account?.memberId === member.id) : []
  const representative = gallery[0]
  const domains = member ? memberDomains(member).map((id) => content.topics.find((topic) => topic.id === id)?.name ?? id) : []
  const publicUrl = safePublicUrl(member?.publicUrl)
  useExhibitionMotion(root, admin, activeId ?? '')
  const images = gallery.map(({ work }) => ({ src: work.fullImage ?? work.image, title: work.title,
    desc: [work.desc.includes('占位') ? '' : work.desc,
      work.createdYear && `${exhibit.workCreated}：${work.createdYear}`,
      work.setting && `${exhibit.workSetting}：${work.setting}`,
      work.rights && `${exhibit.workRights}：${work.rights}`].filter(Boolean).join('\n'),
    story: work.story, author: member.name }))
  return <section ref={root} id="member" data-scroll-root className="atlas-night author-page relative h-full w-full overflow-x-hidden overflow-y-auto"><div className="author-page-inner">
    <CreativeButton direction="top" text={content.ui.member.backWorks} onClick={() => requestScene(WORKS_INDEX)} />
    {!allowed ? <p className="author-unavailable">{exhibit.memberUnavailable}</p> : <>
      <header className="author-page-header"><img src={member.avatar} alt="" /><div><EditableText as="h1" value={member.name} path={`members.${memberIndex}.name`} /><EditableText as="p" value={member.role} path={`members.${memberIndex}.role`} /></div><div className="author-page-tags">{(member.tags ?? []).map((tag, i) => <EditableText key={i} as="span" value={tag} path={`members.${memberIndex}.tags.${i}`} />)}</div></header>
      <div className="author-profile-facts">
        {domains.length > 0 && <div><EditableText as="h2" value={exhibit.memberDomains} path="ui.exhibition.memberDomains" /><p>{domains.join(' / ')}</p></div>}
        {([['societyRole', 'memberIdentity'], ['contactName', 'memberContactName'], ['joinedYear', 'memberJoined'], ['cooperation', 'memberCooperation']] as const).map(([key, label]) => (admin || member[key]) && <div key={key}><EditableText as="h2" value={exhibit[label]} path={`ui.exhibition.${label}`} /><EditableText as="p" value={member[key] ?? ''} path={`members.${memberIndex}.${key}`} /></div>)}
        {publicUrl && <CreativeButtonLink text={`${exhibit.memberPublicLink} ↗`} href={publicUrl} target="_blank" rel="noopener noreferrer" />}
      </div>
      {(admin || member.signature) && <EditableText as="p" multiline value={member.signature ?? ''} path={`members.${memberIndex}.signature`} className="author-signature" />}
      {representative ? <article className="author-representative"><button type="button" className="author-map-cover spotlight-surface" onPointerMove={updateSpotlight} onPointerLeave={clearSpotlight} onClick={() => setLightboxIndex(0)} aria-label={`${content.ui.works.readMap} · ${representative.work.title}`}><img src={representative.work.image} alt={representative.work.title} /><span>{content.ui.member.zoomHint} ↗</span></button><div className="author-map-caption"><EditableText as="h2" value={representative.work.title} path={representative.titlePath} />{(admin || !representative.work.desc.includes('占位')) && <EditableText as="p" multiline value={representative.work.desc} path={representative.descPath} className="reading-copy" />}</div></article> : <div className="author-work-pending"><span>WORK IN PROGRESS · 作品档案</span><h2>代表作图像待补</h2><p>{exhibit.noMemberWorks}</p></div>}
      {representative && <>
        <dl className="author-work-details">{([['createdYear', 'workCreated'], ['setting', 'workSetting'], ['rights', 'workRights']] as const).map(([key, label]) => (admin || representative.work[key]) && <div key={key}><dt><EditableText value={exhibit[label]} path={`ui.exhibition.${label}`} /></dt><dd><EditableText as="p" multiline value={representative.work[key] ?? ''} path={`${representative.path}.${key}`} /></dd></div>)}</dl>
        {(admin || representative.work.story) && <section className="author-statement" data-exhibit-reveal><EditableText as="h2" value={exhibit.workStory} path="ui.exhibition.workStory" /><EditableText as="p" multiline value={representative.work.story ?? ''} path={`${representative.path}.story`} className="reading-copy" /></section>}
      </>}
      {(admin || (member.bio && !member.bio.includes('占位'))) && <section className="author-statement"><EditableText as="h2" value={exhibit.memberStory} path="ui.exhibition.memberStory" /><EditableText as="p" multiline value={member.bio} path={`members.${memberIndex}.bio`} className="reading-copy" /></section>}
      {gallery.length > 1 && <section className="author-collection" data-exhibit-reveal>
        <div className="author-collection-heading">
          <EditableText as="h2" value={exhibit.memberCollection} path="ui.exhibition.memberCollection" />
          <EditableText as="p" value={exhibit.memberCollectionHint} path="ui.exhibition.memberCollectionHint" />
        </div>
        <AccordionGallery
          items={gallery.slice(1).map(({ work, id }) => ({
            id,
            title: work.title,
            image: work.fullImage ?? work.image,
            meta: [work.category, content.topics.find((topic) => topic.id === work.topic)?.name ?? work.topic].filter(Boolean).join(' · '),
          }))}
          onOpen={(index) => setLightboxIndex(index + 1)}
          label={`${member.name} · ${exhibit.memberCollection}`}
        />
      </section>}
      <nav className="author-related" aria-label={exhibit.authorArchive}>{content.members.filter((entry) => isMemberPublished(entry) && entry.id !== member.id).map((entry) => <button key={entry.id} type="button" onClick={() => setActiveMemberId(entry.id)}><img src={entry.avatar} alt="" loading="lazy" /><span>{entry.name} ↗</span></button>)}</nav>
    </>}
  </div>{lightboxIndex !== null && <Lightbox images={images} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onIndexChange={setLightboxIndex} />}</section>
}
