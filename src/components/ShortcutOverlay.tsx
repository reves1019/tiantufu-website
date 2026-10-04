import { useEffect, useRef, useState } from 'react'
import { site } from '../config/site'
import { useContent } from '../lib/contentStore'
import { requestScene } from '../lib/sceneBus'
import { MOTION_PREFERENCE_EVENT, readMotionPreference, setMotionPreference, systemReducedMotion } from '../lib/motionPreference'

/** 键盘快捷键：数字 1-6 切换主页面，B 返回上一页，? 打开/关闭提示面板 */
export default function ShortcutOverlay() {
  const { content } = useContent()
  const navItems = content.site.nav?.length ? content.site.nav : site.nav
  const [open, setOpen] = useState(false)
  const [motionMode, setMotionMode] = useState(readMotionPreference)
  const [systemReduced, setSystemReduced] = useState(systemReducedMotion)
  const dialogRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest?.('.map-reader')) return
      if (target?.closest?.('input, textarea, [contenteditable="true"]')) return
      if (event.key === 'Escape') {
        setOpen(false)
        return
      }
      if (event.key === '?') {
        event.preventDefault()
        setOpen((v) => {
          if (!v) returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
          return !v
        })
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

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true
      const frame = window.requestAnimationFrame(() => {
        dialogRef.current?.querySelector<HTMLElement>('button:not([disabled]), [tabindex]:not([tabindex="-1"])')?.focus()
      })
      return () => window.cancelAnimationFrame(frame)
    }
    if (!wasOpenRef.current) return
    wasOpenRef.current = false
    const trigger = returnFocusRef.current
    returnFocusRef.current = null
    if (trigger?.isConnected) window.setTimeout(() => trigger.focus(), 0)
  }, [open])

  useEffect(() => {
    const onMotionPreference = (event: Event) => {
      const detail = (event as CustomEvent<{ preference?: 'system' | 'reduce' }>).detail
      setMotionMode(detail?.preference === 'reduce' ? 'reduce' : 'system')
      setSystemReduced(systemReducedMotion())
    }
    window.addEventListener(MOTION_PREFERENCE_EVENT, onMotionPreference)
    return () => window.removeEventListener(MOTION_PREFERENCE_EVENT, onMotionPreference)
  }, [])

  const toggleMotionPreference = () => {
    setMotionPreference(motionMode === 'reduce' ? 'system' : 'reduce')
  }

  const onDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'),
    )
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  if (!open) return null

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}
      onKeyDown={onDialogKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcut-overlay-title"
    >
      <div
        className="w-[min(460px,88vw)] rounded-xl border border-white/10 bg-ink-900/95 p-7 shadow-[0_0_60px_rgba(199,27,27,0.25)] backdrop-blur-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="shortcut-overlay-title" className="font-mono text-xs tracking-[0.5em] text-brand-400">SHORTCUTS · 快捷键</h2>
        <div className="mt-5 space-y-3 font-mono text-xs tracking-[0.15em] text-parchment-300">
          {navItems.map((item, i) => (
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
          <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-3">
            <div className="min-w-0">
              <span className="block">动效偏好</span>
              <span className="mt-1 block text-[10px] tracking-normal text-parchment-500">
                {motionMode === 'reduce' ? '已减少动效' : systemReduced ? '跟随系统（当前已减少）' : '跟随系统'}
              </span>
            </div>
            <button
              type="button"
              className="rounded border border-brand-400/60 bg-brand-500/10 px-3 py-1.5 text-[10px] tracking-[0.12em] text-brand-300 transition-[background-color,border-color,color,transform] hover:-translate-y-0.5 hover:bg-brand-500/20"
              aria-pressed={motionMode === 'reduce'}
              onClick={toggleMotionPreference}
            >
              {motionMode === 'reduce' ? '恢复系统' : '减少动效'}
            </button>
          </div>
        </div>
        <p className="mt-6 border-t border-white/10 pt-4 font-mono text-[10px] tracking-[0.25em] text-parchment-500">
          提示：在输入框或管理员编辑时快捷键自动暂停
        </p>
      </div>
    </div>
  )
}
