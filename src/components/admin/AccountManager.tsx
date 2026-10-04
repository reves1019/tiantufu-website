import { useEffect, useMemo, useRef, useState } from 'react'
import { useContent } from '../../lib/contentStore'
import { useDialogFocus } from '../../lib/useDialogFocus'

type ManagerTab = 'pending' | 'all'

/** 管理员账号管理：审核成员注册 / 查看全部账号 / 重置密码 / 删除 / 导入导出账号元数据 */
export default function AccountManager() {
  const {
    admin,
    accounts,
    accountSaveState,
    accountsReady,
    hydrated,
    content,
    approveAccount,
    rejectAccount,
    deleteAccount,
    adminResetPassword,
    accountExport,
    accountImport,
    cloudMode,
    cloudSyncState,
  } = useContent()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<ManagerTab>('pending')
  const [topicFor, setTopicFor] = useState<Record<string, string>>({})
  const [resetTarget, setResetTarget] = useState<string | null>(null)
  const [newPass, setNewPass] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const dialogRef = useDialogFocus<HTMLDivElement>(open, () => setOpen(false))

  useEffect(() => {
    const onOpen = () => {
      setOpen(true)
      setNotice('')
      setError('')
    }
    window.addEventListener('ttf-accounts-manager-open', onOpen)
    return () => window.removeEventListener('ttf-accounts-manager-open', onOpen)
  }, [])

  const pending = useMemo(
    () => accounts.filter((a) => a.role === 'member' && a.status === 'pending'),
    [accounts],
  )
  const topicOptions = content.topics
  const managerTabs: [ManagerTab, string][] = [
    ['pending', `待审核（${pending.length}）`],
    ['all', `全部账号（${accounts.length}）`],
  ]
  const ready = accountsReady && hydrated
  const canApprove = ready && (!cloudMode || cloudSyncState === 'ready')

  if (!admin || !open) return null

  const approve = async (id: string) => {
    if (!ready || busyId) return
    setBusyId(id)
    setError('')
    try {
      const result = await approveAccount(id, topicFor[id])
      setNotice(result.ok ? (cloudMode ? '已通过审核：主页与作品已写入云端并同步。' : '已通过审核：主页与作品记录已保存到本机') : result.error ?? '操作失败')
      if (!result.ok) setError(result.error ?? '操作失败')
    } catch {
      setError('审核未完成：本机存储出现意外错误，请刷新账号列表后重试。')
    } finally {
      setBusyId(null)
    }
  }

  const reject = async (id: string) => {
    if (!ready || busyId) return
    setBusyId(id)
    setError('')
    try {
      const result = await rejectAccount(id)
      setNotice(result.ok ? (cloudMode ? '申请已在云端标记为拒绝。' : '申请已拒绝并保存到本机') : result.error ?? '操作失败')
      if (!result.ok) setError(result.error ?? '操作失败')
    } catch {
      setError('拒绝申请失败：请检查本机存储后重试。')
    } finally {
      setBusyId(null)
    }
  }

  const handleReset = async (id: string) => {
    if (!ready || busyId || (!cloudMode && newPass.trim().length < 4)) return
    setBusyId(id)
    setError('')
    try {
      const result = await adminResetPassword(id, newPass)
      if (result.ok) {
        setNotice(cloudMode ? '密码重置邮件已发送，请提醒成员检查邮箱。' : '密码已重置（新密码仅本次会话可见，请告知对方后尽快修改）')
        setResetTarget(null)
        setNewPass('')
      } else {
        setError(result.error ?? '重置失败')
      }
    } catch {
      setError('密码未能保存：请检查本机存储后重试。')
    } finally {
      setBusyId(null)
    }
  }

  const doExport = () => {
    if (!ready) return
    const blob = new Blob([accountExport()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'tiantufu-accounts.json'
    link.click()
    URL.revokeObjectURL(url)
    setNotice('已导出成员账号元数据（不含管理员账号与密码哈希；导入后需审核新成员并重置其密码）')
  }

  const doImport = (file: File) => {
    if (!ready || busyId) return
    setBusyId('import')
    setError('')
    const reader = new FileReader()
    reader.onload = () => {
      void (async () => {
        try {
          const result = await accountImport(String(reader.result ?? ''))
          setNotice(result.ok ? '成员账号导入完成；本机三位管理员保持不变，新申请需审核并重置密码' : result.error ?? '导入失败')
          if (!result.ok) setError(result.error ?? '导入失败')
        } finally {
          setBusyId(null)
        }
      })()
    }
    reader.onerror = () => {
      setError('文件读取失败，请重新选择 JSON 文件。')
      setBusyId(null)
    }
    reader.readAsText(file)
  }

  const chip = 'rounded border px-2 py-0.5 font-mono text-[9px] tracking-[0.15em]'

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        className="flex max-h-[92vh] w-[min(900px,96vw)] flex-col overflow-hidden rounded-xl border border-brand-500/25 bg-ink-900/95 shadow-[0_0_48px_rgba(199,27,27,0.3)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-manager-title"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p id="account-manager-title" className="font-mono text-xs tracking-[0.4em] text-brand-400">账号管理 · ACCOUNTS</p>
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
          {managerTabs.map(([id, label]) => (
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
          {!cloudMode && (
            <>
              <button
                type="button"
                onClick={doExport}
                disabled={!ready || busyId !== null}
                className="rounded-full border border-white/10 px-4 py-1.5 font-mono text-[10px] tracking-[0.2em] text-parchment-300 transition-colors hover:border-brand-500/50 hover:text-brand-400"
              >
                导出账号
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={!ready || busyId !== null}
                className="rounded-full border border-white/10 px-4 py-1.5 font-mono text-[10px] tracking-[0.2em] text-parchment-300 transition-colors hover:border-brand-500/50 hover:text-brand-400"
              >
                导入账号
              </button>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void doImport(file)
              event.target.value = ''
            }}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p
            role="status"
            className={`mb-3 text-xs leading-relaxed ${accountSaveState === 'error' ? 'text-brand-400' : 'text-parchment-500'}`}
          >
            {!ready
              ? '正在读取账号资料…'
              : accountSaveState === 'saving'
                ? '账号变更正在保存到此设备…'
              : cloudMode && cloudSyncState === 'uninitialized'
                ? '请先在内容管理完成首次云端内容同步，再审核成员，避免主页脱离当前站点内容。'
                : cloudMode && cloudSyncState === 'error'
                  ? '云端内容同步异常：先检查连接并重试同步，再进行成员审核。'
                  : accountSaveState === 'error'
                  ? cloudMode
                    ? '云端账号读取失败：检查 Supabase 权限/连接后刷新列表。'
                    : '账号保存失败：本机存储不可用或空间不足，请导出/备份后再试。'
                  : cloudMode
                    ? '账号、申请状态与权限由云端 Supabase 管理。'
                    : '账号数据保存在本机浏览器；其他设备不会自动同步。'}
          </p>
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
                        {cloudMode && acc.email && (
                          <p className="mt-1 font-mono text-[10px] text-parchment-500">{acc.email}</p>
                        )}
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
                          disabled={!ready || busyId !== null}
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
                        onClick={() => void approve(acc.id)}
                        disabled={!canApprove || busyId !== null}
                        className="rounded-md bg-brand-500 px-5 py-2 text-xs tracking-[0.2em] text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busyId === acc.id ? '保存中…' : '通过并生成主页'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void reject(acc.id)}
                        disabled={!ready || busyId !== null}
                        className="rounded-md border border-white/15 px-5 py-2 text-xs tracking-[0.2em] text-parchment-300 transition-colors hover:border-brand-500/60 hover:text-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
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
                      {!cloudMode && (
                        <input
                          type="text"
                          value={newPass}
                          onChange={(event) => setNewPass(event.target.value)}
                          placeholder="新密码（至少 4 位）"
                          className="w-48 rounded border border-white/15 bg-ink-950 px-2 py-1.5 text-xs text-parchment-100 outline-none focus:border-brand-500"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => void handleReset(acc.id)}
                        disabled={!ready || busyId !== null}
                        className="rounded bg-brand-500 px-3 py-1.5 text-[11px] text-white transition-colors hover:bg-brand-600"
                      >
                        {busyId === acc.id ? '处理中…' : cloudMode ? '发送重置邮件' : '确认重置'}
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
                      {(!cloudMode || acc.role === 'member') && (
                        <button
                          type="button"
                          onClick={() => {
                            setResetTarget(acc.id)
                            setNewPass('')
                          }}
                          disabled={!ready || busyId !== null || (cloudMode && !acc.email)}
                          className="font-mono text-[10px] tracking-[0.15em] text-parchment-400 transition-colors hover:text-brand-400 disabled:opacity-40"
                        >
                          {cloudMode ? '发送密码重置邮件' : '重置密码'}
                        </button>
                      )}
                      {acc.role !== 'admin' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`删除账号 @${acc.username}？其公开主页不会被删除。`)) {
                              setBusyId(acc.id)
                              void deleteAccount(acc.id).then((result) => {
                                setNotice(result.ok ? (cloudMode ? '云端成员账号已删除；公开主页与作品仍保留。' : '账号已删除并保存到本机') : result.error ?? '删除失败')
                                if (!result.ok) setError(result.error ?? '删除失败')
                              }).finally(() => setBusyId(null))
                            }
                          }}
                          disabled={!ready || busyId !== null}
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
