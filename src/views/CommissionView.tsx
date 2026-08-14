import Magnetic from '../components/Magnetic'
import EditableText from '../components/admin/EditableText'
import { useContent } from '../lib/contentStore'
import { CONTACT_INDEX } from '../lib/pages'
import { requestScene } from '../lib/sceneBus'

/** 约稿服务：流程 4 步 / 委托须知 / 价格参考 / 联系入口 */
export default function CommissionView() {
  const { content } = useContent()
  const commission = content.commission
  const contact = content.site.contact

  return (
    <section id="commission" data-scroll-root className="relative h-full w-full overflow-y-auto">
      <div className="relative z-10 mx-auto w-full max-w-[1700px] px-8 pb-12 pt-24 lg:px-12">
        <div className="scene-block flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-[0.5em] text-brand-400">COMMISSION · 约稿服务</p>
            <EditableText
              as="h1"
              value={commission.title}
              path="commission.title"
              className="mt-3 w-full font-display text-5xl tracking-[0.12em] text-parchment-100 lg:text-6xl"
            />
            <EditableText
              as="p"
              value={commission.subtitle}
              path="commission.subtitle"
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

        <EditableText
          as="p"
          multiline
          value={commission.intro}
          path="commission.intro"
          className="scene-block mt-8 max-w-3xl text-sm leading-relaxed text-parchment-300"
        />

        {/* 约稿流程 */}
        <div className="scene-block mt-10">
          <EditableText
            as="h2"
            value={commission.stepsTitle}
            path="commission.stepsTitle"
            className="font-mono text-xs tracking-[0.35em] text-brand-400"
          />
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {commission.steps.map((item, i) => (
              <div key={i} className="rounded-lg border border-white/10 bg-ink-950/45 p-5 backdrop-blur-sm transition-colors duration-300 hover:border-brand-500/50">
                <p className="font-display text-3xl text-brand-400/70">{item.step}</p>
                <EditableText as="h3" value={item.title} path={`commission.steps.${i}.title`} className="mt-2 text-lg tracking-[0.1em] text-parchment-100" />
                <EditableText as="p" multiline value={item.desc} path={`commission.steps.${i}.desc`} className="mt-1.5 text-sm leading-relaxed text-parchment-500" />
              </div>
            ))}
          </div>
        </div>

        {/* 委托须知 + 价格参考 */}
        <div className="scene-block mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-ink-950/45 p-6 backdrop-blur-sm">
            <EditableText
              as="h2"
              value={commission.notesTitle}
              path="commission.notesTitle"
              className="font-mono text-xs tracking-[0.35em] text-brand-400"
            />
            <EditableText as="p" multiline value={commission.notes} path="commission.notes" className="mt-3 text-sm leading-relaxed text-parchment-300" />
          </div>
          <div className="rounded-lg border border-white/10 bg-ink-950/45 p-6 backdrop-blur-sm">
            <p className="font-mono text-xs tracking-[0.35em] text-brand-400">价格参考</p>
            <EditableText as="p" multiline value={commission.priceNote} path="commission.priceNote" className="mt-3 text-sm leading-relaxed text-parchment-300" />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {(commission.priceTable ?? []).map((row, i) => (
                <div key={row.tier} className="rounded-lg border border-white/10 bg-ink-950/55 p-4 transition-colors duration-300 hover:border-brand-500/40">
                  <div className="flex items-center justify-between gap-2">
                    <EditableText as="p" value={row.tier} path={`commission.priceTable.${i}.tier`} className="font-display text-lg tracking-[0.1em] text-parchment-100" />
                    <EditableText as="p" value={row.price} path={`commission.priceTable.${i}.price`} className="font-mono text-xs text-brand-400" />
                  </div>
                  <EditableText as="p" multiline value={row.scope} path={`commission.priceTable.${i}.scope`} className="mt-1.5 text-xs leading-relaxed text-parchment-500" />
                  <EditableText as="p" value={row.leadTime} path={`commission.priceTable.${i}.leadTime`} className="mt-1.5 font-mono text-[10px] tracking-[0.15em] text-parchment-500" />
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Magnetic>
                <a href={`tencent://message/?uin=${contact.qq}`} className="btn-sheen rounded-md bg-brand-500 px-6 py-2.5 text-xs tracking-[0.2em] text-white transition-colors hover:bg-brand-600">
                  QQ 咨询
                </a>
              </Magnetic>
              <Magnetic>
                <a href={`mailto:${contact.email}`} className="rounded-md border border-white/15 px-6 py-2.5 text-xs tracking-[0.2em] text-parchment-100 transition-colors hover:border-brand-500/60 hover:text-brand-400">
                  邮件咨询
                </a>
              </Magnetic>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
