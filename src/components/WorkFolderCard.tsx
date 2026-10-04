import type { Member } from '../config/site'
import EditableText from './admin/EditableText'

interface WorkFolderCardProps {
  member: Member
  memberIndex: number
  onClick: () => void
}

/**
 * 文件夹式作品卡：作品像收在文件夹里，露出底层纸页边缘；
 * 鼠标滑过时顶层作品“抽出”（扶正 + 上移 + 放大），作者头像在卡片上方浮现。
 */
export default function WorkFolderCard({ member, memberIndex, onClick }: WorkFolderCardProps) {
  const namePath = `members.${memberIndex}.name`
  const workTitlePath = `members.${memberIndex}.work.title`

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative block w-full max-w-[520px] cursor-pointer text-left outline-none"
      aria-label={`${member.name}的作品：${member.work.title}，点击进入成员个人页`}
    >
      {/* 悬停时浮现的作者头像（卡片上方） */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2 opacity-0 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1 group-hover:opacity-100 group-focus-within:-translate-y-1 group-focus-within:opacity-100"
      >
        <img
          src={member.avatar}
          alt=""
          className="h-16 w-16 rounded-full border-2 border-brand-500/70 object-cover shadow-[0_0_26px_rgba(199,27,27,0.55)]"
          draggable={false}
        />
        <EditableText
          as="span"
          value={member.name}
          path={namePath}
          className="whitespace-nowrap rounded-full border border-white/10 bg-ink-950/70 px-3 py-1 text-center font-mono text-[10px] tracking-[0.2em] text-parchment-100 backdrop-blur-md"
        />
      </div>

      {/* 文件夹堆叠 */}
      <div className="relative aspect-[16/11]">
        {/* 底层纸页（最暗，露出边缘最多） */}
        <div className="absolute inset-0 translate-x-6 translate-y-6 rotate-[3deg] overflow-hidden rounded-lg border border-white/5 bg-ink-900 opacity-60 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-7 group-focus-within:translate-y-7">
          <img src={member.work.image} alt="" loading="lazy" className="h-full w-full object-cover brightness-[0.45]" draggable={false} />
        </div>
        {/* 中层纸页 */}
        <div className="absolute inset-0 translate-x-3 translate-y-3 -rotate-[2deg] overflow-hidden rounded-lg border border-white/10 bg-ink-900 opacity-80 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-4 group-hover:rotate-0 group-focus-within:translate-y-4 group-focus-within:rotate-0">
          <img src={member.work.image} alt="" loading="lazy" className="h-full w-full object-cover brightness-[0.7]" draggable={false} />
        </div>
        {/* 顶层作品（默认微倾，悬停抽出扶正放大） */}
        <div className="absolute inset-0 -rotate-[1deg] overflow-hidden rounded-lg border border-white/15 bg-ink-900 shadow-[0_18px_44px_rgba(0,0,0,0.55)] transition-[transform,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-x-2 group-hover:-translate-y-4 group-hover:rotate-0 group-hover:scale-[1.04] group-focus-within:-translate-x-2 group-focus-within:-translate-y-4 group-focus-within:rotate-0 group-focus-within:scale-[1.04]">
          <img
            src={member.work.image}
            alt={member.work.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06] group-focus-within:scale-[1.06]"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-transparent to-transparent" />
          <EditableText
            as="span"
            value={member.work.title}
            path={workTitlePath}
            className="absolute bottom-3 left-4 w-44 font-mono text-xs tracking-[0.3em] text-brand-400"
          />
          <span className="absolute bottom-3 right-4 font-mono text-[10px] tracking-[0.2em] text-parchment-300 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
            进入个人页 →
          </span>
        </div>
      </div>
    </button>
  )
}
