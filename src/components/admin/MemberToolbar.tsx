import { useState } from 'react'
import { useContent } from '../../lib/contentStore'
import { STUDIO_INDEX, WORKS_INDEX } from '../../lib/pages'
import { setActiveMemberId } from '../../lib/memberBus'
import { requestScene } from '../../lib/sceneBus'
import AccountProfileModal from './AccountProfileModal'
import CredentialsModal from './CredentialsModal'
import { useCommunityAccess } from '../../lib/useCommunityAccess'

/** 成员仅能维护公开昵称、头像与个人介绍；作品、分类及站点文案由管理员负责。 */
export default function MemberToolbar() {
  const { account, admin, logoutAccount, accountsReady, hydrated, cloudMode } = useContent()
  const [profileOpen, setProfileOpen] = useState(false)
  const [credOpen, setCredOpen] = useState(false)
  const access = useCommunityAccess()
  const ready = accountsReady && hydrated

  const isMember = !!account && account.role === 'member' && account.status === 'approved' && !admin
  if (!isMember) return null

  const goHome = () => {
    requestScene(STUDIO_INDEX)
  }

  const goWorks = () => {
    if (!account.memberId) return
    setActiveMemberId(account.memberId)
    requestScene(WORKS_INDEX)
  }

  const buttonClass =
    'min-h-10 px-3 text-xs tracking-[0.08em] text-parchment-300 transition-colors hover:text-brand-400 focus-visible:outline-offset-2 sm:px-2'

  return (
    <>
      <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-[70] mx-auto flex max-w-[820px] flex-wrap items-center justify-center gap-x-1 gap-y-1 border border-brand-500/35 bg-ink-950/95 px-3 py-2 shadow-[0_16px_44px_rgba(0,0,0,0.42)] backdrop-blur-md sm:bottom-5 sm:inset-x-auto sm:w-max sm:gap-x-2 sm:rounded-md sm:px-5">
        <span className="basis-full text-center font-mono text-[11px] tracking-[0.08em] text-parchment-300 sm:basis-auto sm:text-left">
          <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-brand-400" aria-hidden="true" />
          成员 · {account.displayName || account.username}
          <span className="ml-2 text-parchment-500">{cloudMode ? '云端资料' : '本机资料'}</span>
        </span>
        <span className="hidden h-5 w-px bg-white/15 sm:block" aria-hidden="true" />
        <button type="button" disabled={!ready} onClick={goHome} className={buttonClass}>
          我的主页
        </button>
        <button type="button" disabled={!ready || !access.canEdit} title={access.canEdit ? '编辑自己的展示资料' : '需要创作者权限'} onClick={() => setProfileOpen(true)} className={buttonClass}>
          编辑资料
        </button>
        <button type="button" disabled={!ready} onClick={goWorks} className={buttonClass}>
          我的作品
        </button>
        <a href="#community?tab=mine" className={buttonClass}>我的图库</a>
        <a href="#palace" className={buttonClass}>图寻</a>
        <button type="button" onClick={() => setCredOpen(true)} className={buttonClass}>
          修改密码
        </button>
        <button
          type="button"
          onClick={logoutAccount}
          className="min-h-10 px-3 text-xs text-brand-400 transition-colors hover:text-parchment-100"
        >
          退出
        </button>
      </div>

      <AccountProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <CredentialsModal open={credOpen} onClose={() => setCredOpen(false)} />
    </>
  )
}
