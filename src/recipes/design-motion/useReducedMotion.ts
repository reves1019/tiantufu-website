import { useEffect, useState } from 'react'

function read() {
  return typeof window !== 'undefined'
    && (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced')
}
/** 同时遵守系统与站内偏好；强制预览减弱不能覆盖系统已经启用的减弱。 */
export function useReducedMotion(force = false) {
  const [reduced, setReduced] = useState(read)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(read())
    media.addEventListener('change', update)
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] })
    update()
    return () => { media.removeEventListener('change', update); observer.disconnect() }
  }, [])
  return force || reduced
}
