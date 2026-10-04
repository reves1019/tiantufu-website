import { useEffect, useRef, useState } from 'react'
import { site } from '../config/site'
import Magnetic from './Magnetic'
import { FlowButton } from './ui/flow-button'
import { requestScene } from '../lib/sceneBus'
import { useContent } from '../lib/contentStore'

const SECTION_IDS = site.nav.map((item) => item.href.slice(1))

export default function Navbar() {
  const { openGate, account, content } = useContent()
  const navItems = content.site.nav?.length ? content.site.nav : site.nav
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState(() => window.location.hash.replace(/^#\/?/, '').split('?')[0] || 'home')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLElement>(null)
  const wasMenuOpenRef = useRef(false)
  const navItemsRef = useRef(navItems)
  navItemsRef.current = navItems

  useEffect(() => {
    const onScroll = (event: Event) => {
      const target = event.target
      if (target instanceof HTMLElement && target.matches('[data-scroll-root]')) setScrolled(target.scrollTop > 24)
    }
    const reset = () => setScrolled(false)
    document.addEventListener('scroll', onScroll, { passive: true, capture: true })
    window.addEventListener('ttf-scene', reset)
    return () => { document.removeEventListener('scroll', onScroll, true); window.removeEventListener('ttf-scene', reset) }
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMenuOpen(false)
        return
      }

      if (event.key !== 'Tab') return
      const menuButtons = menuRef.current?.querySelectorAll<HTMLButtonElement>('button')
      if (!menuButtons?.length) return
      const first = menuButtons[0]
      const last = menuButtons[menuButtons.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (!menuButtonRef.current?.contains(target) && !menuRef.current?.contains(target)) setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointerDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onPointerDown) }
  }, [menuOpen])

  // Keep keyboard focus inside the menu while it is open, then return it to
  // the trigger when the menu closes (Escape, outside click, or navigation).
  useEffect(() => {
    if (menuOpen) {
      const frame = window.requestAnimationFrame(() => {
        menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
      })
      wasMenuOpenRef.current = true
      return () => window.cancelAnimationFrame(frame)
    }

    if (wasMenuOpenRef.current) menuButtonRef.current?.focus()
    wasMenuOpenRef.current = false
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return
    const roots = Array.from(document.querySelectorAll<HTMLElement>('[data-scroll-root]'))
    const previous = roots.map((root) => ({ overflowY: root.style.overflowY, overscrollBehavior: root.style.overscrollBehavior }))
    roots.forEach((root) => { root.style.overflowY = 'hidden'; root.style.overscrollBehavior = 'none' })
    return () => roots.forEach((root, index) => {
      root.style.overflowY = previous[index].overflowY
      root.style.overscrollBehavior = previous[index].overscrollBehavior
    })
  }, [menuOpen])

  useEffect(() => {
    const onScene = (event: Event) => {
      const index = (event as CustomEvent).detail.index as number
      const id = navItemsRef.current[index]?.href?.slice(1) ?? SECTION_IDS[index]
      if (id) setActive(id)
      setMenuOpen(false)
    }
    window.addEventListener('ttf-scene', onScene)
    const initial = document.documentElement.dataset.scene
    const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0] || 'home'
    setActive(initial === undefined ? hash : SECTION_IDS[Number(initial)] ?? hash)
    return () => window.removeEventListener('ttf-scene', onScene)
  }, [])

  return (
    <header
      className={`atlas-paper atlas-nav fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-500 ${
        scrolled
          ? 'border-b border-white/[0.06] bg-ink-950/75 backdrop-blur-xl'
          : 'bg-transparent'
      }`}
    >
      <nav className="anim anim-fade-down mx-auto flex h-20 max-w-[1700px] items-center justify-between px-6 lg:px-10" style={{ animationDelay: '0.35s' }}>
        <button
          type="button"
          onClick={() => requestScene(0)}
          className="flex items-center"
          aria-label={`${content.site.name}${content.ui.nav.homeSuffix}`}
        >
          <img src={content.media.brand.wordmark} alt={content.site.name} className="atlas-nav-logo h-9 w-auto object-contain" />
        </button>

        <ul aria-label="主导航" className="hidden items-center gap-6 xl:flex xl:gap-10">
          {navItems.map((item, i) => {
            const isActive = item.href === `#${active}`
            return (
              <li key={item.href}>
                <button
                  type="button"
                  onClick={() => requestScene(i)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group relative rounded-sm text-sm tracking-[0.2em] transition-colors duration-300 hover:text-parchment-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500 ${
                    isActive ? 'text-parchment-100' : 'text-parchment-300'
                  }`}
                >
                  {item.label}
                  <span
                    className={`absolute -bottom-1.5 left-0 h-px w-full origin-left bg-brand-500 transition-transform duration-300 ${
                      isActive ? 'scale-x-100' : 'scale-x-0'
                    }`}
                  />
                </button>
              </li>
            )
          })}
        </ul>

        <div className="flex items-center gap-3">
          {/* 站内搜索 */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('ttf-search-open'))}
            aria-label={content.ui.nav.searchAria}
            aria-haspopup="dialog"
            className="flex h-10 w-10 items-center justify-center rounded-md border border-white/15 text-parchment-300 transition-colors duration-300 hover:border-brand-500/60 hover:text-brand-400"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <polyline points="16 16 21 21" />
            </svg>
          </button>
          {/* 账号：登录 / 注册 / 查看当前账号 */}
          <button
            type="button"
            onClick={openGate}
            title={account ? `${content.ui.nav.loggedInPrefix}${account.displayName}` : content.ui.nav.loginTitle}
            aria-label={content.ui.nav.loginAria}
            className={`flex h-10 w-10 items-center justify-center rounded-md border transition-colors duration-300 ${
              account
                ? 'border-brand-500/60 bg-brand-500/10 text-brand-400'
                : 'border-white/15 text-parchment-300 hover:border-brand-500/60 hover:text-brand-400'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
            </svg>
          </button>
          <Magnetic>
            <FlowButton
              variant="solid"
              text={content.ui.contact?.title ?? '联系我们'}
              onClick={() => requestScene(navItems.length - 1)}
              className="atlas-nav-contact hidden min-h-10 rounded-none px-5 py-2.5 text-sm tracking-[0.08em] lg:inline-flex"
            />
          </Magnetic>
          {/* 移动端汉堡菜单 */}
          <button
            type="button"
            ref={menuButtonRef}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? content.ui.nav.closeMenu : content.ui.nav.openMenu}
            aria-expanded={menuOpen}
            aria-controls="atlas-mobile-menu"
            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-md border border-white/15 transition-[border-color,transform] hover:border-brand-500/60 motion-safe:active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500 xl:hidden"
          >
            <span className={`h-px w-5 bg-parchment-100 transition-transform duration-300 ${menuOpen ? 'translate-y-[3.5px] rotate-45' : ''}`} />
            <span className={`h-px w-5 bg-parchment-100 transition-opacity duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`h-px w-5 bg-parchment-100 transition-transform duration-300 ${menuOpen ? '-translate-y-[3.5px] -rotate-45' : ''}`} />
          </button>
        </div>
      </nav>

      {/* 移动端下拉菜单 */}
      {menuOpen && (
        <nav id="atlas-mobile-menu" ref={menuRef} aria-label="移动端主导航" className="atlas-mobile-menu absolute inset-x-0 top-20 border-b border-white/10 bg-ink-950/95 backdrop-blur-xl xl:hidden">
          <div className="mx-auto flex max-w-[1700px] flex-col gap-1 px-6 py-4">
            {navItems.map((item, i) => {
              const isActive = item.href === `#${active}`
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => requestScene(i)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`rounded-md px-4 py-3 text-left text-sm tracking-[0.2em] transition-[background-color,color,transform] motion-safe:active:scale-[.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
                    isActive ? 'bg-brand-500/10 text-brand-400' : 'text-parchment-300 hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </nav>
      )}
    </header>
  )
}
