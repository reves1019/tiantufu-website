import type { WorkItem } from '../config/site'
import EditableText from './admin/EditableText'

interface WorkArchiveCardProps {
  work: WorkItem
  /** 在 content.worksArchive 中的原始下标（管理员编辑路径使用） */
  workIndex: number
  topicName: string
  canOpen: boolean
  onClick: () => void
  onZoom?: () => void
}

/** 作品档案卡片：分类作品库中的单件作品；点击图卡进入作者成员页，点右上角放大查看 */
export default function WorkArchiveCard({ work, workIndex, topicName, canOpen, onClick, onZoom }: WorkArchiveCardProps) {
  return (
    <div
      role={canOpen ? 'button' : undefined}
      tabIndex={canOpen ? 0 : undefined}
      onClick={canOpen ? onClick : undefined}
      onKeyDown={(event) => {
        if (canOpen && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          onClick()
        }
      }}
      className={`group relative block h-full w-full overflow-hidden rounded-lg border border-white/10 bg-ink-950/45 text-left backdrop-blur-sm transition-[border-color,box-shadow,opacity,transform] duration-300 ${
        canOpen
          ? 'cursor-pointer hover:border-brand-500/50 hover:shadow-[0_0_28px_rgba(199,27,27,0.18)]'
          : 'cursor-default opacity-70'
      }`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-ink-900">
        {onZoom && (
          <button
            type="button"
            aria-label={`放大查看《${work.title}》`}
            onClick={(event) => {
              event.stopPropagation()
              onZoom()
            }}
            className="absolute right-3 top-3 z-20 flex h-9 w-9 cursor-zoom-in items-center justify-center rounded-full border border-white/15 bg-ink-950/75 text-parchment-200 opacity-0 backdrop-blur-md transition-[border-color,color,opacity,transform] duration-300 group-hover:opacity-100 hover:border-brand-500/70 hover:text-brand-400"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.35-4.35M8 11h6M11 8v6" />
            </svg>
          </button>
        )}
        <img
          src={work.image}
          alt={work.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2">
          <span className="rounded-full border border-brand-500/40 bg-ink-950/70 px-2.5 py-0.5 font-mono text-[9px] tracking-[0.15em] text-brand-400 backdrop-blur-sm">
            {topicName}
          </span>
          <span className="rounded-full border border-white/15 bg-ink-950/70 px-2.5 py-0.5 font-mono text-[9px] tracking-[0.15em] text-parchment-300 backdrop-blur-sm">
            {work.category}
          </span>
          {work.year && (
            <span className="ml-auto font-mono text-[9px] tracking-[0.15em] text-parchment-400">{work.year}</span>
          )}
        </div>
      </div>
      <div className="px-4 py-3">
        <EditableText
          as="h3"
          value={work.title}
          path={`worksArchive.${workIndex}.title`}
          className="truncate text-lg tracking-[0.08em] text-parchment-100 transition-colors group-hover:text-brand-400"
        />
        <div className="mt-1 flex items-center gap-2">
          <EditableText
            as="span"
            value={work.author}
            path={`worksArchive.${workIndex}.author`}
            className="font-mono text-[10px] tracking-[0.18em] text-brand-400"
          />
          <span className="ml-auto font-mono text-[10px] tracking-[0.15em] text-parchment-500 opacity-0 transition-[transform,opacity] duration-300 group-hover:translate-x-1 group-hover:opacity-100">
            {canOpen ? '进入作者页 →' : '作者未收录'}
          </span>
        </div>
        <EditableText
          as="p"
          multiline
          value={work.desc}
          path={`worksArchive.${workIndex}.desc`}
          className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-parchment-500"
        />
      </div>
    </div>
  )
}
