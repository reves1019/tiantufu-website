import EditableText from '../components/admin/EditableText'
import { useContent } from '../lib/contentStore'
import { CONTACT_INDEX } from '../lib/pages'
import { requestScene } from '../lib/sceneBus'

/** 版权与免责声明 */
export default function LegalView() {
  const { content } = useContent()
  const legal = content.legal

  return (
    <section id="legal" data-scroll-root className="relative h-full w-full overflow-y-auto">
      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-8 pb-12 pt-24 lg:px-12">
        <div className="scene-block flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-[0.5em] text-brand-400">E 120° · 16 · LEGAL · 声明</p>
            <EditableText
              as="h1"
              value={legal.title}
              path="legal.title"
              className="mt-3 w-full font-display text-5xl tracking-[0.12em] text-parchment-100 lg:text-6xl"
            />
            <EditableText
              as="p"
              value={legal.subtitle}
              path="legal.subtitle"
              className="mt-2 text-sm tracking-[0.2em] text-parchment-400"
            />
          </div>
          <button
            type="button"
            onClick={() => requestScene(CONTACT_INDEX)}
            className="rounded-md border border-white/15 bg-ink-950/55 px-6 py-2.5 text-sm tracking-[0.2em] text-parchment-100 backdrop-blur-sm transition-all duration-300 hover:border-brand-500/60 hover:text-brand-400"
          >
            ← 返回联系
          </button>
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
