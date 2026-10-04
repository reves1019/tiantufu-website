import { createPortal } from 'react-dom'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import './linear-modal.css'

export interface LinearModalProps {
  trigger: ReactNode
  title: ReactNode
  description?: ReactNode
  image?: { src: string; alt?: string }
  kicker?: ReactNode
  footer?: (close: () => void) => ReactNode
  triggerClassName?: string
  triggerAriaLabel?: string
}

/** A dependency-free shared-layout-like modal for editorial cards. */
export function LinearModal({ trigger, title, description, image, kicker, footer, triggerClassName = '', triggerAriaLabel }: LinearModalProps) {
  const [open, setOpen] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const dialogId = useId()

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    const portalRoot = dialogRef.current?.parentElement
    const siblings = portalRoot
      ? ([...document.body.children].filter((node) => node !== portalRoot) as HTMLElement[])
      : []
    const previousInert = siblings.map((node) => node.inert)
    siblings.forEach((node) => { node.inert = true })
    document.body.style.overflow = 'hidden'
    const frame = requestAnimationFrame(() => closeRef.current?.focus())
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        return
      }
      if (event.key !== 'Tab') return
      const dialog = dialogRef.current
      if (!dialog) return
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true')
      if (!focusable.length) {
        event.preventDefault()
        dialog.focus()
        return
      }
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
    document.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      siblings.forEach((node, index) => { node.inert = previousInert[index] })
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) triggerRef.current?.focus()
  }, [open])

  const close = () => setOpen(false)
  return <>
    <button
      ref={triggerRef}
      type="button"
      className={`linear-modal-trigger ${triggerClassName}`}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={open ? dialogId : undefined}
      aria-label={triggerAriaLabel}
      onClick={() => setOpen(true)}
    >{trigger}</button>
    {open && createPortal(
      <div className="linear-modal-root" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
        <div ref={dialogRef} id={dialogId} className="linear-modal-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} tabIndex={-1}>
          <button ref={closeRef} type="button" className="linear-modal-close" onClick={close} aria-label="关闭窗口">×</button>
          {image && <div className="linear-modal-image-wrap"><img src={image.src} alt={image.alt ?? ''} /></div>}
          <div className="linear-modal-copy">
            {kicker && <p className="linear-modal-kicker">{kicker}</p>}
            <h2 id={titleId}>{title}</h2>
            {description && <div id={descriptionId} className="linear-modal-description">{description}</div>}
            {footer && <div className="linear-modal-footer">{footer(close)}</div>}
          </div>
        </div>
      </div>,
      document.body,
    )}
  </>
}

