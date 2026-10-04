import { useEffect, useRef, type RefObject } from 'react'

type CloseHandler = (() => void) | undefined

/** Keep keyboard focus inside an inline dialog and return it to its opener. */
export function useDialogFocus<T extends HTMLElement>(open: boolean, onClose?: CloseHandler): RefObject<T> {
  const dialogRef = useRef<T>(null)
  const closeRef = useRef<CloseHandler>(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    if (!dialog) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overlay = dialog.parentElement
    const host = overlay?.parentElement
    const siblings = overlay && host
      ? Array.from(host.children).filter((node) => node !== overlay) as HTMLElement[]
      : []
    const previousInert = siblings.map((node) => node.inert)
    siblings.forEach((node) => { node.inert = true })
    const focusables = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
    )).filter((node) => node.getClientRects().length > 0)
    const focusFrame = window.requestAnimationFrame(() => focusables()[0]?.focus())
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current?.()
        return
      }
      if (event.key !== 'Tab') return
      const nodes = focusables()
      if (!nodes.length) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', onKeyDown)
      siblings.forEach((node, index) => { node.inert = previousInert[index] })
      if (opener?.isConnected) opener.focus()
    }
  }, [open])

  return dialogRef
}
