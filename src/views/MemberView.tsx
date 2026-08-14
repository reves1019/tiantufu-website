import { useEffect, useState } from 'react'
import ImageTrail from '../components/ImageTrail'
import LetterSwap from '../components/LetterSwap'
import TiltCard from '../components/TiltCard'
import EditableText from '../components/admin/EditableText'
import { useContent } from '../lib/contentStore'
import { getActiveMemberId } from '../lib/memberBus'
import { WORKS_INDEX } from '../lib/pages'
import { requestScene } from '../lib/sceneBus'

/** 成员个人页：头像 + 简介 + 一张代表作，返回作品集 */
export default function MemberView() {
  const { content, admin } = useContent()
  const members = content.members
  const [activeId, setActiveId] = useState<string | null>(() => getActiveMemberId())
  const [previewSlot, setPreviewSlot] = useState(-1)

  useEffect(() => {
    const onMember = (event: Event) => {
      setActiveId((event as CustomEvent).detail.id as string)
    }
    window.addEventListener('ttf-member', onMember)
    return () => window.removeEventListener('ttf-member', onMember)
  }, [])

  const memberIndex = Math.max(0, members.findIndex((m) => m.id === activeId))
  const member = members[memberIndex]

  if (!member) return null

  const gallery = [member.work, ...(member.works ?? [])]
  const preview = previewSlot >= 0 ? (member.works?.[previewSlot] ?? member.work) : member.work
  const previewTitlePath = previewSlot >= 0 ? `members.${memberIndex}.works.${previewSlot}.title` : `members.${memberIndex}.work.title`
  const previewDescPath = previewSlot >= 0 ? `members.${memberIndex}.works.${previewSlot}.desc` : `members.${memberIndex}.work.desc`

  return (
    <section id="member" data-scroll-root className="relative h-full w-full overflow-y-auto">
      {/* 图片鼠标轨迹 */}
      <ImageTrail images={[member.avatar, member.work.image]} />

      <div className="relative z-10 mx-auto grid w-full max-w-[1700px] items-center gap-12 px-8 pb-12 pt-24 lg:grid-cols-[0.9fr_1.1fr] lg:px-12">
        {/* 左列：成员信息 */}
        <div className="scene-block">
          <p className="font-mono text-xs tracking-[0.5em] text-brand-400">E 120° · 07 · MEMBER · 成员个人页</p>

          <div className="relative mt-8 h-44 w-44">
            <div className="absolute inset-0 rounded-full bg-brand-500/25 blur-2xl" />
            <img
              src={member.avatar}
              alt={member.name}
              className="relative h-full w-full rounded-full border border-brand-500/60 object-cover shadow-[0_0_34px_rgba(199,27,27,0.35)]"
            />
          </div>

          {admin ? (
            <EditableText
              as="h1"
              value={member.name}
              path={`members.${memberIndex}.name`}
              className="mt-6 w-full font-display text-5xl tracking-[0.14em] text-parchment-100"
            />
          ) : (
            <LetterSwap
              as="h1"
              text={member.name}
              className="mt-6 font-display text-5xl tracking-[0.14em] text-parchment-100"
            />
          )}
          <EditableText
            as="p"
            value={member.role}
            path={`members.${memberIndex}.role`}
            className="mt-3 w-full font-mono text-sm tracking-[0.3em] text-brand-400"
          />
          {(member.tags ?? []).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {(member.tags ?? []).map((tag, i) => (
                <EditableText
                  key={`${tag}-${i}`}
                  as="span"
                  value={tag}
                  path={`members.${memberIndex}.tags.${i}`}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[10px] tracking-[0.15em] text-parchment-400"
                />
              ))}
            </div>
          )}
          <EditableText
            as="p"
            multiline
            value={member.bio}
            path={`members.${memberIndex}.bio`}
            className="mt-6 max-w-md text-sm leading-relaxed text-parchment-300"
          />

          <button
            type="button"
            onClick={() => requestScene(WORKS_INDEX)}
            className="mt-10 inline-flex items-center gap-3 rounded-md border border-white/15 bg-ink-950/55 px-7 py-3 text-sm tracking-[0.22em] text-parchment-100 backdrop-blur-sm transition-all duration-300 hover:border-brand-500/60 hover:text-brand-400"
          >
            ← 返回作品集
          </button>
        </div>

        {/* 右列：代表作 */}
        <div className="scene-block">
          <p className="font-mono text-xs tracking-[0.5em] text-parchment-500">
            REPRESENTATIVE WORK · 代表作
          </p>

          <div className="relative mt-6 overflow-hidden rounded-lg border border-white/12 bg-ink-950/50 shadow-[0_0_44px_rgba(199,27,27,0.18)]">
            {/* 古地图边框装饰 */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-2 z-10 border border-brand-500/25" />
            <img
              src={preview.image}
              alt={preview.title}
              className="h-[min(52vh,560px)] w-full object-cover object-center"
            />
          </div>

          {admin ? (
            <EditableText
              as="h2"
              value={preview.title}
              path={previewTitlePath}
              className="mt-6 w-full font-display text-3xl tracking-[0.16em] text-parchment-100"
            />
          ) : (
            <LetterSwap
              as="h2"
              text={preview.title}
              className="mt-6 font-display text-3xl tracking-[0.16em] text-parchment-100"
            />
          )}
          <EditableText
            as="p"
            multiline
            value={preview.desc}
            path={previewDescPath}
            className="mt-3 max-w-xl text-sm leading-relaxed text-parchment-300"
          />

          {/* 更多作品：点击切换上方大图预览 */}
          {gallery.length > 1 && (
            <div className="mt-7 grid grid-cols-3 gap-3">
              {gallery.map((work, i) => {
                const slot = i === 0 ? -1 : i - 1
                const active = previewSlot === slot
                return (
                  <TiltCard key={`${work.title}-${i}`} className="h-full" maxTilt={4}>
                    <button
                      type="button"
                      onClick={() => setPreviewSlot(slot)}
                      className={`group relative block h-full w-full overflow-hidden rounded-md border text-left transition-all duration-300 ${
                        active
                          ? 'border-brand-500/70 shadow-[0_0_18px_rgba(199,27,27,0.35)]'
                          : 'border-white/10 hover:border-brand-500/50'
                      }`}
                    >
                      <img
                        src={work.image}
                        alt={work.title}
                        loading="lazy"
                        className="aspect-[4/3] w-full bg-ink-900 object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/85 to-transparent px-2 pb-1 pt-4 font-mono text-[9px] tracking-[0.1em] text-parchment-200">
                        {i === 0 ? '代表作' : `延伸 ${String(i).padStart(2, '0')}`}
                      </span>
                    </button>
                  </TiltCard>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
