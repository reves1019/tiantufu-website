import { useState } from 'react'
import EditableText from '../components/admin/EditableText'
import Lightbox from '../components/Lightbox'
import { useContent } from '../lib/contentStore'
import { EARTH_INDEX } from '../lib/pages'
import { requestScene } from '../lib/sceneBus'
import { isMemberPublished } from '../lib/publicCatalog'
import { CreativeButton } from '../components/ui/creative-button'

/** 数码地球随机作品页：随机展示一位作者的某张作品，返回数码地球 */
export default function WorkView() {
  const { content } = useContent()
  const members = content.members
  const [index] = useState(() => {
    const published = members.map((member, index) => ({ member, index })).filter(({ member }) => isMemberPublished(member))
    return published.length ? published[Math.floor(Math.random() * published.length)].index : -1
  })
  const [zoom, setZoom] = useState(false)
  const member = index >= 0 ? members[index] : undefined

  if (!member) return null

  return (
    <section id="work" data-scroll-root className="relative h-full w-full overflow-y-auto">
      <div className="relative z-10 mx-auto grid w-full max-w-[1700px] items-center gap-12 px-8 pb-12 pt-24 lg:grid-cols-[0.9fr_1.1fr] lg:px-12">
        {/* 作者信息 */}
        <div className="scene-block">
          <p className="font-mono text-xs tracking-[0.5em] text-brand-400">{content.ui.work.kicker}</p>
          <div className="relative mt-8 h-44 w-44">
            <div className="absolute inset-0 rounded-full bg-brand-500/25 blur-2xl" />
            <img
              src={member.avatar}
              alt={member.name}
              className="relative h-full w-full rounded-full border border-brand-500/60 object-cover shadow-[0_0_34px_rgba(199,27,27,0.35)]"
            />
          </div>
          <EditableText
            as="h1"
            value={member.name}
            path={`members.${index}.name`}
            className="mt-6 w-full font-display text-5xl tracking-[0.14em] text-parchment-100"
          />
          <EditableText
            as="p"
            value={member.role}
            path={`members.${index}.role`}
            className="mt-3 w-full font-mono text-sm tracking-[0.3em] text-brand-400"
          />
          <EditableText
            as="p"
            multiline
            value={member.bio}
            path={`members.${index}.bio`}
            className="mt-6 max-w-md text-sm leading-relaxed text-parchment-300"
          />
          <CreativeButton
            className="mt-10"
            direction="top"
            text={content.ui.work.backEarth}
            onClick={() => requestScene(EARTH_INDEX)}
          />
        </div>

        {/* 随机作品 */}
        <div className="scene-block">
          <p className="font-mono text-xs tracking-[0.5em] text-parchment-500">{content.ui.work.sectionKicker}</p>
          <button
            type="button"
            onClick={() => setZoom(true)}
            aria-label={`${content.ui.work.zoomAriaPrefix}${member.work.title}${content.ui.work.zoomAriaSuffix}`}
            className="group relative mt-6 block w-full cursor-zoom-in overflow-hidden rounded-lg border border-white/12 bg-ink-950/50 text-left shadow-[0_0_44px_rgba(199,27,27,0.18)] transition-colors duration-300 hover:border-brand-500/50"
          >
            <div aria-hidden="true" className="pointer-events-none absolute inset-2 z-10 border border-brand-500/25" />
            <img
              src={member.work.image}
              alt={member.work.title}
              className="h-[min(52vh,560px)] w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.02]"
            />
            <span className="pointer-events-none absolute bottom-4 right-4 z-20 rounded-full border border-white/15 bg-ink-950/75 px-3.5 py-1.5 font-mono text-[10px] tracking-[0.2em] text-parchment-200 opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100">
              {content.ui.member.zoomHint}
            </span>
          </button>
          <EditableText
            as="h2"
            value={member.work.title}
            path={`members.${index}.work.title`}
            className="mt-6 w-full font-display text-3xl tracking-[0.16em] text-parchment-100"
          />
          <EditableText
            as="p"
            multiline
            value={member.work.desc}
            path={`members.${index}.work.desc`}
            className="mt-3 max-w-xl text-sm leading-relaxed text-parchment-300"
          />
        </div>
      </div>
      {zoom && (
        <Lightbox
          images={[{ src: member.work.image, title: member.work.title, desc: member.work.desc }]}
          index={0}
          onClose={() => setZoom(false)}
        />
      )}
    </section>
  )
}
