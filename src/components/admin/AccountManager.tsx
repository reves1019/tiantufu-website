import { useEffect, useMemo, useRef, useState } from 'react'
import { useContent } from '../../lib/contentStore'

type ManagerTab = 'pending' | 'all'

/** 管理员账号管理：审核成员注册 / 查看全部账号 / 重置密码 / 删除 / 导入导出账号元数据 */
export default function AccountManager() {
  const {
    admin,
    accounts,
    content,
    approveAccount,
    rejectAccount,
    deleteAccount,
    adminResetPassword,
    accountExport,
    accountImport,
  } = useContent()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<ManagerTab>('pending')
  const [topicFor, setTopicFor] = useState<Record<string, string>>({})
  const [resetTarget, setResetTarget] = useState<string | null>(null)
  const [newPass, setNewPass] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onOpen = () => {
      setOpen(true)
      setNotice('')
      setError('')
    }
    window.addEventListener('ttf-accounts-manager-open', onOpen)
    return () => window.removeEventListener('ttf-accounts-manager-open', onOpen)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const pending = useMemo(
    () => accounts.filter((a) => a.role === 'member' && a.status === 'pending'),
    [accounts],
  )
  const topicOptions = content.topics

  if (!admin || !open) return null

  const approve = (id: string) => {
    const result = approveAccount(id, topicFor[id])
    setNotice(result.ok ? '已通过审核：已生成该成员的个人主页与作品集入口' : result.error ?? '操作失败')
    if (!result.ok) setError(result.error ?? '操作失败')
  }

  const handleReset = async (id: string) => {
    setError('')
    const result = await adminResetPassword(id, newPass)
    if (result.ok) {
      setNotice('密码已重置（新密码仅本次会话可见，请告知对方后尽快修改）')
      setResetTarget(null)
      setNewPass('')
    } else {
      setError(result.error ?? '重置失败')
    }
  }

  const doExport = () => {
    const blob = new Blob([accountExport()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'tiantufu-accounts.json'
    link.click()
    URL.revokeObjectURL(url)
    setNotice('已导出账号元数据（不含密码哈希，跨设备迁移后请重置密码）')
  }

  const doImport = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = accountImport(String(reader.result ?? ''))
      setNotice(result.ok ? '账号导入完成（导入的账号密码为空，请逐个重置）' : result.error ?? '导入失败')
    }
    reader.readAsText(file)
  }

  const chip = 'rounded border px-2 py-0.5 font-mono text-[9px] tracking-[0.15em]'

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div
        className="flex max-h-[92vh] w-[min(900px,96vw)] flex-col overflow-hidden rounded-xl border border-brand-500/25 bg-ink-900/95 shadow-[0_0_48px_rgba(199,27,27,0.3)]"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="font-mono text-xs tracking-[0.4em] text-brand-400">账号管理 · ACCOUNTS</p>
            <p className="mt-1 font-mono text-[10px] tracking-[0.2em] text-parchment-500">
              共 {accounts.length} 个账号 · 待审核 {pending.length} 个
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="关闭"
            className="rounded-md border border-white/10 px-2.5 py-1 font-mono text-[12px] text-parchment-300 transition-colors hover:border-brand-500/60 hover:text-brand-400"
          >
            关闭
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-5 py-3">
          {(
            [
              ['pending', `待审核（${pending.length}）`],
              ['all', `全部账号（${accounts.length}）`],
            ] as [ManagerTab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-full border px-4 py-1.5 font-mono text-[10px] tracking-[0.2em] transition-colors ${
                tab === id
                  ? 'border-brand-500 bg-brand-500/15 text-brand-400'
                  : 'border-white/10 text-parchment-400 hover:border-brand-500/40 hover:text-brand-400'
              }`}
            >
              {label}
            </button>
          ))}
          <span className="mx-1 hidden h-4 w-px bg-white/10 sm:block" />
          <button
            type="button"
            onClick={doExport}
            className="rounded-full border border-white/10 px-4 py-1.5 font-mono text-[10px] tracking-[0.2em] text-parchment-300 transition-colors hover:border-brand-500/50 hover:text-brand-400"
          >
            导出账号
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-full border border-white/10 px-4 py-1.5 font-mono text-[10px] tracking-[0.2em] text-parchment-300 transition-colors hover:border-brand-500/50 hover:text-brand-400"
          >
            导入账号
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) doImport(file)
              event.target.value = ''
            }}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {notice && <p className="mb-3 rounded-md border border-gold-400/30 bg-gold-400/10 px-3 py-2 text-xs text-parchment-200">{notice}</p>}
          {error && <p className="mb-3 rounded-md border border-brand-500/40 bg-brand-500/10 px-3 py-2 text-xs text-brand-400">{error}</p>}

          {tab === 'pending' ? (
            pending.length === 0 ? (
              <p className="py-10 text-center font-mono text-xs tracking-[0.3em] text-parchment-500">
                暂无待审核的成员注册申请
              </p>
            ) : (
              <div className="space-y-3">
                {pending.map((acc) => (
                  <div key={acc.id} className="rounded-lg border border-white/10 bg-ink-950/60 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-base tracking-[0.08em] text-parchment-100">
                          {acc.displayName}
                          <span className="ml-2 font-mono text-[10px] tracking-[0.15em] text-parchment-500">
                            @{acc.username}
                          </span>
                        </p>
                        <p className="mt-1 font-mono text-[10px] tracking-[0.15em] text-parchment-500">
                          申请时间：{new Date(acc.createdAt).toLocaleString('zh-CN')}
                        </p>
                        {acc.note && (
                          <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-parchment-400">
                            申请说明：{acc.note}
                          </p>
                        )}
                      </div>
                      <label className="flex items-center gap-2 font-mono text-[10px] tracking-[0.15em] text-parchment-400">
                        归入主题
                        <select
                          value={topicFor[acc.id] ?? acc.topic ?? 'quan-jiakong'}
                          onChange={(event) => setTopicFor((prev) => ({ ...prev, [acc.id]: event.target.value }))}
                          className="rounded border border-white/15 bg-ink-950 px-2 py-1 text-xs text-parchment-100 outline-none focus:border-brand-500"
                        >
                          {topicOptions.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => approve(acc.id)}
                        className="rounded-md bg-brand-500 px-5 py-2 text-xs tracking-[0.2em] text-white transition-colors hover:bg-brand-600"
                      >
                        通过并生成主页
                      </button>
                      <button
                        type="button"
                        onClick={() => rejectAccount(acc.id)}
                        className="rounded-md border border-white/15 px-5 py-2 text-xs tracking-[0.2em] text-parchment-300 transition-colors hover:border-brand-500/60 hover:text-brand-400"
                      >
                        拒绝
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-2">
              {accounts.map((acc) => (
                <div key={acc.id} className="rounded-lg border border-white/10 bg-ink-950/50 p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="min-w-0 flex-1 text-sm tracking-[0.08em] text-parchment-100">
                      {acc.displayName}
                      <span className="ml-2 font-mono text-[10px] tracking-[0.12em] text-parchment-500">@{acc.username}</span>
                    </p>
                    <span
                      className={`${chip} ${
                        acc.role === 'admin'
                          ? 'border-brand-500/60 bg-brand-500/15 text-brand-400'
                          : 'border-white/15 bg-white/5 text-parchment-300'
                      }`}
                    >
                      {acc.role === 'admin' ? '管理员' : '成员'}
                    </span>
                    <span
                      className={`${chip} ${
                        acc.status === 'approved'
                          ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                          : acc.status === 'pending'
                            ? 'border-gold-400/40 bg-gold-400/10 text-gold-300'
                            : 'border-white/10 text-parchment-500'
                      }`}
                    >
                      {acc.status === 'approved' ? '已审核' : acc.status === 'pending' ? '待审核' : '已拒绝'}
                    </span>
                    {acc.memberId && <span className="font-mono text-[9px] text-parchment-500">主页 {acc.memberId}</span>}
                  </div>
                  {resetTarget === acc.id ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={newPass}
                        onChange={(event) => setNewPass(event.target.value)}
                        placeholder="新密码（至少 4 位）"
                        className="w-48 rounded border border-white/15 bg-ink-950 px-2 py-1.5 text-xs text-parchment-100 outline-none focus:border-brand-500"
                      />
                      <button
                        type="button"
                        onClick={() => void handleReset(acc.id)}
                        className="rounded bg-brand-500 px-3 py-1.5 text-[11px] text-white transition-colors hover:bg-brand-600"
                      >
                        确认重置
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setResetTarget(null)
                          setNewPass('')
                        }}
                        className="rounded border border-white/10 px-3 py-1.5 text-[11px] text-parchment-400"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2.5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setResetTarget(acc.id)
                          setNewPass('')
                        }}
                        className="font-mono text-[10px] tracking-[0.15em] text-parchment-400 transition-colors hover:text-brand-400"
                      >
                        重置密码
                      </button>
                      {acc.role !== 'admin' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`删除账号 @${acc.username}？其公开主页不会被删除。`)) {
                              deleteAccount(acc.id)
                              setNotice('账号已删除')
                            }
                          }}
                          className="font-mono text-[10px] tracking-[0.15em] text-brand-400/80 transition-colors hover:text-brand-400"
                        >
                          删除账号
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
