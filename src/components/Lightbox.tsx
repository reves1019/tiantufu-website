import { useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'

export interface LightboxImage {
  src: string
  title: string
  desc?: string
}

interface LightboxProps {
  images: LightboxImage[]
  index: number
  onClose: () => void
  onIndexChange?: (index: number) => void
}

/** 图片放大查看器：Esc/点击遮罩关闭，←/→ 切换，支持键盘 */
export default function Lightbox({ images, index, onClose, onIndexChange }: LightboxProps) {
  const count = images.length
  const item = images[Math.max(0, Math.min(index, count - 1))]

  const move = useCallback(
    (dir: 1 | -1) => {
      if (count <= 1) return
      const next = (index + dir + count) % count
      onIndexChange?.(next)
    },
    [index, count, onIndexChange],
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      else if (event.key === 'ArrowRight') move(1)
      else if (event.key === 'ArrowLeft') move(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, move])

  if (!item) return null

  const iconBtn =
    'flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-ink-950/70 text-parchment-200 backdrop-blur-md transition-all duration-300 hover:border-brand-500/70 hover:text-brand-400'

  return createPortal(
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/92 p-4 backdrop-blur-md sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="图片放大查看"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        data-testid="lightbox-close"
        aria-label="关闭"
        className={`${iconBtn} absolute right-5 top-5`}
      >
        ✕
      </button>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              move(-1)
            }}
            aria-label="上一张"
            className={`${iconBtn} absolute left-3 top-1/2 -translate-y-1/2 sm:left-6`}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              move(1)
            }}
            aria-label="下一张"
            className={`${iconBtn} absolute right-3 top-1/2 -translate-y-1/2 sm:right-6`}
          >
            ›
          </button>
        </>
      )}

      <figure
        className="flex max-h-full max-w-full flex-col items-center"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          key={item.src + String(index)}
          src={item.src}
          alt={item.title}
          className="max-h-[78vh] max-w-full rounded-lg border border-white/10 object-contain shadow-[0_0_60px_rgba(0,0,0,0.6)]"
        />
        <figcaption className="mt-4 flex flex-col items-center gap-1 text-center">
          <p className="font-display text-lg tracking-[0.14em] text-parchment-100">{item.title}</p>
          {item.desc && (
            <p className="max-w-xl whitespace-pre-line text-xs leading-relaxed text-parchment-400">{item.desc}</p>
          )}
          {count > 1 && (
            <p className="mt-1 font-mono text-[10px] tracking-[0.3em] text-brand-400">
              {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
            </p>
          )}
        </figcaption>
      </figure>
    </div>,
    document.body,
  )
}
