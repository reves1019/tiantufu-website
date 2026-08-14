interface KeywordSpotlightProps {
  keyword: string
  index: number
  visible: boolean
}

/**
 * 关键词浮层：出现在数码地球右上方，展示与当前悬停/选中的关键词
 * 对应的占位内容（色块 + “占位图”），后续替换为真实图片/文字。
 */
export default function KeywordSpotlight({ keyword, index, visible }: KeywordSpotlightProps) {
  return (
    <div
      className={`pointer-events-none absolute -top-9 left-1/2 z-20 w-64 -translate-x-1/2 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden="true"
    >
      <div className="spotlight-in overflow-hidden rounded-xl border border-white/12 bg-ink-950/90 shadow-[0_0_32px_rgba(199,27,27,0.24)] backdrop-blur-xl">
        {/* 占位图 */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-ink-800 via-ink-900 to-brand-500/25">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(255,255,255,0.07) 0 1px, transparent 1px 10px)',
            }}
          />
          <span className="absolute inset-0 flex items-center justify-center font-mono text-xs tracking-[0.35em] text-parchment-300/85">
            占位图
          </span>
        </div>
        {/* 说明文字 */}
        <div className="px-4 py-3">
          <p className="font-mono text-[10px] tracking-[0.35em] text-brand-400">
            #{String(index + 1).padStart(2, '0')} · {keyword}
          </p>
          <p className="mt-1.5 break-words text-xs leading-relaxed text-parchment-500">
            此处为占位内容，后续替换为与该关键词相关的图片或文字。
          </p>
        </div>
      </div>
    </div>
  )
}
