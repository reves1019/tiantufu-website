import { useRef, useState } from 'react'
import { logout } from '../../lib/authStore'
import { useContent } from '../../lib/contentStore'
import CredentialsModal from './CredentialsModal'

/** 管理员工具栏：内容管理 / 导出 / 导入 / 恢复默认 / 修改登录信息 / 退出 */
export default function AdminToolbar() {
  const { admin, setAdmin, exportJson, importJson, reset, saveError, clearSaveError } = useContent()
  const fileRef = useRef<HTMLInputElement>(null)
  const [credOpen, setCredOpen] = useState(false)

  if (!admin) return null

  const handleImport = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const ok = importJson(String(reader.result ?? ''))
      window.alert(ok ? '导入成功，内容已更新' : '导入失败：JSON 格式不正确')
    }
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

  return (
    <div className="fixed bottom-5 left-1/2 z-[70] flex max-w-[96vw] -translate-x-1/2 flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-2xl border border-brand-500/40 bg-ink-950/90 px-6 py-2.5 shadow-[0_0_32px_rgba(199,27,27,0.35)] backdrop-blur-xl">
      <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] text-brand-400">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />
        管理员模式 · 点击文字直接编辑
      </span>
      {saveError && (
        <span className="flex items-center gap-2 rounded-full border border-brand-500/60 bg-brand-500/15 px-3 py-1 font-mono text-[10px] tracking-[0.15em] text-brand-400">
          内容保存失败（浏览器存储可能已满）：请导出 JSON 备份，或将图片改用“上传目录”模式
          <button type="button" onClick={clearSaveError} className="text-parchment-400 hover:text-parchment-100">
            ×
          </button>
        </span>
      )}
      <span className="hidden h-4 w-px bg-white/15 sm:block" />
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('ttf-content-manager-open'))}
        className="font-mono text-[11px] tracking-[0.2em] text-parchment-100 transition-colors hover:text-brand-400"
      >
        内容管理
      </button>
      <span className="hidden h-4 w-px bg-white/15 sm:block" />
      <button type="button" onClick={handleExport} className="font-mono text-[11px] tracking-[0.2em] text-parchment-300 transition-colors hover:text-brand-400">
        导出 JSON
      </button>
      <button type="button" onClick={() => fileRef.current?.click()} className="font-mono text-[11px] tracking-[0.2em] text-parchment-300 transition-colors hover:text-brand-400">
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
          if (window.confirm('恢复为默认内容？当前修改将丢失（可先导出 JSON 备份）。')) reset()
        }}
        className="font-mono text-[11px] tracking-[0.2em] text-parchment-300 transition-colors hover:text-brand-400"
      >
        恢复默认
      </button>
      <button type="button" onClick={() => setCredOpen(true)} className="font-mono text-[11px] tracking-[0.2em] text-parchment-300 transition-colors hover:text-brand-400">
        修改登录信息
      </button>
      <button
        type="button"
        onClick={() => {
          logout()
          setAdmin(false)
        }}
        className="font-mono text-[11px] tracking-[0.2em] text-brand-400 transition-colors hover:text-parchment-100"
      >
        退出管理
      </button>
      <CredentialsModal open={credOpen} onClose={() => setCredOpen(false)} />
    </div>
  )
}
