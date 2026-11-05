export type TransitionId = 'rise' | 'fade' | 'slide' | 'curtain' | 'iris' | 'zoom'
export type TextId = 'split' | 'blur' | 'scramble'
export type ButtonId = 'fill' | 'sheen' | 'magnetic'
export type ScrollId = 'reveal' | 'parallax'
export type EffectId = TransitionId | TextId | ButtonId | ScrollId
export type EffectCategory = 'transition' | 'text' | 'button' | 'scroll'
export interface MotionOptions { duration: number; distance: number; stagger: number; color: string }
export interface PageMotionSettings { preset: TransitionId | 'original'; duration: number; distance: number }
export interface MotionRecipe {
  id: EffectId
  title: string
  category: EffectCategory
  summary: string
  useFor: string
  principle: string
  sourceIds: string[]
}
export const defaultOptions: MotionOptions = { duration: 600, distance: 36, stagger: 35, color: '#c9a569' }
export const defaultPageMotion: PageMotionSettings = { preset: 'original', duration: 400, distance: 18 }
export const transitionIds: TransitionId[] = ['rise', 'fade', 'slide', 'curtain', 'iris', 'zoom']
export const motionRecipes: MotionRecipe[] = [
  { id: 'rise', title: '轻浮入场', category: 'transition', summary: '内容沿纵轴轻移，透明度随之恢复。', useFor: '长文、作品详情、信息页', principle: 'transform + opacity；位移幅度小，保持阅读位置。', sourceIds: ['lapa', 'land-book'] },
  { id: 'fade', title: '静谧叠化', category: 'transition', summary: '保留版面位置，仅交替显隐。', useFor: '作品集、编辑台、资料切换', principle: '旧层与新层重叠，离场层不能继续接收焦点。', sourceIds: ['siteinspire', 'one-page-love'] },
  { id: 'slide', title: '横向推幕', category: 'transition', summary: '新页面沿横向进入视野。', useFor: '系列作品、章节与展室', principle: '提炼横向浏览的方向感，不接管页面滚轮。', sourceIds: ['landing-love'] },
  { id: 'curtain', title: '遮罩揭幕', category: 'transition', summary: '内容从矩形遮罩中逐步展开。', useFor: '专题开篇、展览章节', principle: 'clip-path 裁切同一内容层；无需复制页面截图。', sourceIds: ['awwwards'] },
  { id: 'iris', title: '圆形开场', category: 'transition', summary: '圆形窗口从中心展开为整页。', useFor: '短篇专题、重点作品开场', principle: '圆形遮罩是对覆盖转场的原创变体，并非复刻参考站。', sourceIds: ['awwwards'] },
  { id: 'zoom', title: '景深靠近', category: 'transition', summary: '新内容从轻微缩小恢复到正常比例。', useFor: '地图作品、视觉主题页', principle: '缩放与透明度协同；减少动态时直接呈现。', sourceIds: ['land-book'] },
  { id: 'split', title: '逐字升起', category: 'text', summary: '文字按阅读顺序错峰出现。', useFor: '短标题、章节引言', principle: '按字素切分，独立时序，读屏仍获取一句完整文本。', sourceIds: ['react-bits', 'one-page-love'] },
  { id: 'blur', title: '由虚入实', category: 'text', summary: '模糊文字逐渐清晰并归位。', useFor: '一句话摘要、视觉导语', principle: '短暂 blur + opacity；正文不依赖动画才能阅读。', sourceIds: ['react-bits'] },
  { id: 'scramble', title: '字符归位', category: 'text', summary: '临时字符逐步解码为最终标题。', useFor: '实验专题、数字地图标题', principle: '装饰字符替换可取消；不改变可访问的最终文本。', sourceIds: ['ui-layouts', 'one-page-love'] },
  { id: 'fill', title: '墨色填充', category: 'button', summary: '触发控件时，底色向内铺展。', useFor: '查看作品、进入展室', principle: '伪元素承载背景动效，按钮命中区域和文案保持稳定。', sourceIds: ['uiverse'] },
  { id: 'sheen', title: '一束扫光', category: 'button', summary: '细光掠过按钮表面。', useFor: '少量主要操作', principle: '用独立光带位移表达反馈，不做高频闪烁。', sourceIds: ['21st', 'uiverse'] },
  { id: 'magnetic', title: '指针引力', category: 'button', summary: '按钮跟随指针轻微偏移。', useFor: '作品入口、轻交互导航', principle: '原创补充变体：坐标归一化后限制偏移，触摸和键盘仍可点击。', sourceIds: [] },
  { id: 'reveal', title: '滚动显影', category: 'scroll', summary: '内容进入视窗时完成一次揭幕。', useFor: '作品摘要、长页段落', principle: 'IntersectionObserver 绑定自己的滚动容器，卸载时断开。', sourceIds: ['lapa'] },
  { id: 'parallax', title: '叠层视差', category: 'scroll', summary: '图像与文字按不同幅度响应滚动。', useFor: '少量展览章节、配图段落', principle: '从参考站的分层布局演绎的原创视差变体；被动滚动监听 + rAF 合帧，不代表已复刻原站同类动效。', sourceIds: ['land-book', 'siteinspire'] },
]

function numberIn(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
}
export function normalizeOptions(value: unknown): MotionOptions {
  const object = value && typeof value === 'object' ? value as Partial<MotionOptions> : {}
  return {
    duration: numberIn(object.duration, defaultOptions.duration, 160, 1600),
    distance: numberIn(object.distance, defaultOptions.distance, 0, 100),
    stagger: numberIn(object.stagger, defaultOptions.stagger, 0, 150),
    color: typeof object.color === 'string' && /^#[\da-f]{6}$/i.test(object.color) ? object.color : defaultOptions.color,
  }
}
export function normalizePageMotion(value: unknown): PageMotionSettings {
  const object = value && typeof value === 'object' ? value as Partial<PageMotionSettings> : {}
  const preset = transitionIds.includes(object.preset as TransitionId) ? object.preset as TransitionId : 'original'
  return preset === 'original' ? { ...defaultPageMotion } : {
    preset,
    duration: numberIn(object.duration, defaultOptions.duration, 160, 1600),
    distance: numberIn(object.distance, defaultOptions.distance, 0, 100),
  }
}

/** 进入和离开共用同一数据模型；动画仅表达视觉，导航完成由调用方控制。 */
export function transitionFrames(preset: TransitionId, phase: 'enter' | 'leave', distance: number): Keyframe[] {
  const d = Math.max(0, Math.min(100, distance))
  const normal: Keyframe = { opacity: 1, transform: 'none', clipPath: 'inset(0)' }
  const from: Record<TransitionId, Keyframe> = {
    rise: { opacity: 0, transform: `translateY(${d}px)` },
    fade: { opacity: 0 },
    slide: { opacity: 0, transform: `translateX(${d * 2}px)` },
    curtain: { opacity: 1, clipPath: 'inset(0 0 100% 0)' },
    iris: { opacity: 1, clipPath: 'circle(0% at 50% 50%)' },
    zoom: { opacity: 0, transform: `scale(${1 - d / 1000})` },
  }
  if (phase === 'enter') {
    return [from[preset], preset === 'iris' ? { opacity: 1, clipPath: 'circle(150% at 50% 50%)' } : normal]
  }
  return [{ opacity: 1, transform: 'none' }, {
    opacity: 0,
    transform: preset === 'slide' ? `translateX(-${d}px)` : preset === 'rise' ? `translateY(-${d / 2}px)` : 'none',
  }]
}
