import { useEffect, useState } from 'react'
import { site } from '../config/site'
import { requestScene } from '../lib/sceneBus'

/** 键盘快捷键：数字 1-6 切换主页面，B 返回上一页，? 打开/关闭提示面板 */
export default function ShortcutOverlay() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest?.('input, textarea, [contenteditable="true"]')) return
      if (event.key === 'Escape') {
        setOpen(false)
        return
      }
      if (event.key === '?') {
        event.preventDefault()
        setOpen((v) => !v)
        return
      }
      if (event.key === 'b' || event.key === 'B') {
        event.preventDefault()
        window.history.back()
        return
      }
      if (/^[1-6]$/.test(event.key)) {
        const index = Number(event.key) - 1
        if (index < site.nav.length) {
          event.preventDefault()
          requestScene(index)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="键盘快捷键"
    >
      <div
        className="w-[min(460px,88vw)] rounded-xl border border-white/10 bg-ink-900/95 p-7 shadow-[0_0_60px_rgba(199,27,27,0.25)] backdrop-blur-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="font-mono text-xs tracking-[0.5em] text-brand-400">SHORTCUTS · 快捷键</p>
        <div className="mt-5 space-y-3 font-mono text-xs tracking-[0.15em] text-parchment-300">
          {site.nav.map((item, i) => (
            <div key={item.href} className="flex items-center justify-between gap-4">
              <span>{item.label}</span>
              <span className="rounded border border-white/15 bg-white/5 px-2 py-0.5 text-brand-400">{i + 1}</span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-4">
            <span>返回上一页</span>
            <span className="rounded border border-white/15 bg-white/5 px-2 py-0.5 text-brand-400">B</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>打开站内搜索</span>
            <span className="rounded border border-white/15 bg-white/5 px-2 py-0.5 text-brand-400">Ctrl K / /</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>关闭 / 打开本面板</span>
            <span className="rounded border border-white/15 bg-white/5 px-2 py-0.5 text-brand-400">?</span>
          </div>
        </div>
        <p className="mt-6 border-t border-white/10 pt-4 font-mono text-[10px] tracking-[0.25em] text-parchment-500">
          提示：在输入框或管理员编辑时快捷键自动暂停
        </p>
      </div>
    </div>
  )
}
