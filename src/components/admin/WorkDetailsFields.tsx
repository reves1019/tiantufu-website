import type { WorkDetails } from '../../config/site'
import { useContent } from '../../lib/contentStore'

/** Shared by representative works, personal collections and the public archive. */
export default function WorkDetailsFields({ work, path }: { work: WorkDetails; path: string }) {
  const { setAt } = useContent()
  const fields = [['createdYear', '绘制年份（不是地图年代）'], ['setting', '描绘年代 / 世界背景'], ['rights', '署名与转载要求']] as const
  return <div className="grid gap-3 md:grid-cols-3 md:col-span-2">{fields.map(([key, label]) => <label key={key} className="block text-xs text-parchment-400">{label}<input className="mt-1 w-full rounded border border-white/10 bg-ink-950 px-2 py-2 text-parchment-100" value={work[key] ?? ''} onChange={(event) => setAt(`${path}.${key}`, event.target.value)} /></label>)}</div>
}
