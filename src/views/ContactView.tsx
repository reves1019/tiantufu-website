import Magnetic from '../components/Magnetic'
import EditableText from '../components/admin/EditableText'
import { useContent } from '../lib/contentStore'
import { COMMISSION_INDEX, FAQ_INDEX, JOIN_INDEX, LEGAL_INDEX } from '../lib/pages'
import { requestScene } from '../lib/sceneBus'

export default function ContactView() {
  const { content, openGate } = useContent()
  const contact = content.site.contact

  const entries = [
    { label: '加入我们', desc: '成为天图府的一员', index: JOIN_INDEX },
    { label: '约稿服务', desc: '承接架空地图与设定绘制', index: COMMISSION_INDEX },
    { label: '常见问题', desc: '加入 / 约稿 / 版权', index: FAQ_INDEX },
    { label: '版权声明', desc: '授权与免责说明', index: LEGAL_INDEX },
  ]

  return (
    <section id="contact" data-scroll-root className="relative h-full w-full overflow-y-auto">
      <div className="relative z-10 mx-auto flex min-h-full w-full max-w-[1700px] flex-col items-center justify-center px-6 py-24 text-center">
        <p className="font-mono text-xs tracking-[0.5em] text-brand-400">CONTACT · 联系天图府</p>
        <h1 className="scene-block mt-5 font-display text-5xl tracking-[0.18em] text-parchment-100 sm:text-6xl lg:text-8xl">联系天图府</h1>

        <div className="scene-block mt-12 flex flex-wrap items-stretch justify-center gap-6">
          <a
            href={`tencent://message/?uin=${contact.qq}`}
            title={`QQ 号：${contact.qq}`}
            className="w-64 rounded-lg border border-white/10 bg-ink-950/45 px-8 py-8 backdrop-blur-sm transition-colors duration-300 hover:border-brand-500/60"
          >
            <span className="font-mono text-xs tracking-[0.35em] text-brand-400">QQ</span>
            <EditableText as="span" value={contact.qq} path="site.contact.qq" className="mt-4 block w-full text-lg tracking-[0.15em] text-parchment-100" />
            <EditableText as="span" value="占位号码 · 待替换" path="site.contact.qqNote" className="mt-2 block w-full text-xs text-parchment-500" />
          </a>
          <a
            href={contact.bilibili}
            target="_blank"
            rel="noreferrer"
            className="w-64 rounded-lg border border-white/10 bg-ink-950/45 px-8 py-8 backdrop-blur-sm transition-colors duration-300 hover:border-brand-500/60"
          >
            <span className="font-mono text-xs tracking-[0.35em] text-brand-400">BILIBILI</span>
            <EditableText as="span" value={contact.bilibili} path="site.contact.bilibili" className="mt-4 block w-full break-all text-sm tracking-[0.1em] text-parchment-100" />
            <EditableText as="span" value="占位链接 · 待替换" path="site.contact.biliNote" className="mt-2 block w-full text-xs text-parchment-500" />
          </a>
          <a
            href={`mailto:${contact.email}`}
            className="w-64 rounded-lg border border-white/10 bg-ink-950/45 px-8 py-8 backdrop-blur-sm transition-colors duration-300 hover:border-brand-500/60"
          >
            <span className="font-mono text-xs tracking-[0.35em] text-brand-400">EMAIL</span>
            <EditableText as="span" value={contact.email} path="site.contact.email" className="mt-4 block w-full text-lg tracking-[0.15em] text-parchment-100" />
            <EditableText as="span" value="占位邮箱 · 待确认" path="site.contact.emailNote" className="mt-2 block w-full text-xs text-parchment-500" />
          </a>
          <a
            href={`tencent://group/pa?cmd=2&uin=${contact.qqGroup}`}
            title={`QQ 群号：${contact.qqGroup}`}
            className="w-64 rounded-lg border border-white/10 bg-ink-950/45 px-8 py-8 backdrop-blur-sm transition-colors duration-300 hover:border-brand-500/60"
          >
            <span className="font-mono text-xs tracking-[0.35em] text-brand-400">QQ GROUP</span>
            <EditableText as="span" value={contact.qqGroup} path="site.contact.qqGroup" className="mt-4 block w-full text-lg tracking-[0.15em] text-parchment-100" />
            <EditableText as="span" value="QQ 群号 · 待替换" path="site.contact.qqGroupNote" className="mt-2 block w-full text-xs text-parchment-500" />
          </a>
        </div>

        {/* 入口枢纽：加入 / 约稿 / FAQ / 版权 */}
        <div className="scene-block mt-12 grid gap-4 text-left sm:grid-cols-2 xl:grid-cols-4">
          {entries.map((entry) => (
            <Magnetic key={entry.label} className="h-full w-full">
              <button
                type="button"
                onClick={() => requestScene(entry.index)}
                className="group h-full w-full rounded-lg border border-white/10 bg-ink-950/45 px-6 py-6 text-left backdrop-blur-sm transition-all duration-300 hover:border-brand-500/50 hover:shadow-[0_0_28px_rgba(199,27,27,0.18)]"
              >
                <p className="font-display text-xl tracking-[0.12em] text-parchment-100 transition-colors group-hover:text-brand-400">
                  {entry.label}{' '}
                  <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
                </p>
                <p className="mt-2 text-xs leading-relaxed text-parchment-500">{entry.desc}</p>
              </button>
            </Magnetic>
          ))}
        </div>

        {/* 社交矩阵 */}
        <div className="scene-block mt-8 flex flex-wrap items-center justify-center gap-4">
          {contact.socials.map((social) => (
            <a
              key={social.label}
              href={social.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/10 px-5 py-2 font-mono text-[10px] tracking-[0.25em] text-parchment-400 backdrop-blur-sm transition-colors duration-300 hover:border-brand-500/60 hover:text-brand-400"
            >
              {social.label}
            </a>
          ))}
        </div>

        <div className="mt-20 flex flex-col items-center gap-3">
          <div className="flex items-center justify-center gap-6">
            <p className="font-mono text-xs tracking-[0.35em] text-parchment-500">
              © {new Date().getFullYear()} 天图府 · tiantufu.com
            </p>
            <button
              type="button"
              onClick={openGate}
              className="font-mono text-[10px] tracking-[0.3em] text-parchment-500/50 transition-colors hover:text-brand-400"
              title="管理员编辑模式（快捷键 Ctrl+Shift+A）"
            >
              管理
            </button>
          </div>
          <p className="font-mono text-[10px] tracking-[0.25em] text-parchment-500/60">
            快捷键：1-6 切换页面 · Ctrl+K 搜索 · B 返回 · ? 查看
          </p>
        </div>
      </div>
    </section>
  )
}
