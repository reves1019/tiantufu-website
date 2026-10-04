import Magnetic from '../components/Magnetic'
import EditableText from '../components/admin/EditableText'
import { useContent } from '../lib/contentStore'
import { CONTACT_INDEX } from '../lib/pages'
import { requestScene } from '../lib/sceneBus'
import { CreativeButton, CreativeButtonLink } from '../components/ui/creative-button'

/** 加入我们：招新公告 / 入社条件 / 申请流程 / 申请入口 */
export default function JoinView() {
  const { content } = useContent()
  const join = content.join
  const qqGroup = content.site.contact.qqGroup
  const ui = content.ui.join

  return (
    <section id="join" data-scroll-root className="relative h-full w-full overflow-y-auto">
      <div className="relative z-10 mx-auto w-full max-w-[1700px] px-8 pb-12 pt-24 lg:px-12">
        <div className="scene-block flex flex-wrap items-start justify-between gap-4">
          <div>
            <EditableText as="p" value={ui.kicker} path="ui.join.kicker" className="font-mono text-xs tracking-[0.5em] text-brand-400" />
            <EditableText
              as="h1"
              value={join.title}
              path="join.title"
              className="mt-3 w-full font-display text-4xl tracking-[0.12em] text-parchment-100 sm:text-5xl lg:text-6xl"
            />
            <EditableText
              as="p"
              value={join.subtitle}
              path="join.subtitle"
              className="mt-2 text-sm tracking-[0.2em] text-parchment-400"
            />
          </div>
          <CreativeButton
            direction="top"
            text={<EditableText as="span" value={ui.backContact} path="ui.join.backContact" />}
            onClick={() => requestScene(CONTACT_INDEX)}
          />
        </div>

        <EditableText
          as="p"
          multiline
          value={join.intro}
          path="join.intro"
          className="scene-block mt-8 max-w-3xl text-sm leading-relaxed text-parchment-300"
        />

        {/* 入社条件 */}
        <div className="scene-block mt-10">
          <EditableText
            as="h2"
            value={join.requirementsTitle}
            path="join.requirementsTitle"
            className="font-mono text-xs tracking-[0.35em] text-brand-400"
          />
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {join.requirements.map((item, i) => (
              <div key={i} className="rounded-lg border border-white/10 bg-ink-950/45 p-5 backdrop-blur-sm">
                <p className="font-mono text-[10px] text-brand-400">0{i + 1}</p>
                <EditableText as="p" multiline value={item} path={`join.requirements.${i}`} className="mt-2 text-sm leading-relaxed text-parchment-300" />
              </div>
            ))}
          </div>
        </div>

        {/* 申请流程 */}
        <div className="scene-block mt-10">
          <EditableText
            as="h2"
            value={join.processTitle}
            path="join.processTitle"
            className="font-mono text-xs tracking-[0.35em] text-brand-400"
          />
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {join.process.map((item, i) => (
              <div key={i} className="rounded-lg border border-white/10 bg-ink-950/45 p-5 backdrop-blur-sm">
                <EditableText as="p" value={item.step} path={`join.process.${i}.step`} className="font-mono text-xs tracking-[0.2em] text-brand-400" />
                <EditableText as="p" multiline value={item.desc} path={`join.process.${i}.desc`} className="mt-2 text-sm leading-relaxed text-parchment-300" />
              </div>
            ))}
          </div>
        </div>

        {/* 申请入口 */}
        <div className="scene-block mt-10 flex flex-wrap items-center gap-6 rounded-xl border border-brand-500/30 bg-ink-950/60 p-6 backdrop-blur-sm">
          <Magnetic>
            <CreativeButton
              text={<EditableText as="span" value={ui.register} path="ui.join.register" />}
              onClick={() => window.dispatchEvent(new CustomEvent('ttf-gate-register'))}
            />
          </Magnetic>
          <Magnetic>
            <CreativeButtonLink text={<EditableText as="span" value={ui.joinGroup} path="ui.join.joinGroup" />} href={`tencent://group/pa?cmd=2&uin=${qqGroup}`} />
          </Magnetic>
          <EditableText as="p" multiline value={join.contactNote} path="join.contactNote" className="max-w-xl text-sm leading-relaxed text-parchment-400" />
          <p className="w-full font-mono text-[10px] tracking-[0.15em] text-parchment-500">
            <EditableText as="span" value={ui.reviewNote} path="ui.join.reviewNote" />
          </p>
        </div>
      </div>
    </section>
  )
}
