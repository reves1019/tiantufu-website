import { useEffect, useState } from 'react'
import { useContent } from '../../lib/contentStore'
import { MEMBER_INDEX } from '../../lib/pages'
import { setActiveMemberId } from '../../lib/memberBus'
import { requestScene } from '../../lib/sceneBus'

type GateTab = 'login' | 'register' | 'success'

/**
 * 账号网关：登录 / 注册成员（注册需管理员审核）。
 * - 管理员登录后进入全站编辑模式
 * - 已审核成员登录后跳转到自己的个人主页，可完善自我介绍
 */
export default function AdminGate() {
  const { gateOpen, closeGate, loginAccount, registerAccount, refreshAccounts, accountsReady, hydrated, cloudMode } = useContent()
  const [tab, setTab] = useState<GateTab>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [regUsername, setRegUsername] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regName, setRegName] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regNote, setRegNote] = useState('')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (gateOpen) refreshAccounts()
  }, [gateOpen, refreshAccounts])

  // 外部入口（如“注册成员账号”）可请求打开注册页签
  useEffect(() => {
    const onRegister = () => {
      setTab('register')
      resetForm()
    }
    window.addEventListener('ttf-gate-register', onRegister)
    return () => window.removeEventListener('ttf-gate-register', onRegister)
  }, [])

  if (!gateOpen) return null

  const resetForm = () => {
    setError('')
    setSuccessMsg('')
  }

  const submitLogin = async () => {
    if (busy) return
    setBusy(true)
    resetForm()
    try {
      const result = await loginAccount(username, password, remember)
      if (!result.ok) {
        setError(result.error ?? '登录失败')
        return
      }
      const acc = result.account
      if (!result.isAdmin && acc?.memberId) {
        setActiveMemberId(acc.memberId)
        requestScene(MEMBER_INDEX)
      }
      setUsername('')
      setPassword('')
      closeGate()
    } finally {
      setBusy(false)
    }
  }

  const submitRegister = async () => {
    if (busy) return
    setBusy(true)
    resetForm()
    try {
      const result = await registerAccount(regUsername, regName, regPassword, regNote, regEmail)
      if (!result.ok) {
        setError(result.error ?? '注册失败')
        return
      }
      setSuccessMsg(
        cloudMode
          ? '注册申请已提交。若网站启用了邮箱验证，请先完成邮箱验证；审核通过后即可使用邮箱和密码登录。'
          : '注册申请已提交，请等待管理员审核通过后再登录',
      )
      setTab('success')
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full rounded-md border border-white/15 bg-ink-950 px-3 py-2 text-sm text-parchment-100 outline-none transition-colors focus:border-brand-500'
  const labelCls = 'mb-1 block font-mono text-[9px] tracking-[0.25em] text-parchment-500'

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className="max-h-[92vh] w-[min(460px,94vw)] overflow-y-auto rounded-xl border border-brand-500/25 bg-ink-900/95 p-6 shadow-[0_0_44px_rgba(199,27,27,0.28)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-gate-title"
      >
        <div className="flex items-center justify-between">
          <p id="account-gate-title" className="font-mono text-xs tracking-[0.4em] text-brand-400">天图府 · 账号</p>
          <button
            type="button"
            onClick={closeGate}
            aria-label="关闭"
            className="rounded-md border border-white/10 px-2 py-1 font-mono text-[11px] text-parchment-400 transition-colors hover:border-brand-500/60 hover:text-brand-400"
          >
            ×
          </button>
        </div>

        <div className="mt-4 flex rounded-lg border border-white/10 p-1">
          {(
            [
              ['login', '登录'],
              ['register', '注册成员'],
            ] as [GateTab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id)
                resetForm()
              }}
              data-testid={id === 'register' ? 'account-register-tab' : id === 'login' ? 'account-login-tab' : undefined}
              className={`flex-1 rounded-md py-2 text-xs tracking-[0.25em] transition-colors ${
                tab === id || (tab === 'success' && id === 'login')
                  ? 'bg-brand-500/15 text-brand-400'
                  : 'text-parchment-400 hover:text-parchment-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'success' ? (
          <div className="mt-6 rounded-lg border border-gold-400/30 bg-gold-400/5 p-4">
            <p className="text-sm leading-relaxed text-parchment-200">{successMsg}</p>
            <p className="mt-2 text-xs leading-relaxed text-parchment-400">
              {cloudMode
                ? '申请会提交到云端，管理员可在账号管理中审核。'
                : '审核通过后，用注册用户名登录即可进入个人主页。当前申请只保存在提交设备，其他设备的管理员无法收到。'}
            </p>
            <button
              type="button"
              onClick={() => {
                setTab('login')
                setUsername(cloudMode ? regEmail : regUsername)
              }}
              className="mt-4 w-full rounded-md border border-brand-500/50 py-2 text-sm tracking-[0.2em] text-brand-400 transition-colors hover:bg-brand-500/10"
            >
              去登录
            </button>
          </div>
        ) : tab === 'login' ? (
          <form
            className="mt-5"
            onSubmit={(event) => {
              event.preventDefault()
              void submitLogin()
            }}
          >
            <label className="block">
              <span className={labelCls}>{cloudMode ? '邮箱' : '用户名'}</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder={cloudMode ? 'Supabase 登录邮箱' : '用户名'}
                type={cloudMode ? 'email' : 'text'}
                autoComplete={cloudMode ? 'email' : 'username'}
                autoFocus
                className={inputCls}
                required
              />
            </label>
            <div className="relative mt-3">
              <span className={labelCls}>密码</span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="密码"
                autoComplete="current-password"
                className={`${inputCls} pr-14`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute bottom-2 right-2 font-mono text-[10px] tracking-[0.15em] text-parchment-500 transition-colors hover:text-brand-400"
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
            <button
              type="submit"
              disabled={busy || !accountsReady || !hydrated}
              data-testid="account-login-submit"
              className="mt-5 w-full rounded-md bg-brand-500 py-2.5 text-sm tracking-[0.2em] text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
            >
              {!accountsReady || !hydrated ? '正在读取资料…' : busy ? '正在登录…' : '登录'}
            </button>
            <p className="mt-4 border-t border-white/10 pt-3 text-xs leading-relaxed text-parchment-500">
              {cloudMode
                ? '已连接云端账号。管理员可编辑共享站点内容；成员账号需审核后启用，且只能维护自己的公开资料。'
                : '当前账号与编辑内容保存在本机浏览器。不同设备之间不会实时同步，管理员权限也不是线上服务器鉴权。'}
            </p>
          </form>
        ) : (
          <form
            className="mt-5"
            onSubmit={(event) => {
              event.preventDefault()
              void submitRegister()
            }}
          >
            <label className="block">
              <span className={labelCls}>登录用户名（唯一，2-24 位中英文/数字/下划线）</span>
              <input
                value={regUsername}
                onChange={(event) => setRegUsername(event.target.value)}
                placeholder="如 tiantu_fan"
                autoComplete="username"
                className={inputCls}
                required
              />
            </label>
            {cloudMode && (
              <label className="mt-3 block">
                <span className={labelCls}>登录邮箱（用于验证与密码找回）</span>
                <input
                  value={regEmail}
                  onChange={(event) => setRegEmail(event.target.value)}
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  className={inputCls}
                  required
                />
              </label>
            )}
            <label className="mt-3 block">
              <span className={labelCls}>想展示的昵称（会显示在个人主页上）</span>
              <input
                value={regName}
                onChange={(event) => setRegName(event.target.value)}
                placeholder="如：山河绘图员"
                className={inputCls}
                autoComplete="nickname"
                required
              />
            </label>
            <label className="mt-3 block">
              <span className={labelCls}>{cloudMode ? '密码（至少 8 位）' : '密码（至少 4 位）'}</span>
              <input
                type="password"
                value={regPassword}
                onChange={(event) => setRegPassword(event.target.value)}
                placeholder="设置登录密码"
                autoComplete="new-password"
                minLength={cloudMode ? 8 : 4}
                className={inputCls}
                required
              />
            </label>
            <label className="mt-3 block">
              <span className={labelCls}>申请说明 / 自我介绍（选填）</span>
              <textarea
                value={regNote}
                onChange={(event) => setRegNote(event.target.value)}
                rows={3}
                placeholder="简单介绍你的制图/创作经历"
                className={`${inputCls} resize-y leading-relaxed`}
              />
            </label>
            {error && <p className="mt-3 font-mono text-xs leading-relaxed text-brand-400">{error}</p>}
            <button
              type="submit"
              disabled={busy || !accountsReady || !hydrated}
              data-testid="account-register-submit"
              className="mt-5 w-full rounded-md bg-brand-500 py-2.5 text-sm tracking-[0.2em] text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
            >
              {!accountsReady || !hydrated ? '正在读取资料…' : busy ? '提交中…' : '提交注册申请'}
            </button>
            <p className="mt-3 text-xs leading-relaxed text-parchment-500">
              {cloudMode
                ? '仅可注册成员账号；申请会进入云端审核队列，通过后生成个人主页与作品入口。'
                : '仅可注册成员账号；申请经管理员审核后生成个人主页与作品入口。当前申请只保存在此设备，其他设备的管理员暂时无法收到。'}
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
