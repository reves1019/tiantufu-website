import type { RefObject } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(useGSAP, ScrollTrigger)

/** Native page scrolling; scoped triggers are removed on page exit and preference changes. */
export function useExhibitionMotion(root: RefObject<HTMLElement>, disabled: boolean, revision: string | number, pin = false) {
  useGSAP(() => {
    if (disabled || !root.current) return
    const media = gsap.matchMedia()
    media.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      gsap.utils.toArray<HTMLElement>('[data-exhibit-reveal]', root.current).forEach((block) => {
        gsap.fromTo(block, { y: 28, opacity: .55 }, { y: 0, opacity: 1, ease: 'none', scrollTrigger: {
          trigger: block, scroller: root.current, start: 'top 94%', end: 'top 70%', scrub: .45,
        } })
      })
      gsap.utils.toArray<HTMLElement>('[data-exhibit-image]', root.current).forEach((image) => {
        gsap.fromTo(image, { scale: .94 }, { scale: 1, ease: 'none', scrollTrigger: {
          trigger: image, scroller: root.current, start: 'top 94%', end: 'top 55%', scrub: .5,
        } })
      })
      const rail = root.current?.querySelector<HTMLElement>('.society-reading')
      const title = root.current?.querySelector<HTMLElement>('.society-reading-title')
      if (pin && rail && title) ScrollTrigger.create({ trigger: rail, scroller: root.current, start: 'top 112px', end: () => `+=${Math.max(0, rail.offsetHeight - title.offsetHeight)}`, pin: title, pinSpacing: false })
    })
    return () => media.revert()
  }, { scope: root, dependencies: [disabled, revision, pin], revertOnUpdate: true })
}
