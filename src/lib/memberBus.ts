/** 成员选择：卡片点击时记录当前成员，成员个人页据此渲染 */
let activeId: string | null = null

export function getActiveMemberId() {
  return activeId
}

export function setActiveMemberId(id: string) {
  activeId = id
  window.dispatchEvent(new CustomEvent('ttf-member', { detail: { id } }))
}
