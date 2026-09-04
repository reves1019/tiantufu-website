import EditableText from '../components/admin/EditableText'
import { useContent } from '../lib/contentStore'
import { ABOUT_INDEX } from '../lib/pages'
import { requestScene } from '../lib/sceneBus'

/** 社团文化子页：文化理念与活动（占位） */
export default function CultureView() {
  const { content } = useContent()
  const culture = content.about.culture

  return (
    <section id="culture" data-scroll-root className="relative h-full w-full overflow-y-auto">
      <div className="relative z-10 mx-auto w-full max-w-[1700px] px-8 pb-12 pt-24 lg:px-12">
        <div className="scene-block">
          <p className="font-mono text-xs tracking-[0.5em] text-brand-400">E 120° · 09 · CULTURE · 社团文化</p>
          <h1 className="mt-4 font-display text-5xl tracking-[0.14em] text-parchment-100 lg:text-6xl">
            {content.ui.culture.title}
          </h1>
          <p className="mt-3 text-sm tracking-[0.2em] text-parchment-400">{content.ui.culture.subtitle}</p>
        </div>

        <div className="scene-block mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {culture.map((item, i) => (
            <div
              key={item.title}
              className="rounded-lg border border-white/10 bg-ink-950/45 p-6 backdrop-blur-sm transition-colors duration-300 hover:border-brand-500/50"
            >
              <p className="font-mono text-[10px] text-brand-400">{String(i + 1).padStart(2, '0')}</p>
              <EditableText as="h3" value={item.title} path={`about.culture.${i}.title`} className="mt-2 text-lg tracking-[0.1em] text-parchment-100" />
              <EditableText as="p" multiline value={item.desc} path={`about.culture.${i}.desc`} className="mt-2 text-sm leading-relaxed text-parchment-500" />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => requestScene(ABOUT_INDEX)}
          className="scene-block mt-10 rounded-md border border-white/15 bg-ink-950/55 px-7 py-3 text-sm tracking-[0.2em] text-parchment-100 backdrop-blur-sm transition-all duration-300 hover:border-brand-500/60 hover:text-brand-400"
        >
          {content.ui.culture.backAbout}
        </button>
      </div>
    </section>
  )
}
