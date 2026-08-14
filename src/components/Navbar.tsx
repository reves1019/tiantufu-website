import { useEffect, useState } from 'react'
import { brandAssets, site } from '../config/site'
import Magnetic from './Magnetic'
import { requestScene } from '../lib/sceneBus'

const SECTION_IDS = site.nav.map((item) => item.href.slice(1))

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState('home')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onScene = (event: Event) => {
      const index = (event as CustomEvent).detail.index as number
      const id = SECTION_IDS[index]
      if (id) setActive(id)
      setMenuOpen(false)
    }
    window.addEventListener('ttf-scene', onScene)
    const initial = Number(document.documentElement.dataset.scene ?? 0)
    setActive(SECTION_IDS[initial] ?? 'home')
    return () => window.removeEventListener('ttf-scene', onScene)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
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
          aria-label="天图府首页"
        >
          <img src={brandAssets.wordmark} alt="天图府" className="h-9 w-auto object-contain" />
        </button>

        <ul className="hidden items-center gap-6 md:flex lg:gap-10">
          {site.nav.map((item, i) => {
            const isActive = item.href === `#${active}`
            return (
              <li key={item.href}>
                <button
                  type="button"
                  onClick={() => requestScene(i)}
                  className={`group relative text-sm tracking-[0.2em] transition-colors duration-300 hover:text-parchment-100 ${
                    isActive ? 'text-parchment-100' : 'text-parchment-300'
                  }`}
                >
                  {item.label}
                  <span
                    className={`absolute -bottom-1.5 left-0 h-px w-full origin-left bg-brand-500 transition-transform duration-300 ${
                      isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
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
            aria-label="站内搜索（Ctrl+K 或 /）"
            className="flex h-10 w-10 items-center justify-center rounded-md border border-white/15 text-parchment-300 transition-colors duration-300 hover:border-brand-500/60 hover:text-brand-400"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <polyline points="16 16 21 21" />
            </svg>
          </button>
          <Magnetic>
            <button
              type="button"
              onClick={() => requestScene(site.nav.length - 1)}
              className="btn-sheen hidden rounded-md bg-brand-500 px-5 py-2.5 text-sm tracking-[0.15em] text-white shadow-[0_0_24px_rgba(255,143,163,0.35)] transition-all duration-300 hover:bg-brand-600 hover:shadow-[0_0_36px_rgba(255,143,163,0.55)] sm:inline-block"
            >
              联系我们
            </button>
          </Magnetic>
          {/* 移动端汉堡菜单 */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? '关闭菜单' : '打开菜单'}
            aria-expanded={menuOpen}
            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-md border border-white/15 md:hidden"
          >
            <span className={`h-px w-5 bg-parchment-100 transition-transform duration-300 ${menuOpen ? 'translate-y-[3.5px] rotate-45' : ''}`} />
            <span className={`h-px w-5 bg-parchment-100 transition-opacity duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`h-px w-5 bg-parchment-100 transition-transform duration-300 ${menuOpen ? '-translate-y-[3.5px] -rotate-45' : ''}`} />
          </button>
        </div>
      </nav>

      {/* 移动端下拉菜单 */}
      {menuOpen && (
        <nav className="absolute inset-x-0 top-20 border-b border-white/10 bg-ink-950/95 backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-[1700px] flex-col gap-1 px-6 py-4">
            {site.nav.map((item, i) => {
              const isActive = item.href === `#${active}`
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => requestScene(i)}
                  className={`rounded-md px-4 py-3 text-left text-sm tracking-[0.2em] transition-colors ${
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
