import EditableText from '../components/admin/EditableText'
import { useContent } from '../lib/contentStore'
import { CONTACT_INDEX } from '../lib/pages'
import { requestScene } from '../lib/sceneBus'
import { CreativeButton } from '../components/ui/creative-button'

/** 版权与免责声明 */
export default function LegalView() {
  const { content } = useContent()
  const legal = content.legal
  const ui = content.ui.legal

  return (
    <section id="legal" data-scroll-root className="relative h-full w-full overflow-y-auto">
      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-8 pb-12 pt-24 lg:px-12">
        <div className="scene-block flex flex-wrap items-start justify-between gap-4">
          <div>
            <EditableText as="p" value={ui.kicker} path="ui.legal.kicker" className="font-mono text-xs tracking-[0.5em] text-brand-400" />
            <EditableText
              as="h1"
              value={legal.title}
              path="legal.title"
              className="mt-3 w-full font-display text-4xl tracking-[0.12em] text-parchment-100 sm:text-5xl lg:text-6xl"
            />
            <EditableText
              as="p"
              value={legal.subtitle}
              path="legal.subtitle"
              className="mt-2 text-sm tracking-[0.2em] text-parchment-400"
            />
          </div>
          <CreativeButton
            direction="top"
            text={<EditableText as="span" value={ui.backContact} path="ui.legal.backContact" />}
            onClick={() => requestScene(CONTACT_INDEX)}
          />
        </div>

        <div className="scene-block mt-10 grid gap-4 md:grid-cols-2">
          {legal.sections.map((section, i) => (
            <div key={i} className="rounded-lg border border-white/10 bg-ink-950/45 p-6 backdrop-blur-sm">
              <EditableText as="h2" value={section.title} path={`legal.sections.${i}.title`} className="font-display text-xl tracking-[0.12em] text-parchment-100" />
              <EditableText as="p" multiline value={section.body} path={`legal.sections.${i}.body`} className="mt-3 text-sm leading-relaxed text-parchment-400" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
