import { useRef, useState } from 'react'
import { useContent } from '../../lib/contentStore'
import CredentialsModal from './CredentialsModal'
import AccountProfileModal from './AccountProfileModal'

/** 管理员工具栏：内容管理 / 账号审核 / 导出 / 导入 / 恢复默认 / 修改密码 / 退出 */
export default function AdminToolbar() {
  const {
    admin,
    logoutAccount,
    account,
    exportJson,
    importJson,
    reset,
    saveState,
    accountSaveState,
    saveError,
    clearSaveError,
    hydrated,
    accountsReady,
    accounts,
    cloudMode,
    cloudSyncState,
  } = useContent()
  const fileRef = useRef<HTMLInputElement>(null)
  const [credOpen, setCredOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  if (!admin) return null

  const handleImport = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      void (async () => {
        try {
          const result = await importJson(String(reader.result ?? ''))
          window.alert(result.ok ? '导入并保存成功，页面内容已更新' : `导入失败：${result.error ?? '请检查 JSON 文件'}`)
        } catch {
          window.alert('导入失败：浏览器存储未能确认写入，原有内容保持不变')
        }
      })()
    }
    reader.onerror = () => window.alert('文件读取失败，请重新选择 JSON 文件')
    reader.readAsText(file)
  }

  const handleExport = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'tiantufu-content.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const pendingCount = accounts.filter((a) => a.role === 'member' && a.status === 'pending').length
  const statusText = cloudMode
    ? cloudSyncState === 'ready'
      ? saveState === 'saving'
        ? '正在同步…'
        : saveState === 'error'
          ? '云端保存失败'
          : '云端已同步'
      : cloudSyncState === 'conflict'
        ? '云端版本冲突 · 草稿已保留'
        : cloudSyncState === 'uninitialized'
        ? '等待首次同步'
        : cloudSyncState === 'error'
          ? '云端连接异常'
          : '连接云端…'
    : saveState === 'error'
      ? '保存失败'
      : saveState === 'saving'
        ? '保存中…'
        : saveState === 'saved'
          ? '已保存'
          : hydrated
            ? '就绪'
            : '加载中…'
  const accountStatusText =
    accountSaveState === 'error'
      ? '账号存储失败'
      : accountSaveState === 'saving'
        ? '账号保存中…'
          : accountSaveState === 'saved'
          ? cloudMode ? '云端账号已就绪' : '账号已保存'
          : '账号加载中…'

  const btnCls = 'font-mono text-[11px] tracking-[0.2em] text-parchment-300 transition-colors hover:text-brand-400 disabled:cursor-not-allowed disabled:opacity-45'

  return (
    <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-[70] mx-auto flex max-h-[30dvh] max-w-[1200px] flex-wrap items-center justify-center gap-x-3 gap-y-1.5 overflow-y-auto border border-brand-500/35 bg-ink-950/96 px-3 py-2 shadow-[0_16px_44px_rgba(0,0,0,0.46)] backdrop-blur-md sm:bottom-5 sm:inset-x-auto sm:w-max sm:rounded-md sm:px-5">
      <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] text-brand-400">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />
        管理员模式 · @{account?.username ?? ''}
      </span>
      <span className="hidden h-4 w-px bg-white/15 sm:block" />
      <span
        className={`font-mono text-[10px] tracking-[0.15em] ${
          saveState === 'error' ? 'text-brand-400' : 'text-parchment-500'
        }`}
        title={cloudMode ? '内容变更由 Supabase 实时同步，并保留本机缓存' : '修改会实时保存到浏览器（IndexedDB），刷新后仍然保留'}
      >
        {statusText}
      </span>
      <span
        className={`font-mono text-[10px] tracking-[0.12em] ${accountSaveState === 'error' ? 'text-brand-400' : 'text-parchment-500'}`}
        title={cloudMode ? '账号与审核状态来自 Supabase' : '账号资料保存在本机浏览器；多设备实时协作需要服务端同步'}
      >
        {accountStatusText}
      </span>
      {saveError && (
        <span className="flex items-center gap-2 rounded-full border border-brand-500/60 bg-brand-500/15 px-3 py-1 font-mono text-[10px] tracking-[0.15em] text-brand-400">
          保存失败：请先导出 JSON 备份，再重试
          <button type="button" onClick={clearSaveError} className="text-parchment-400 hover:text-parchment-100">
            ×
          </button>
        </span>
      )}
      <span className="hidden h-4 w-px bg-white/15 sm:block" />
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('ttf-content-manager-open'))}
        disabled={!hydrated}
        className={btnCls}
      >
        {hydrated ? '内容管理' : '内容加载中…'}
      </button>
      <span className="hidden h-4 w-px bg-white/15 sm:block" />
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('ttf-accounts-manager-open'))}
        disabled={!hydrated || !accountsReady}
        className={btnCls}
      >
        {hydrated && accountsReady ? `账号管理${pendingCount > 0 ? `（待审 ${pendingCount}）` : ''}` : '账号加载中…'}
      </button>
      <span className="hidden h-4 w-px bg-white/15 sm:block" />
      <button type="button" onClick={handleExport} disabled={!hydrated} className={btnCls}>
        导出 JSON
      </button>
      <button type="button" onClick={() => setProfileOpen(true)} disabled={!accountsReady || !hydrated} className={btnCls}>
        账号资料
      </button>
      <button type="button" onClick={() => fileRef.current?.click()} disabled={!hydrated} className={btnCls}>
        导入 JSON
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) handleImport(file)
          event.target.value = ''
        }}
      />
      <button
        type="button"
        onClick={() => {
          if (hydrated && window.confirm('恢复为默认内容？当前修改将丢失（可先导出 JSON 备份）。')) reset()
        }}
        disabled={!hydrated}
        className={btnCls}
      >
        恢复默认
      </button>
      <button type="button" onClick={() => setCredOpen(true)} disabled={!accountsReady} className={btnCls}>
        修改密码
      </button>
      <button
        type="button"
        onClick={() => {
          logoutAccount()
        }}
        className="font-mono text-[11px] tracking-[0.2em] text-brand-400 transition-colors hover:text-parchment-100"
      >
        退出登录
      </button>
      <CredentialsModal open={credOpen} onClose={() => setCredOpen(false)} />
      <AccountProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  )
}
