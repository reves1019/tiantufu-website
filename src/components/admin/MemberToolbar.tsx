import { useMemo, useState } from 'react'
import { useContent } from '../../lib/contentStore'
import { MEMBER_INDEX, WORKS_INDEX } from '../../lib/pages'
import { setActiveMemberId } from '../../lib/memberBus'
import { requestScene } from '../../lib/sceneBus'
import ImageField from './ImageField'
import CredentialsModal from './CredentialsModal'

/**
 * 成员工具栏 + “我的主页”资料编辑器：
 * 已审核成员登录后，仅能编辑自己的昵称/头像/简介/主题/代表作/更多作品。
 */
export default function MemberToolbar() {
  const { account, admin, content, logoutAccount, accountUpdateMeta, setAt } = useContent()
  const [open, setOpen] = useState(false)
  const [credOpen, setCredOpen] = useState(false)

  const isMember = !!account && account.role === 'member' && account.status === 'approved' && !admin
  const member = useMemo(() => {
    if (!isMember || !account?.memberId) return null
    const idx = content.members.findIndex((m) => m.id === account.memberId)
    return idx >= 0 ? { idx, data: content.members[idx] } : null
  }, [isMember, account, content.members])

  if (!isMember) return null
  if (!member) {
    // 账号尚未绑定主页（理论不应出现：审核时已生成）
    return (
      <div className="fixed bottom-5 left-1/2 z-[70] -translate-x-1/2 rounded-xl border border-brand-500/40 bg-ink-950/90 px-6 py-3 font-mono text-[11px] tracking-[0.2em] text-brand-400">
        你的主页尚未生成，请联系管理员重新审核
      </div>
    )
  }

  const { idx, data: m } = member
  const topicIds = content.topics.map((t) => t.id)
  const currentTopic = topicIds.includes(m.topic) ? m.topic : topicIds[0]

  const labelCls = 'mb-1 block font-mono text-[9px] tracking-[0.25em] text-parchment-500'
  const inputCls =
    'w-full rounded-md border border-white/15 bg-ink-950 px-3 py-2 text-sm text-parchment-100 outline-none transition-colors focus:border-brand-500'

  const goHome = () => {
    if (account?.memberId) {
      setActiveMemberId(account.memberId)
      requestScene(MEMBER_INDEX)
    }
  }

  const rename = (name: string) => {
    if (!name.trim()) return
    const old = m.name
    accountUpdateMeta({ displayName: name.trim() })
    // 同步作品档案作者名
    const archive = content.worksArchive.map((w) => (w.author === old ? { ...w, author: name.trim() } : w))
    setAt('worksArchive', archive as never)
  }

  return (
    <>
      <div className="fixed bottom-5 left-1/2 z-[70] flex max-w-[96vw] -translate-x-1/2 flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-2xl border border-brand-500/40 bg-ink-950/92 px-6 py-2.5 shadow-[0_0_32px_rgba(199,27,27,0.3)] backdrop-blur-xl">
        <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] text-brand-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />
          成员模式 · {account?.displayName}
        </span>
        <span className="hidden h-4 w-px bg-white/15 sm:block" />
        <button
          type="button"
          onClick={goHome}
          className="font-mono text-[11px] tracking-[0.2em] text-parchment-300 transition-colors hover:text-brand-400"
        >
          我的主页
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-mono text-[11px] tracking-[0.2em] text-parchment-100 transition-colors hover:text-brand-400"
        >
          编辑资料
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveMemberId(account?.memberId ?? '')
            requestScene(WORKS_INDEX)
          }}
          className="font-mono text-[11px] tracking-[0.2em] text-parchment-300 transition-colors hover:text-brand-400"
        >
          我的作品
        </button>
        <button
          type="button"
          onClick={() => setCredOpen(true)}
          className="font-mono text-[11px] tracking-[0.2em] text-parchment-300 transition-colors hover:text-brand-400"
        >
          修改密码
        </button>
        <button
          type="button"
          onClick={logoutAccount}
          className="font-mono text-[11px] tracking-[0.2em] text-brand-400 transition-colors hover:text-parchment-100"
        >
          退出登录
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-[min(760px,96vw)] flex-col overflow-hidden rounded-xl border border-brand-500/30 bg-ink-900/95 shadow-[0_0_44px_rgba(199,27,27,0.25)]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <p className="font-mono text-xs tracking-[0.35em] text-brand-400">编辑我的主页</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-white/10 px-2 py-1 font-mono text-[12px] text-parchment-300 hover:border-brand-500/60 hover:text-brand-400"
              >
                完成
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className={labelCls}>昵称（对外展示名）</span>
                  <input
                    defaultValue={m.name}
                    onBlur={(event) => rename(event.target.value)}
                    className={inputCls}
                    placeholder="你的昵称"
                  />
                </label>
                <label className="block">
                  <span className={labelCls}>身份 / 擅长领域</span>
                  <input
                    defaultValue={m.role}
                    onBlur={(event) => setAt(`members.${idx}.role`, event.target.value)}
                    className={inputCls}
                    placeholder="如：制图师 · 架空历史地图"
                  />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <span className={labelCls}>创作主题</span>
                  <select
                    value={currentTopic}
                    onChange={(event) => {
                      const topic = event.target.value
                      accountUpdateMeta({ topic })
                      setAt(`members.${idx}.topic`, topic)
                    }}
                    className={inputCls}
                  >
                    {content.topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className={labelCls}>擅长标签（逗号分隔）</span>
                  <input
                    defaultValue={(m.tags ?? []).join('，')}
                    onBlur={(event) =>
                      setAt(
                        `members.${idx}.tags`,
                        event.target.value
                          .split(/[,，]/)
                          .map((s) => s.trim())
                          .filter(Boolean) as never,
                      )
                    }
                    className={inputCls}
                    placeholder="如：考据，架空历史，近东"
                  />
                </div>
              </div>

              <div>
                <span className={labelCls}>个人简介</span>
                <textarea
                  defaultValue={m.bio}
                  onBlur={(event) => {
                    setAt(`members.${idx}.bio`, event.target.value)
                    accountUpdateMeta({ bio: event.target.value })
                  }}
                  rows={4}
                  className={`${inputCls} resize-y leading-relaxed`}
                />
              </div>

              <ImageField label="头像图片（点击上传）" value={m.avatar} onChange={(v) => setAt(`members.${idx}.avatar`, v)} />

              <div className="rounded-lg border border-white/10 bg-ink-950/40 p-3">
                <p className="font-mono text-[10px] tracking-[0.3em] text-brand-400">代表作（作品集文件夹封面）</p>
                <div className="mt-3 space-y-3">
                  <TextField label="作品名" value={m.work.title} onChange={(v) => setAt(`members.${idx}.work.title`, v)} />
                  <ImageField label="代表作图片" value={m.work.image} onChange={(v) => setAt(`members.${idx}.work.image`, v)} />
                  <TextField
                    label="作品说明"
                    value={m.work.desc}
                    textarea
                    onChange={(v) => setAt(`members.${idx}.work.desc`, v)}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-ink-950/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] tracking-[0.3em] text-brand-400">
                    更多作品（{m.works?.length ?? 0}）
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setAt(
                        `members.${idx}.works`,
                        [
                          ...(m.works ?? []),
                          { title: '新作品（占位）', image: m.work.image, desc: '作品说明占位' },
                        ] as never,
                      )
                    }
                    className="rounded border border-brand-500/50 px-3 py-1 font-mono text-[10px] tracking-[0.15em] text-brand-400 transition-colors hover:bg-brand-500/10"
                  >
                    + 添加作品
                  </button>
                </div>
                <div className="mt-3 space-y-4">
                  {(m.works ?? []).map((work, j) => (
                    <div key={`${m.id}-w${j}`} className="rounded-md border border-white/10 bg-ink-950/70 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-mono text-[10px] text-parchment-500">作品 {String(j + 1).padStart(2, '0')}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setAt(`members.${idx}.works`, (m.works ?? []).filter((_, k) => k !== j) as never)
                          }
                          className="font-mono text-[10px] text-brand-400/80 hover:text-brand-400"
                        >
                          删除
                        </button>
                      </div>
                      <TextField
                        label="作品名"
                        value={work.title}
                        onChange={(v) => setAt(`members.${idx}.works.${j}.title`, v)}
                      />
                      <div className="mt-2">
                        <ImageField
                          label="作品图片"
                          value={work.image}
                          onChange={(v) => setAt(`members.${idx}.works.${j}.image`, v)}
                        />
                      </div>
                      <div className="mt-2">
                        <TextField
                          label="作品说明"
                          value={work.desc}
                          textarea
                          onChange={(v) => setAt(`members.${idx}.works.${j}.desc`, v)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="font-mono text-[10px] leading-relaxed tracking-[0.15em] text-parchment-500">
                所有修改会实时保存并立即显示到你的主页 / 作品集；刷新页面后仍然保留。
              </p>
            </div>
          </div>
        </div>
      )}
      <CredentialsModal open={credOpen} onClose={() => setCredOpen(false)} />
    </>
  )
}

function TextField({
  label,
  value,
  onChange,
  textarea,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  textarea?: boolean
}) {
  const cls =
    'mt-1 w-full rounded border border-white/10 bg-ink-950 px-2 py-1.5 text-xs text-parchment-100 outline-none transition-colors focus:border-brand-500'
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[9px] tracking-[0.25em] text-parchment-500">{label}</span>
      {textarea ? (
        <textarea value={value} rows={2} onChange={(event) => onChange(event.target.value)} className={`${cls} resize-y leading-relaxed`} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} className={cls} />
      )}
    </label>
  )
}
