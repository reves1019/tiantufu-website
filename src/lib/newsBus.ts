/** 新闻选择：新闻卡片点击时记录当前条目，新闻详情页据此渲染 */
let activeIndex: number | null = null

export function getActiveNewsIndex() {
  return activeIndex
}

export function setActiveNewsIndex(index: number) {
  activeIndex = index
  window.dispatchEvent(new CustomEvent('ttf-news', { detail: { index } }))
}
