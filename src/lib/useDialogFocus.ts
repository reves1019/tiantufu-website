import { useEffect, useRef } from 'react'
export function useDialogFocus<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null), close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const root = ref.current
    if (!open || !root) return
    const previous = document.activeElement as HTMLElement | null
    const focusable = () => [...root.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]')].filter(e => e.getClientRects().length)
    focusable()[0]?.focus()
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close.current() }
      if (e.key !== 'Tab') return
      const elements = focusable(), first = elements[0], last = elements[elements.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
    }
    root.addEventListener('keydown', key)
    return () => { root.removeEventListener('keydown', key); if (previous?.isConnected) previous.focus() }
  }, [open])
  return ref
}
