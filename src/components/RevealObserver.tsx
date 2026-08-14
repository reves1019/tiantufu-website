import { useEffect } from 'react'

/**
 * 长页滚动显现：
 * 只观察当前激活页面（[data-scroll-root] 滚动容器）内的 [data-reveal] / .scene-block，
 * 进入视口后加 .is-visible，同屏按顺序 60ms 交错淡入上移。
 * prefers-reduced-motion 时由 CSS 直接显示，本组件不启动。
 */
export default function RevealObserver() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    const observers = new Map<Element, IntersectionObserver>()
    const seen = new WeakSet<Element>()

    const disconnectAll = () => {
      observers.forEach((observer) => observer.disconnect())
      observers.clear()
    }

    const observeRoot = (root: Element) => {
      const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal], .scene-block'))
      if (targets.length === 0) return
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue
            const target = entry.target as HTMLElement
            if (!seen.has(target)) {
              seen.add(target)
              const siblings = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal], .scene-block'))
              const idx = siblings.indexOf(target)
              target.style.transitionDelay = `${Math.min(idx, 10) * 60}ms`
            }
            target.classList.add('is-visible')
            observer.unobserve(target)
          }
        },
        { root, threshold: 0.08, rootMargin: '0px 0px -4% 0px' },
      )
      observers.set(root, observer)
      targets.forEach((el) => observer.observe(el))
    }

    const onScene = (event: Event) => {
      const id = (event as CustomEvent).detail?.id as string | undefined
      disconnectAll()
      if (!id) return
      const root = document.getElementById(id)
      if (root?.hasAttribute('data-scroll-root')) observeRoot(root)
    }

    window.addEventListener('ttf-scene', onScene)
    onScene(new CustomEvent('ttf-scene', { detail: { id: 'home' } }))

    // 管理员新增/编辑内容后，补齐观察新出现的显现块
    const mo = new MutationObserver(() => {
      const page = document.documentElement.dataset.page
      const root = page ? document.getElementById(page) : null
      if (!root || !observers.has(root)) return
      const observer = observers.get(root)!
      root
        .querySelectorAll<HTMLElement>('[data-reveal], .scene-block')
        .forEach((el) => {
          if (!seen.has(el)) observer.observe(el)
        })
    })
    mo.observe(document.body, { childList: true, subtree: true })

    return () => {
      window.removeEventListener('ttf-scene', onScene)
      mo.disconnect()
      disconnectAll()
    }
  }, [])

  return null
}
