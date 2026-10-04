/** 成员选择：卡片点击时记录当前成员，成员个人页据此渲染 */
let activeId: string | null = null
const SELECTION_KEY = 'ttf-active-member'

function linkedMemberId() {
  if (typeof window === 'undefined') return null
  const [page, query] = window.location.hash.slice(1).split('?')
  return page === 'member' ? new URLSearchParams(query ?? '').get('id') : null
}

export function getActiveMemberId() {
  const linked = linkedMemberId()
  if (linked) return linked
  if (activeId) return activeId
  try { return sessionStorage.getItem(SELECTION_KEY) } catch { return null }
}

export function setActiveMemberId(id: string) {
  activeId = id
  try { sessionStorage.setItem(SELECTION_KEY, id) } catch { /* URL 仍可保存公开页面定位。 */ }
  if (window.location.hash.slice(1).split('?')[0] === 'member') {
    window.history.replaceState(null, '', `#member?id=${encodeURIComponent(id)}`)
  }
  window.dispatchEvent(new CustomEvent('ttf-member', { detail: { id } }))
}
