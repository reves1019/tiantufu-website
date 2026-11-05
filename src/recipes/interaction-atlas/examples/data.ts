import type { AtlasCard, Reaction } from '../types'

// 原创几何示意图，使用内联 SVG，无网络、字体、账号或网站素材依赖。
function diagram(color: string, variant: number): string {
  const paths = Array.from({ length: 7 }, (_, index) => {
    const y = 80 + index * 39
    return `<path d="M35 ${y} Q145 ${y - 65 - variant * 10} 240 ${y} T445 ${y - 20}" />`
  }).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="400" viewBox="0 0 480 400">
    <rect width="480" height="400" fill="#e4d7b9"/>
    <g stroke="${color}" stroke-width="2.5" fill="none">${paths}</g>
    <path d="M70 345 L170 145 L295 265 L410 55" stroke="#b54230" stroke-width="3" fill="none" stroke-dasharray="7 7"/>
    <circle cx="170" cy="145" r="8" fill="#b54230"/>
    <text x="25" y="380" fill="#394136" font-family="monospace" font-size="13">STUDY 0${variant + 1} / SCHEMATIC ONLY</text>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export const cards: AtlasCard[] = [
  { id: 'contours', title: '等高线练习', color: '#6b7555' },
  { id: 'routes', title: '路径练习', color: '#8a5739' },
  { id: 'layers', title: '层次练习', color: '#466373' },
].map((item, index) => ({
  ...item,
  image: diagram(item.color, index),
  alt: `${item.title}：曲线、虚线和节点组成的教学示意图`,
  description: '程序生成的教学示意图，不代表真实地理数据。',
}))

export const reactions: Reaction[] = [
  { id: 'like', label: '喜欢', symbol: '♡', color: '#9f4439' },
  { id: 'idea', label: '有启发', symbol: '✧', color: '#887348' },
  { id: 'curious', label: '想了解', symbol: '◎', color: '#496b63' },
]
