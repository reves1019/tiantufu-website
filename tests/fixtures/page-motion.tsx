import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import PageStack from '../../src/components/PageStack'
import { initMotionPreference, setMotionPreference } from '../../src/lib/motionPreference'
import type { PageMotionSettings } from '../../src/recipes/design-motion/model'
import '../../src/index.css'
import '../../src/exhibition.css'

declare global {
  interface Window {
    pageMotionHarness: {
      setMotion: (motion: PageMotionSettings) => void
      setMounted: (mounted: boolean) => void
      reduce: typeof setMotionPreference
      navigate: (index: number) => void
    }
  }
}

export function Harness() {
  const [motion, setMotion] = useState<PageMotionSettings>({ preset: 'slide', duration: 1200, distance: 64 })
  const [mounted, setMounted] = useState(true)
  useEffect(() => initMotionPreference(), [])
  useEffect(() => {
    window.pageMotionHarness = {
      setMotion, setMounted, reduce: setMotionPreference,
      navigate: index => window.dispatchEvent(new CustomEvent('ttf-scene-request', { detail: { index } })),
    }
  }, [])
  return mounted
    ? <PageStack motion={motion}>{Array.from({ length: 22 }, (_, index) =>
      <section key={index} data-testid={`page-${index}`}><h1>Page {index}</h1><button>Focusable {index}</button></section>)}</PageStack>
    : <p>Unmounted</p>
}

const root = document.getElementById('root')
if (!root) throw new Error('Missing test root')
createRoot(root).render(<StrictMode><Harness /></StrictMode>)
