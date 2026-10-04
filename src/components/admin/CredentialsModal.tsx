import { useState } from 'react'
import { useContent } from '../../lib/contentStore'
import { useDialogFocus } from '../../lib/useDialogFocus'

interface CredentialsModalProps {
  open: boolean
  onClose: () => void
}

/** 修改当前账号密码：验证旧密码后设置新密码 */
export default function CredentialsModal({ open, onClose }: CredentialsModalProps) {
  const { changeMyPassword, account, cloudMode } = useContent()
  const dialogRef = useDialogFocus<HTMLFormElement>(open, onClose)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open) return null

  const submit = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      if (newPassword !== confirm) {
        setError('两次输入的新密码不一致')
        return
      }
      const result = await changeMyPassword(oldPassword, newPassword)
      if (result.ok) {
        window.alert('密码已更新，下次登录请使用新密码')
        setOldPassword('')
        setNewPassword('')
        setConfirm('')
        onClose()
      } else {
        setError(result.error ?? '修改失败')
      }
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'mt-1 w-full rounded-md border border-white/15 bg-ink-950 px-3 py-2 text-sm text-parchment-100 outline-none transition-colors focus:border-brand-500'

  return (
    <div
      className="fixed inset-0 z-[135] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="修改密码"
    >
      <form
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
        className="w-[min(420px,92vw)] rounded-xl border border-brand-500/30 bg-ink-900/95 p-6 shadow-[0_0_44px_rgba(199,27,27,0.25)]"
      >
        <p className="font-mono text-xs tracking-[0.4em] text-brand-400">修改密码</p>
        <p className="mt-1 font-mono text-[10px] tracking-[0.2em] text-parchment-500">
          当前账号：@{account?.username ?? ''}（{account?.displayName ?? ''}）
        </p>
        <div className="mt-4 grid gap-3">
          <label className="block">
            <span className="font-mono text-[9px] tracking-[0.25em] text-parchment-500">旧密码</span>
            <input
              type="password"
              value={oldPassword}
              onChange={(event) => setOldPassword(event.target.value)}
              className={inputCls}
              placeholder="当前密码"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[9px] tracking-[0.25em] text-parchment-500">新密码（至少 {cloudMode ? 8 : 4} 位）</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={cloudMode ? 8 : 4}
              required
              className={inputCls}
              placeholder="新的密码"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[9px] tracking-[0.25em] text-parchment-500">再次输入新密码</span>
            <input
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className={inputCls}
              placeholder="确认新密码"
            />
          </label>
        </div>
        {error && <p className="mt-3 font-mono text-xs text-brand-400">{error}</p>}
        <div className="mt-5 flex gap-3">
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-md bg-brand-500 py-2 text-sm tracking-[0.15em] text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
          >
            保存
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-white/15 py-2 text-sm text-parchment-300 transition-colors hover:border-brand-500/60 hover:text-brand-400"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  )
}
