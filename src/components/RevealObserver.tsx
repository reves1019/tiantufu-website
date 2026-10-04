import { useEffect } from 'react'
import { isMotionReduced, MOTION_PREFERENCE_EVENT } from '../lib/motionPreference'

/**
 * 长页滚动显现：
 * 只观察当前激活页面（[data-scroll-root] 滚动容器）内的 [data-reveal] / .scene-block，
 * 进入视口后加 .is-visible，同屏按顺序 60ms 交错淡入上移。
 * prefers-reduced-motion 时由 CSS 直接显示，本组件不启动。
 */
export default function RevealObserver() {
  useEffect(() => {
    let reduced = isMotionReduced()

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

    let observeFrame = 0
    const onScene = (event: Event) => {
      const id = (event as CustomEvent).detail?.id as string | undefined
      disconnectAll()
      if (!id) return

      const root = document.getElementById(id)
      if (reduced) {
        root?.querySelectorAll<HTMLElement>('[data-reveal], .scene-block').forEach((el) => {
          el.classList.add('is-visible')
          el.style.transitionDelay = '0ms'
        })
        return
      }

      // PageStack publishes the destination before React mounts its route layer.
      // Defer one frame so direct routes and freshly mounted hidden pages are observed.
      cancelAnimationFrame(observeFrame)
      observeFrame = requestAnimationFrame(() => {
        const nextRoot = document.getElementById(id)
        if (nextRoot?.hasAttribute('data-scroll-root')) observeRoot(nextRoot)
      })
    }

    const onMotionPreference = (event: Event) => {
      reduced = Boolean((event as CustomEvent<{ reduced?: boolean }>).detail?.reduced)
      const id = document.documentElement.dataset.page
      if (id) onScene(new CustomEvent('ttf-scene', { detail: { id } }))
    }

    window.addEventListener('ttf-scene', onScene)
    window.addEventListener(MOTION_PREFERENCE_EVENT, onMotionPreference)
    const initialId = window.location.hash.replace(/^#\/?/, '')
    onScene(
      new CustomEvent('ttf-scene', {
        detail: { id: initialId && document.getElementById(initialId) ? initialId : 'home' },
      }),
    )

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
      window.removeEventListener(MOTION_PREFERENCE_EVENT, onMotionPreference)
      cancelAnimationFrame(observeFrame)
      mo.disconnect()
      disconnectAll()
    }
  }, [])

  return null
}
