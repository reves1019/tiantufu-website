export type MotionPreference = 'system' | 'reduce'

const STORAGE_KEY = 'ttf-motion-preference'
const EVENT_NAME = 'ttf-motion-preference'

function canUseDom() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

export function readMotionPreference(): MotionPreference {
  if (!canUseDom()) return 'system'
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'reduce' ? 'reduce' : 'system'
  } catch {
    return 'system'
  }
}

export function systemReducedMotion() {
  return canUseDom() && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function isMotionReduced() {
  return readMotionPreference() === 'reduce' || systemReducedMotion()
}

export function applyMotionPreference() {
  const reduced = isMotionReduced()
  if (canUseDom()) document.documentElement.dataset.motion = reduced ? 'reduced' : 'system'
  return reduced
}

export function setMotionPreference(preference: MotionPreference) {
  if (canUseDom()) {
    try {
      if (preference === 'system') window.localStorage.removeItem(STORAGE_KEY)
      else window.localStorage.setItem(STORAGE_KEY, preference)
    } catch {
      // Private browsing or a blocked storage policy should not break the site.
    }
  }
  const reduced = applyMotionPreference()
  if (canUseDom()) window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { preference, reduced } }))
  return reduced
}

/** Apply the preference on boot and keep the OS preference live when using system mode. */
export function initMotionPreference() {
  if (!canUseDom()) return () => undefined
  applyMotionPreference()
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  const onChange = () => {
    if (readMotionPreference() === 'system') {
      const reduced = applyMotionPreference()
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { preference: 'system', reduced } }))
    }
  }
  if (media.addEventListener) media.addEventListener('change', onChange)
  else media.addListener(onChange)
  return () => {
    if (media.removeEventListener) media.removeEventListener('change', onChange)
    else media.removeListener(onChange)
  }
}

export const MOTION_PREFERENCE_EVENT = EVENT_NAME
