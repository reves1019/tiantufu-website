import { useState } from 'react'
import EditableText from '../components/admin/EditableText'
import { useContent } from '../lib/contentStore'
import { CONTACT_INDEX } from '../lib/pages'
import { requestScene } from '../lib/sceneBus'

/** 常见问题：手风琴式 Q&A */
export default function FaqView() {
  const { content } = useContent()
  const faq = content.faq
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" data-scroll-root className="relative h-full w-full overflow-y-auto">
      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-8 pb-12 pt-24 lg:px-12">
        <div className="scene-block flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-[0.5em] text-brand-400">E 120° · 15 · FAQ · 常见问题</p>
            <EditableText
              as="h1"
              value={faq.title}
              path="faq.title"
              className="mt-3 w-full font-display text-5xl tracking-[0.12em] text-parchment-100 lg:text-6xl"
            />
            <EditableText
              as="p"
              value={faq.subtitle}
              path="faq.subtitle"
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

        <div className="scene-block mt-10 space-y-3">
          {faq.items.map((item, i) => {
            const isOpen = open === i
            return (
              <div key={i} className={`overflow-hidden rounded-lg border backdrop-blur-sm transition-colors duration-300 ${isOpen ? 'border-brand-500/50 bg-ink-950/60' : 'border-white/10 bg-ink-950/45 hover:border-brand-500/30'}`}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <EditableText as="span" value={item.category} path={`faq.items.${i}.category`} className="shrink-0 rounded-sm bg-brand-500/15 px-2 py-0.5 font-mono text-[10px] tracking-[0.2em] text-brand-400" />
                  <EditableText as="span" value={item.q} path={`faq.items.${i}.q`} className="flex-1 text-sm tracking-[0.08em] text-parchment-100" />
                  <span className={`ml-auto shrink-0 font-mono text-lg text-brand-400 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}>+</span>
                </button>
                <div className={`grid transition-all duration-300 ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <EditableText as="p" multiline value={item.a} path={`faq.items.${i}.a`} className="px-5 pb-4 text-sm leading-relaxed text-parchment-400" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
