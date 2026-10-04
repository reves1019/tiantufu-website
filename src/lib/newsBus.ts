/** 新闻选择：新闻卡片点击时记录当前条目，新闻详情页据此渲染 */
let activeIndex: number | null = null

export function getActiveNewsIndex() {
  if (typeof window !== 'undefined' && window.location.hash.startsWith('#news-detail?')) {
    const raw = new URLSearchParams(window.location.hash.split('?')[1]).get('item')
    return raw !== null && /^\d+$/.test(raw) && Number.isSafeInteger(Number(raw)) ? Number(raw) : null
  }
  return activeIndex
}

export function setActiveNewsIndex(index: number) {
  if (!Number.isSafeInteger(index) || index < 0) return
  activeIndex = index
  if (window.location.hash.startsWith('#news-detail')) {
    const target = `#news-detail?item=${index}`
    if (window.location.hash !== target) window.history.pushState(null, '', target)
  }
  window.dispatchEvent(new CustomEvent('ttf-news', { detail: { index } }))
}
