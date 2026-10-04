import { useRef, useState } from 'react'
import EditableText from './admin/EditableText'
import { useContent } from '../lib/contentStore'

interface KeywordDockProps {
  keywords: string[]
  activeKeyword: string
  onSelect: (keyword: string) => void
  onFocusChange: (focused: boolean) => void
  onOpenChange: (open: boolean) => void
}

/**
 * 关键词侧边标签栏（毛玻璃）：
 * - 默认仅露出品牌红色窄条；悬停或点击后整块面板向左平滑滑出，展示 15 个关键词。
 * - 悬停关键词：行高亮（品牌红 + 放大 + 发光），并通过 onSelect 驱动数码地球浮层。
 * - 点击关键词：钉住面板并选中；再次点击红色窄条可收起。
 * 动画仅使用 transform / opacity，保持 60fps。
 */
export default function KeywordDock({
  keywords,
  activeKeyword,
  onSelect,
  onFocusChange,
  onOpenChange,
}: KeywordDockProps) {
  const { content } = useContent()
  const ui = content.ui.keywordDock
  const [open, setOpen] = useState(false)
  // ref 同步标记：避免点击后立即移开鼠标时，React 状态尚未刷新导致误收起
  const pinnedRef = useRef(false)

  const setOpenState = (next: boolean) => {
    setOpen(next)
    onOpenChange(next)
  }

  const setPinnedState = (value: boolean) => {
    pinnedRef.current = value
  }

  const handleEnter = () => {
    setOpenState(true)
    onFocusChange(true)
  }

  const handleLeave = () => {
    if (!pinnedRef.current) setOpenState(false)
    onFocusChange(false)
  }

  const togglePin = () => {
    if (open && pinnedRef.current) {
      // 当前已展开：点击手柄收起并取消钉住
      setPinnedState(false)
      setOpenState(false)
      onFocusChange(false)
    } else {
      // 当前收起：点击手柄展开并钉住
      setPinnedState(true)
      setOpenState(true)
      onFocusChange(true)
    }
  }

  const handleRowClick = (keyword: string) => {
    setPinnedState(true)
    setOpenState(true)
    onSelect(keyword)
  }

  return (
    <div
      className="pointer-events-none absolute right-6 top-1/2 z-30 hidden -translate-y-1/2 lg:block"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      title={ui.heading}
    >
      <div
        className="relative h-[min(500px,72vh)] w-[216px]"
      >
        {/* 玻璃面板主体：在裁剪容器内左右滑动，收起时完全滑出视野 */}
        <div id="keyword-dock-panel" ref={(element) => { if (element) element.inert = !open }} aria-hidden={!open}
          className={`absolute inset-0 right-11 overflow-hidden rounded-l-2xl ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
          <div
            className={`absolute inset-0 rounded-l-2xl border border-white/10 border-r-0 bg-ink-950/60 shadow-[0_0_32px_rgba(199,27,27,0.16)] backdrop-blur-xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              open ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* 展开内容 */}
            <div
              className={`absolute inset-y-0 left-0 right-0 flex flex-col overflow-y-auto px-3 py-3 transition-opacity duration-300 ${
                open ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
            >
              <p className="mb-1.5 shrink-0 font-mono text-[10px] tracking-[0.4em] text-parchment-500">
                <EditableText as="span" value={ui.heading} path="ui.keywordDock.heading" /> · {String(keywords.length).padStart(2, '0')}
              </p>
              <div className="mb-2 shrink-0 h-px w-full bg-gradient-to-r from-brand-500/60 to-transparent" />

              <div className="flex flex-col gap-1">
                {keywords.map((keyword, i) => {
                  const active = keyword === activeKeyword
                  return (
                    <button
                      key={keyword}
                      type="button"
                      onMouseEnter={() => onSelect(keyword)}
                      onClick={() => handleRowClick(keyword)}
                      className={`group/row flex w-full shrink-0 items-center gap-2.5 rounded-md border px-2.5 py-1 text-left transition-[transform,background-color,border-color,color,box-shadow] duration-300 ${
                        active
                          ? 'translate-x-1 scale-[1.02] border-brand-500/60 bg-brand-500/15 text-brand-400 shadow-[0_0_16px_rgba(199,27,27,0.35)]'
                          : 'border-transparent text-parchment-300 hover:translate-x-0.5 hover:bg-white/5 hover:text-parchment-100'
                      }`}
                    >
                      <span
                        className={`shrink-0 font-mono text-[10px] transition-colors duration-300 ${
                          active ? 'text-brand-400' : 'text-parchment-500 group-hover/row:text-brand-400/80'
                        }`}
                      >
                        #{String(i + 1).padStart(2, '0')}
                      </span>
                      <span
                        className={`truncate font-mono text-xs tracking-[0.18em] transition-transform duration-300 ${
                          active ? 'scale-[1.04]' : ''
                        }`}
                      >
                        {keyword}
                      </span>
                    </button>
                  )
                })}
              </div>

              <p className="mt-2 shrink-0 border-t border-white/5 pt-2 font-mono text-[10px] leading-relaxed tracking-[0.2em] text-parchment-500/70">
                <EditableText as="span" value={ui.hoverHint} path="ui.keywordDock.hoverHint" />
                <br />
                <EditableText as="span" value={ui.replaceHint} path="ui.keywordDock.replaceHint" />
              </p>
            </div>
          </div>
        </div>

        {/* 品牌红窄条（固定在最右，收起时可见，带竖排“目录”字样） */}
        <button
          type="button"
          onClick={togglePin}
          onMouseEnter={() => {
            setOpenState(true)
            onFocusChange(true)
          }}
          aria-expanded={open}
          aria-controls="keyword-dock-panel"
          aria-label={open ? ui.collapse : ui.expand}
          className="pointer-events-auto absolute right-0 top-0 h-full w-11 cursor-pointer rounded-r-md border-l border-brand-500/40 bg-brand-500/10 transition-[background-color,border-color] duration-300 hover:bg-brand-500/25"
        >
          <span
            className={`flex h-full w-full items-center justify-center transition-opacity duration-300 ${
              open ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <span
              className="font-mono text-[10px] tracking-[0.25em] text-white/90"
              style={{ writingMode: 'vertical-rl' }}
            >
              <EditableText as="span" value={ui.verticalLabel} path="ui.keywordDock.verticalLabel" />
            </span>
          </span>
        </button>
      </div>
    </div>
  )
}
