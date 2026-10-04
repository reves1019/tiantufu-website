import { useEffect, useMemo, useRef, useState } from 'react'
import { useContent } from '../lib/contentStore'
import EditableText from './admin/EditableText'
import { setActiveMemberId } from '../lib/memberBus'
import { setActiveNewsIndex } from '../lib/newsBus'
import { COMMISSION_INDEX, FAQ_INDEX, MEMBER_INDEX, NEWS_DETAIL_INDEX, NEWS_INDEX, TOPIC_INDEX, WORKS_INDEX } from '../lib/pages'
import { buildSearchIndex, searchEntries, type SearchEntry } from '../lib/searchIndex'
import { requestScene } from '../lib/sceneBus'
import { setActiveTopicId } from '../lib/topicBus'

const PER_TYPE_LIMIT: Partial<Record<SearchEntry['type'], number>> = {
  page: 5,
  news: 5,
  member: 6,
  topic: 4,
  faq: 4,
  contest: 3,
}
const TOTAL_LIMIT = 24

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim()
  if (!q) return <>{text}</>
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-brand-500/30 px-0.5 text-parchment-100">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  )
}

/** 全局站内搜索：Ctrl+K / / / 导航栏搜索按钮唤起，↑↓ 选择、回车跳转、Esc 关闭 */
export default function SearchOverlay() {
  const { content } = useContent()
  const ui = content.ui.search
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const wasOpenRef = useRef(false)

  const openSearch = () => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setOpen(true)
  }

  const entries = useMemo(() => buildSearchIndex(content), [content])
  const results = useMemo(() => {
    const all = searchEntries(entries, query)
    const counts: Partial<Record<SearchEntry['type'], number>> = {}
    const out: SearchEntry[] = []
    for (const entry of all) {
      const limit = PER_TYPE_LIMIT[entry.type] ?? 3
      const count = counts[entry.type] ?? 0
      if (count >= limit) continue
      counts[entry.type] = count + 1
      out.push(entry)
      if (out.length >= TOTAL_LIMIT) break
    }
    return out
  }, [entries, query])

  // Restore focus to the control that opened the search after every close path
  // (Escape, backdrop, close button, or selecting a result).
  useEffect(() => {
    if (open) {
      wasOpenRef.current = true
      return
    }
    if (!wasOpenRef.current) return
    wasOpenRef.current = false
    const trigger = returnFocusRef.current
    returnFocusRef.current = null
    if (trigger?.isConnected) window.setTimeout(() => trigger.focus(), 0)
  }, [open])

  // The app uses per-page scroll containers, so locking body overflow alone
  // does not stop the page behind the search sheet from moving. Inert the
  // other app layers and pause those containers while the dialog is open.
  useEffect(() => {
    if (!open) return
    const panel = dialogRef.current
    const overlay = panel?.parentElement
    const host = overlay?.parentElement
    if (!overlay || !host) return
    const siblings = Array.from(host.children).filter((node) => node !== overlay) as HTMLElement[]
    const previousInert = siblings.map((node) => node.inert)
    siblings.forEach((node) => { node.inert = true })
    const roots = Array.from(document.querySelectorAll<HTMLElement>('[data-scroll-root]'))
    const previousScroll = roots.map((root) => ({ overflowY: root.style.overflowY, overscrollBehavior: root.style.overscrollBehavior }))
    roots.forEach((root) => { root.style.overflowY = 'hidden'; root.style.overscrollBehavior = 'none' })
    return () => {
      siblings.forEach((node, index) => { node.inert = previousInert[index] })
      roots.forEach((root, index) => {
        root.style.overflowY = previousScroll[index].overflowY
        root.style.overscrollBehavior = previousScroll[index].overscrollBehavior
      })
    }
  }, [open])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const editing = (event.target as HTMLElement | null)?.closest?.('input, textarea, [contenteditable="true"]')
      if (event.key === 'Escape') {
        setOpen(false)
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        openSearch()
        return
      }
      if (event.key === '/' && !editing) {
        event.preventDefault()
        openSearch()
      }
    }
    const onOpen = openSearch
    window.addEventListener('keydown', onKey)
    window.addEventListener('ttf-search-open', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('ttf-search-open', onOpen)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      window.setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  useEffect(() => setActiveIndex(0), [query])

  const close = () => setOpen(false)

  const onDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'),
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

  const openResult = (entry: SearchEntry) => {
    setOpen(false)
    const target = entry.target
    if (target.kind === 'member') {
      setActiveMemberId(target.id)
      requestScene(MEMBER_INDEX)
    } else if (target.kind === 'work') {
      const member = content.members.find((m) => m.name === target.author)
      if (member) {
        setActiveMemberId(member.id)
        requestScene(MEMBER_INDEX)
      } else {
        requestScene(WORKS_INDEX)
      }
    } else if (target.kind === 'topic') {
      setActiveTopicId(target.id)
      requestScene(TOPIC_INDEX)
    } else if (target.kind === 'news') {
      setActiveNewsIndex(target.index)
      requestScene(NEWS_DETAIL_INDEX)
    } else if (target.kind === 'faq') {
      requestScene(FAQ_INDEX)
    } else {
      requestScene(target.index)
    }
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((v) => Math.min(v + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((v) => Math.max(v - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const entry = results[activeIndex]
      if (entry) openResult(entry)
    }
  }

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-search-index="${activeIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  if (!open) return null

  const quickLinks = [
    { label: ui.quickWorks, path: 'ui.search.quickWorks', index: WORKS_INDEX },
    { label: ui.quickNews, path: 'ui.search.quickNews', index: NEWS_INDEX },
    { label: ui.quickFaq, path: 'ui.search.quickFaq', index: FAQ_INDEX },
    { label: ui.quickCommission, path: 'ui.search.quickCommission', index: COMMISSION_INDEX },
  ]

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center overscroll-contain bg-black/60 px-4 pt-[10vh] backdrop-blur-sm"
      onClick={close}
      onKeyDown={onDialogKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label={ui.label}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-[720px] overflow-hidden rounded-2xl border border-white/10 bg-ink-900/95 shadow-[0_0_80px_rgba(199,27,27,0.22)] backdrop-blur-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-brand-400" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <polyline points="16 16 21 21" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={ui.placeholder}
            aria-label={ui.keywordLabel}
            aria-controls="global-search-results"
            aria-activedescendant={query.trim() && results.length > 0 ? `global-search-result-${activeIndex}` : undefined}
            className="min-w-0 flex-1 bg-transparent text-lg text-parchment-100 outline-none placeholder:text-parchment-500"
          />
          <span className="hidden shrink-0 font-mono text-[10px] tracking-[0.2em] text-parchment-500 sm:block">
            <EditableText as="span" value={ui.shortcutHint} path="ui.search.shortcutHint" />
          </span>
          <button
            type="button"
            onClick={close}
            aria-label="关闭搜索"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-white/10 text-lg text-parchment-400 transition-colors hover:border-brand-500/50 hover:text-brand-400"
          >
            ×
          </button>
        </div>

        <div
          ref={listRef}
          id="global-search-results"
          role={query.trim() && results.length > 0 ? 'listbox' : undefined}
          aria-label={query.trim() && results.length > 0 ? ui.label : undefined}
          className="max-h-[55vh] overflow-y-auto p-2"
        >
          {query.trim() ? (
            results.length > 0 ? (
              results.map((entry, i) => {
                const showHeader = i === 0 || results[i - 1].type !== entry.type
                const active = i === activeIndex
                return (
                  <div key={entry.id} role="presentation">
                    {showHeader && (
                      <p role="presentation" className="px-3 pb-1 pt-3 font-mono text-[10px] tracking-[0.35em] text-brand-400">
                        <EditableText
                          as="span"
                          value={ui.typeLabels[entry.type]}
                          path={`ui.search.typeLabels.${entry.type}`}
                        />
                      </p>
                    )}
                    <button
                      type="button"
                      id={`global-search-result-${i}`}
                      role="option"
                      aria-selected={active}
                      data-search-index={i}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => openResult(entry)}
                      className={`flex w-full flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors duration-150 ${
                        active ? 'border-brand-500/40 bg-brand-500/10' : 'border-transparent hover:bg-white/5'
                      }`}
                    >
                      <span className="truncate text-sm tracking-[0.08em] text-parchment-100">
                        <Highlight text={entry.title} query={query} />
                      </span>
                      <span className="truncate font-mono text-[10px] tracking-[0.12em] text-parchment-500">
                        <Highlight text={entry.subtitle} query={query} />
                      </span>
                    </button>
                  </div>
                )
              })
            ) : (
              <p className="px-4 py-10 text-center font-mono text-xs tracking-[0.3em] text-parchment-500">
                <EditableText as="span" value={ui.empty} path="ui.search.empty" />
              </p>
            )
          ) : (
            <div className="px-4 py-6">
              <p className="font-mono text-[10px] tracking-[0.35em] text-brand-400">
                <EditableText as="span" value={ui.quickLinks} path="ui.search.quickLinks" />
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {quickLinks.map((link) => (
                  <button
                    key={link.label}
                    type="button"
                    onClick={() => {
                      close()
                      requestScene(link.index)
                    }}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 font-mono text-[10px] tracking-[0.2em] text-parchment-300 transition-colors hover:border-brand-500/50 hover:text-brand-400"
                  >
                    <EditableText as="span" value={link.label} path={link.path} />
                  </button>
                ))}
              </div>
              <p className="mt-5 border-t border-white/10 pt-4 font-mono text-[10px] leading-relaxed tracking-[0.2em] text-parchment-500/70">
                <EditableText as="span" value={ui.supports} path="ui.search.supports" />
                <br />
                <EditableText as="span" value={ui.keyboardHint} path="ui.search.keyboardHint" />
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
