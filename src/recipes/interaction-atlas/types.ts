/** 内容数据与动画分开：稳定 id 用于选择；图片始终保留比例和替代文本。 */
export interface AtlasCard {
  id: string
  title: string
  image: string
  alt: string
  description?: string
  author?: string
  color?: string
}

/** 不传 value 为组件管理状态；传 value 后由父组件决定是否接受 onChange。 */
export interface SelectionProps {
  items: AtlasCard[]
  value?: string
  onChange?: (id: string) => void
  label?: string
}

export interface Reaction {
  id: string
  label: string
  symbol: string
  color?: string
}

export interface Point { x: number; y: number }
