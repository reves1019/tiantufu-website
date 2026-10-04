import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useContent } from '../../lib/contentStore'
import ImageField from './ImageField'

interface AccountProfileModalProps {
  open: boolean
  onClose: () => void
}

/** 账号可自助维护的公开身份信息；成员权限不延伸到作品、分类或站点文案。 */
export default function AccountProfileModal({ open, onClose }: AccountProfileModalProps) {
  const { account, content, accountUpdateMeta, accountsReady, hydrated, saveState, accountSaveState, cloudMode } = useContent()
  const linkedMember = useMemo(
    () => (account?.memberId ? content.members.find((member) => member.id === account.memberId) : undefined),
    [account?.memberId, content.members],
  )
  const accountId = account?.id
  const accountUsername = account?.username
  const accountDisplayName = account?.displayName
  const accountBio = account?.bio
  const accountAvatar = account?.avatar
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatar, setAvatar] = useState('')
  const [notice, setNotice] = useState('')
  const [submitBusy, setSubmitBusy] = useState(false)
  const initialProfile = useRef({ displayName: '', bio: '', avatar: '' })
  const initializedFor = useRef<string | undefined>(undefined)
  initialProfile.current = {
    displayName: linkedMember?.name || accountDisplayName || accountUsername || '',
    bio: linkedMember?.bio?.trim() ? linkedMember.bio : accountBio ?? '',
    avatar: linkedMember?.avatar || accountAvatar || '',
  }

  useEffect(() => {
    if (!open) { initializedFor.current = undefined; return }
    if (!accountId || !accountsReady || !hydrated || initializedFor.current === accountId) return
    initializedFor.current = accountId
    // Initialize on opening/account change only. Realtime refreshes must not
    // replace unsaved keystrokes or an uploaded avatar in an open form.
    setDisplayName(initialProfile.current.displayName)
    setBio(initialProfile.current.bio)
    setAvatar(initialProfile.current.avatar)
    setNotice('')
  }, [open, accountId, accountsReady, hydrated])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open || !account) return null

  const ready = accountsReady && hydrated
  const saving = submitBusy || saveState === 'saving' || accountSaveState === 'saving'
  const failed = saveState === 'error' || accountSaveState === 'error'
  const inputClass =
    'mt-1 w-full rounded-md border border-white/15 bg-ink-950 px-3 py-2.5 text-sm text-parchment-100 outline-none transition-colors focus:border-brand-500 disabled:opacity-50'

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!ready || submitBusy) return
    const name = displayName.trim()
    if (!name) {
      setNotice('请填写展示昵称。')
      return
    }
    setSubmitBusy(true)
    setNotice('正在保存账号与个人主页资料…')
    try {
      const result = await accountUpdateMeta({ displayName: name, bio, avatar })
      setNotice(result.ok ? (cloudMode ? '资料已保存并同步到云端。' : '资料已保存到当前设备。') : result.error ?? '资料暂未保存。')
    } catch {
      setNotice('保存遇到意外错误；请保持页面并检查浏览器存储后重试。')
    } finally {
      setSubmitBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[96] flex items-center justify-center bg-black/78 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-profile-title"
        className="max-h-[min(88dvh,780px)] w-[min(560px,96vw)] overflow-y-auto border border-brand-500/30 bg-ink-900 p-5 shadow-[0_24px_72px_rgba(0,0,0,0.58)] sm:p-7"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 id="account-profile-title" className="font-display text-xl text-parchment-100 sm:text-2xl">
              编辑公开资料
            </h2>
            <p className="mt-1 font-mono text-xs text-parchment-400">@{account.username} · 个人主页身份</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭资料编辑"
            className="min-h-10 min-w-10 border border-white/15 text-sm text-parchment-300 transition-colors hover:border-brand-500/60 hover:text-brand-400"
          >
            关闭
          </button>
        </div>

        {!ready ? (
          <p role="status" className="py-8 text-sm text-parchment-300">正在读取账号和主页资料…</p>
        ) : (
          <form className="mt-5 space-y-5" onSubmit={(event) => void submit(event)} aria-busy={saving}>
            <label className="block text-sm text-parchment-300">
              展示昵称
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                autoComplete="nickname"
                maxLength={40}
                className={inputClass}
                required
              />
            </label>

            <ImageField label="公开头像" value={avatar} onChange={setAvatar} />

            <label className="block text-sm text-parchment-300">
              个人介绍
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                maxLength={1200}
                rows={5}
                className={`${inputClass} resize-y leading-relaxed`}
                placeholder="介绍你的地图创作、研究兴趣或加入天图府的经历。"
              />
              <span className="mt-1 block text-right font-mono text-xs text-parchment-500">{bio.length}/1200</span>
            </label>

            <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p role="status" className={`min-h-5 text-xs ${failed ? 'text-brand-400' : 'text-parchment-400'}`}>
                {failed
                  ? cloudMode
                    ? '云端保存失败：请保持当前页面，检查连接后重试。'
                    : '保存失败：请保持当前页面，检查浏览器存储空间后再试。'
                  : saving
                    ? '保存中…'
                    : notice || (cloudMode ? '修改会同步到云端，并更新公开个人主页。' : '修改会立即显示，并保存到当前设备。')}
              </p>
              <button
                type="submit"
                disabled={saving || !ready}
                className="min-h-11 shrink-0 bg-brand-500 px-5 text-sm tracking-[0.12em] text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? '保存中…' : '保存资料'}
              </button>
            </div>
            <p className="text-xs leading-relaxed text-parchment-500">
              {cloudMode
                ? '成员仅能编辑自己的昵称、头像和简介；头像会上传到共享素材库。'
                : '此网站当前使用本机浏览器存储；其他设备不会自动收到资料变更。公开站点实时协作需接入服务端。'}
            </p>
          </form>
        )}
      </section>
    </div>
  )
}
