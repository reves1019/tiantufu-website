import { useContent } from '../../lib/contentStore'

/** 数码地球页关键词管理面板：增删改 15 个关键词 */
export default function KeywordAdminPanel() {
  const { content, setAt, updateList } = useContent()
  const keywords = content.earth.keywords

  return (
    <div className="absolute left-6 top-1/2 z-30 w-64 -translate-y-1/2 rounded-xl border border-brand-500/40 bg-ink-950/90 p-4 shadow-[0_0_32px_rgba(199,27,27,0.3)] backdrop-blur-xl">
      <p className="font-mono text-[10px] tracking-[0.3em] text-brand-400">
        关键词编辑 · {String(keywords.length).padStart(2, '0')}
      </p>
      <div className="mt-3 max-h-[46vh] space-y-1.5 overflow-y-auto pr-1">
        {keywords.map((keyword, i) => (
          <div key={`${keyword}-${i}`} className="flex items-center gap-2">
            <span className="w-7 shrink-0 font-mono text-[10px] text-parchment-500">
              #{String(i + 1).padStart(2, '0')}
            </span>
            <input
              value={keyword}
              onChange={(event) => setAt(`earth.keywords.${i}`, event.target.value)}
              className="w-full rounded border border-white/10 bg-ink-950 px-2 py-1 font-mono text-xs text-parchment-100 outline-none transition-colors focus:border-brand-500"
            />
            <button
              type="button"
              onClick={() => updateList('earth.keywords', keywords.filter((_, j) => j !== i))}
              title="删除该关键词"
              className="shrink-0 px-1 font-mono text-sm text-parchment-500 transition-colors hover:text-brand-400"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => updateList('earth.keywords', [...keywords, '新关键词'])}
        className="mt-3 w-full rounded-md border border-dashed border-brand-500/50 py-1.5 text-xs tracking-[0.2em] text-brand-400 transition-colors hover:bg-brand-500/10"
      >
        + 添加关键词
      </button>
    </div>
  )
}
