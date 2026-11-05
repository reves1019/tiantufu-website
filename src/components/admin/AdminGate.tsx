import { useEffect, useState } from 'react'
import { useContent } from '../../lib/contentStore'
import { STUDIO_INDEX } from '../../lib/pages'
import { requestScene } from '../../lib/sceneBus'
import { useDialogFocus } from '../../lib/useDialogFocus'
import { confirmRegistrationEmail, resendRegistrationEmail } from '../../lib/emailRegistration'
import { communityError } from '../../lib/community'

type GateTab = 'login' | 'register' | 'success'

export default function AdminGate() {
  const { gateOpen, closeGate, loginAccount, registerAccount, refreshAccounts, accountsReady, hydrated, cloudMode, account } = useContent()
  const [tab, setTab] = useState<GateTab>('login')
  const [username, setUsername] = useState(''), [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false), [showPassword, setShowPassword] = useState(false)
  const [regEmail, setRegEmail] = useState(''), [regName, setRegName] = useState(''), [regPassword, setRegPassword] = useState('')
  const [token, setToken] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [cooldown, setCooldown] = useState(0)
  const dialog = useDialogFocus<HTMLDivElement>(gateOpen, closeGate)
  useEffect(() => { if (gateOpen) void refreshAccounts() }, [gateOpen, refreshAccounts])
  useEffect(() => {
    const onRegister = () => { setTab('register'); setError('') }
    window.addEventListener('ttf-gate-register', onRegister)
    return () => window.removeEventListener('ttf-gate-register', onRegister)
  }, [])
  useEffect(() => { if (!cooldown) return; const timer = setTimeout(() => setCooldown(s => s - 1), 1000); return () => clearTimeout(timer) }, [cooldown])
  useEffect(() => {
    if (gateOpen && tab === 'success' && account?.status === 'approved') { closeGate(); setTab('login'); requestScene(STUDIO_INDEX) }
  }, [account, gateOpen, tab, closeGate])
  const run = async (action: () => Promise<void>) => { if (busy) return; setBusy(true); setError(''); try { await action() } catch(e) { setError(communityError(e)) } finally { setBusy(false) } }
  if (!gateOpen) return null
  const ready = accountsReady && hydrated
  const inputCls = 'w-full rounded-md border border-white/15 bg-ink-950 px-3 py-2 text-sm text-parchment-100 outline-none transition-colors focus:border-brand-500'
  const labelCls = 'mb-2 block text-xs tracking-[0.12em] text-parchment-400'
  const submitCls = 'mt-5 w-full rounded-md bg-brand-500 py-2.5 text-sm tracking-[0.2em] text-white transition-colors hover:bg-brand-600 disabled:opacity-50'
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
    <div ref={dialog} className="max-h-[92vh] w-[min(460px,94vw)] overflow-y-auto rounded-xl border border-brand-500/25 bg-ink-900/95 p-6 shadow-[0_0_44px_rgba(199,27,27,0.28)]" role="dialog" aria-modal="true" aria-labelledby="account-gate-title">
      <div className="flex items-center justify-between"><p id="account-gate-title" className="font-mono text-xs tracking-[0.4em] text-brand-400">天图府 · 账号</p><button type="button" onClick={closeGate} aria-label="关闭" className="rounded-md border border-white/10 px-2 py-1 text-parchment-400">×</button></div>
      <div className="mt-5 flex rounded-lg border border-white/10 p-1">{([['login','登录'],['register','注册']] as [GateTab,string][]).map(([id,label]) => <button key={id} type="button" disabled={busy} onClick={() => { setTab(id); setError('') }} data-testid={`account-${id}-tab`} aria-pressed={tab === id || (tab === 'success' && id === 'register')} className={`flex-1 rounded-md py-2 text-xs tracking-[0.25em] transition-colors ${tab === id || (tab === 'success' && id === 'register') ? 'bg-brand-500/15 text-brand-400' : 'text-parchment-400 hover:text-parchment-100'}`}>{label}</button>)}</div>
      {tab === 'login' ? <form className="mt-5" onSubmit={e => { e.preventDefault(); void run(async () => {
        const result = await loginAccount(username, password, remember)
        if (!result.ok) throw new Error(result.error ?? '登录失败')
        if (!result.isAdmin) requestScene(STUDIO_INDEX)
        setPassword(''); closeGate()
      }) }}>
        <label className="block"><span className={labelCls}>{cloudMode ? '邮箱' : '邮箱 / 原有用户名'}</span><input aria-label="登录邮箱" type={cloudMode ? 'email' : 'text'} autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} placeholder={cloudMode ? 'name@example.com' : '邮箱或原有用户名'} className={inputCls} required disabled={busy} /></label>
        <label className="mt-4 block"><span className={labelCls}>密码</span><div className="relative"><input aria-label="登录密码" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="密码" className={`${inputCls} pr-14`} required disabled={busy} /><button type="button" onClick={() => setShowPassword(s => !s)} className="absolute bottom-2 right-2 text-xs text-parchment-500" aria-label={showPassword ? '隐藏密码' : '显示密码'}>{showPassword ? '隐藏' : '显示'}</button></div></label>
        <label className="mt-3 flex items-center gap-2 text-xs text-parchment-400"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />保持登录</label>
        {error && <p className="mt-3 text-xs text-brand-400" role="alert">{error}</p>}
        <button type="submit" disabled={busy || !ready} data-testid="account-login-submit" className={submitCls}>{!ready ? '正在读取资料…' : busy ? '正在登录…' : '登录'}</button>
      </form> : tab === 'register' ? <form className="mt-5" onSubmit={e => { e.preventDefault(); void run(async () => {
        const result = await registerAccount(regEmail, regName, regPassword)
        if (!result.ok) throw new Error(result.error ?? '注册失败')
        setRegPassword(''); setRegEmail(regEmail.trim().toLowerCase()); setToken(''); setCooldown(60); setTab('success')
      }) }}>
        <label className="block"><span className={labelCls}>邮箱</span><input aria-label="注册邮箱" type="email" autoComplete="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="name@example.com" maxLength={254} className={inputCls} required disabled={busy} /></label>
        <label className="mt-4 block"><span className={labelCls}>昵称</span><input aria-label="昵称" autoComplete="nickname" value={regName} onChange={e => setRegName(e.target.value)} maxLength={40} placeholder="你的昵称" className={inputCls} required disabled={busy} /></label>
        <label className="mt-4 block"><span className={labelCls}>密码</span><input aria-label="注册密码" type="password" autoComplete="new-password" value={regPassword} onChange={e => setRegPassword(e.target.value)} minLength={8} placeholder="至少 8 位" className={inputCls} required disabled={busy} /></label>
        {error && <p className="mt-3 text-xs text-brand-400" role="alert">{error}</p>}
        <button type="submit" disabled={busy || !ready} data-testid="account-register-submit" className={submitCls}>{!ready ? '正在读取资料…' : busy ? '注册中…' : '注册'}</button>
      </form> : <div className="mt-6">
        {cloudMode ? <><p className="text-sm leading-relaxed text-parchment-200">请查看 {regEmail} 的验证邮件。</p><form className="mt-4" onSubmit={e => { e.preventDefault(); void run(async () => { await confirmRegistrationEmail(regEmail, token); await refreshAccounts(); closeGate(); setTab('login'); requestScene(STUDIO_INDEX) }) }}><label><span className={labelCls}>邮箱验证码</span><input aria-label="邮箱验证码" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" maxLength={8} value={token} onChange={e => setToken(e.target.value)} required className={inputCls} /></label><button type="submit" disabled={busy} className={submitCls}>{busy ? '验证中…' : '验证邮箱'}</button></form><button type="button" disabled={busy || cooldown > 0} className="mt-3 text-xs text-parchment-400 disabled:opacity-50" onClick={() => void run(async () => { await resendRegistrationEmail(regEmail); setCooldown(60) })}>{cooldown ? `${cooldown} 秒后可重新发送` : '重新发送邮件'}</button></> : <p className="text-sm text-parchment-200" role="status">账号已创建。</p>}
        {error && <p className="mt-3 text-xs text-brand-400" role="alert">{error}</p>}
        <button type="button" className="mt-4 w-full rounded-md border border-brand-500/50 py-2 text-sm text-brand-400" onClick={() => { setTab('login'); setUsername(regEmail); setError('') }}>去登录</button>
      </div>}
    </div>
  </div>
}
