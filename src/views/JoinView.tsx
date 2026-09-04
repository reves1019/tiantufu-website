import Magnetic from '../components/Magnetic'
import EditableText from '../components/admin/EditableText'
import { useContent } from '../lib/contentStore'
import { CONTACT_INDEX } from '../lib/pages'
import { requestScene } from '../lib/sceneBus'

/** 加入我们：招新公告 / 入社条件 / 申请流程 / 申请入口 */
export default function JoinView() {
  const { content } = useContent()
  const join = content.join
  const qqGroup = content.site.contact.qqGroup

  return (
    <section id="join" data-scroll-root className="relative h-full w-full overflow-y-auto">
      <div className="relative z-10 mx-auto w-full max-w-[1700px] px-8 pb-12 pt-24 lg:px-12">
        <div className="scene-block flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-[0.5em] text-brand-400">E 120° · 13 · JOIN · 加入我们</p>
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
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('ttf-gate-register'))}
              className="btn-sheen rounded-md border border-brand-500/60 bg-brand-500/10 px-8 py-3.5 text-sm tracking-[0.2em] text-brand-400 transition-all duration-300 hover:bg-brand-500 hover:text-white"
            >
              注册成员账号
            </button>
          </Magnetic>
          <Magnetic>
            <a
              href={`tencent://group/pa?cmd=2&uin=${qqGroup}`}
              className="btn-sheen rounded-md bg-brand-500 px-8 py-3.5 text-sm tracking-[0.2em] text-white shadow-[0_0_28px_rgba(199,27,27,0.4)] transition-all duration-300 hover:bg-brand-600"
            >
              加入 QQ 群
            </a>
          </Magnetic>
          <EditableText as="p" multiline value={join.contactNote} path="join.contactNote" className="max-w-xl text-sm leading-relaxed text-parchment-400" />
          <p className="w-full font-mono text-[10px] tracking-[0.15em] text-parchment-500">
            注册后由管理员审核，通过后自动生成你的个人主页与作品集。
          </p>
        </div>
      </div>
    </section>
  )
}
