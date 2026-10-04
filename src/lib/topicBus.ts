/** 创作主题选择：主题卡片点击时记录当前主题，主题子页据此渲染 */
let activeId: string | null = null
const SELECTION_KEY = 'ttf-active-topic'

export function getActiveTopicId() {
  const [page, query] = window.location.hash.slice(1).split('?')
  const linked = page === 'topic' ? new URLSearchParams(query ?? '').get('id') : null
  if (linked) return linked
  if (activeId) return activeId
  try { return sessionStorage.getItem(SELECTION_KEY) } catch { return null }
}

export function setActiveTopicId(id: string) {
  activeId = id
  try { sessionStorage.setItem(SELECTION_KEY, id) } catch { /* The public URL remains usable. */ }
  if (window.location.hash.slice(1).split('?')[0] === 'topic') window.history.replaceState(null, '', `#topic?id=${encodeURIComponent(id)}`)
  window.dispatchEvent(new CustomEvent('ttf-topic', { detail: { id } }))
}
