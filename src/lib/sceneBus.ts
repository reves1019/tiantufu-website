/** 场景请求：导航/圆点/按钮通过该事件驱动横向滚动到指定场景 */
export function requestScene(index: number) {
  window.dispatchEvent(new CustomEvent('ttf-scene-request', { detail: { index } }))
}
