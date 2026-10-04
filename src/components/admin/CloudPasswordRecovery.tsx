import { useState, type FormEvent } from 'react'
import { useContent } from '../../lib/contentStore'
import { useDialogFocus } from '../../lib/useDialogFocus'

/** Supabase password-reset links return here with a short-lived recovery session. */
export default function CloudPasswordRecovery() {
  const { passwordRecoveryOpen, completePasswordRecovery, account } = useContent()
  const dialogRef = useDialogFocus<HTMLFormElement>(passwordRecoveryOpen)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!passwordRecoveryOpen) return null

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    if (password !== confirmation) {
      setError('两次输入的新密码不一致')
      return
    }
    setBusy(true)
    setError('')
    const result = await completePasswordRecovery(password)
    setBusy(false)
    if (result.ok) {
      setPassword('')
      setConfirmation('')
      window.alert('密码已更新，可以继续使用当前账号。')
    } else {
      setError(result.error ?? '密码更新失败，请重新打开重置邮件链接。')
    }
  }

  const inputClass = 'mt-1 w-full rounded-md border border-white/15 bg-ink-950 px-3 py-2.5 text-sm text-parchment-100 outline-none focus:border-brand-500'

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <form
        ref={dialogRef}
        onSubmit={(event) => void submit(event)}
        className="w-[min(440px,94vw)] rounded-xl border border-brand-500/30 bg-ink-900 p-6 shadow-[0_0_56px_rgba(199,27,27,0.24)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cloud-recovery-title"
      >
        <p id="cloud-recovery-title" className="font-mono text-xs tracking-[0.28em] text-brand-400">重设云端账号密码</p>
        <p className="mt-2 text-xs leading-relaxed text-parchment-400">
          {account?.email ? `账号：${account.email}。` : ''}请设置至少 8 位的新密码。
        </p>
        <label className="mt-5 block text-xs text-parchment-300">
          新密码
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            className={inputClass}
            autoFocus
          />
        </label>
        <label className="mt-3 block text-xs text-parchment-300">
          再次输入新密码
          <input
            type="password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            className={inputClass}
          />
        </label>
        {error && <p role="alert" className="mt-3 text-xs leading-relaxed text-brand-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-5 w-full rounded-md bg-brand-500 py-2.5 text-sm tracking-[0.16em] text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {busy ? '正在更新…' : '更新密码'}
        </button>
      </form>
    </div>
  )
}
