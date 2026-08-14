/** 创作主题选择：主题卡片点击时记录当前主题，主题子页据此渲染 */
let activeId: string | null = null

export function getActiveTopicId() {
  return activeId
}

export function setActiveTopicId(id: string) {
  activeId = id
  window.dispatchEvent(new CustomEvent('ttf-topic', { detail: { id } }))
}
