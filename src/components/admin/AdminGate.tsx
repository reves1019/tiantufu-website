import { useEffect, useState } from 'react'
import { ensureAuthInitialized, getLockRemaining, login } from '../../lib/authStore'
import { useContent } from '../../lib/contentStore'

/** 管理员登录：用户名 + 密码 + 记住我；失败 5 次锁定 30 秒 */
export default function AdminGate() {
  const { gateOpen, closeGate, setAdmin } = useContent()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [lockRemaining, setLockRemaining] = useState(0)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    ensureAuthInitialized().catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!gateOpen) return
    const tick = () => setLockRemaining(getLockRemaining())
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [gateOpen])

  if (!gateOpen) return null

  const submit = async () => {
    if (busy) return
    if (getLockRemaining() > 0) return
    setBusy(true)
    setError('')
    try {
      const ok = await login(username, password, remember)
      if (ok) {
        setUsername('')
        setPassword('')
        setAdmin(true)
        closeGate()
      } else {
        const remaining = getLockRemaining()
        if (remaining > 0) {
          setError(`失败次数过多，请 ${Math.ceil(remaining / 1000)} 秒后再试`)
          setLockRemaining(remaining)
        } else {
          setError('用户名或密码错误')
        }
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
        className="w-80 rounded-xl border border-white/10 bg-ink-900/95 p-6 shadow-[0_0_44px_rgba(199,27,27,0.25)]"
      >
        <p className="font-mono text-xs tracking-[0.4em] text-brand-400">管理员登录</p>
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="用户名"
          autoFocus
          className="mt-4 w-full rounded-md border border-white/15 bg-ink-950 px-3 py-2 text-sm text-parchment-100 outline-none transition-colors focus:border-brand-500"
        />
        <div className="relative mt-3">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="密码"
            className="w-full rounded-md border border-white/15 bg-ink-950 px-3 py-2 pr-12 text-sm text-parchment-100 outline-none transition-colors focus:border-brand-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] tracking-[0.15em] text-parchment-500 transition-colors hover:text-brand-400"
          >
            {showPassword ? '隐藏' : '显示'}
          </button>
        </div>
        <label className="mt-3 flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-parchment-400">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="h-3.5 w-3.5 accent-brand-500"
          />
          记住我（保持登录）
        </label>
        {error && <p className="mt-3 font-mono text-xs leading-relaxed text-brand-400">{error}</p>}
        {lockRemaining > 0 && (
          <p className="mt-3 font-mono text-xs text-parchment-500">
            锁定中，请等待 {Math.ceil(lockRemaining / 1000)} 秒
          </p>
        )}
        <div className="mt-5 flex gap-3">
          <button
            type="submit"
            disabled={busy || lockRemaining > 0}
            className="flex-1 rounded-md bg-brand-500 py-2 text-sm tracking-[0.15em] text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
          >
            登录
          </button>
          <button
            type="button"
            onClick={closeGate}
            className="flex-1 rounded-md border border-white/15 py-2 text-sm text-parchment-300 transition-colors hover:border-brand-500/60 hover:text-brand-400"
          >
            取消
          </button>
        </div>
        <p className="mt-4 border-t border-white/10 pt-3 font-mono text-[10px] leading-relaxed tracking-[0.15em] text-parchment-500">
          默认账号：admin · tiantufu-admin
          <br />
          首次登录后请在工具栏「修改登录信息」改密
        </p>
      </form>
    </div>
  )
}
