import type { ElementType } from 'react'
import { useContent } from '../../lib/contentStore'

interface EditableTextProps {
  value: string
  /** 内容路径，如 "about.introTitle"、"members.0.name" */
  path: string
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div'
  className?: string
  multiline?: boolean
  placeholder?: string
}

/** 管理员模式下的可编辑文本：点击直接输入，修改自动保存 */
export default function EditableText({ value, path, as = 'span', className, multiline, placeholder }: EditableTextProps) {
  const { admin, setAt } = useContent()
  const Tag: ElementType = as

  if (!admin) return <Tag className={className}>{value}</Tag>

  const inputClass =
    'rounded border border-dashed border-brand-500 bg-ink-900/90 px-2 py-1 text-parchment-100 outline-none transition-colors focus:border-brand-400'

  if (multiline) {
    return (
      <textarea
        className={`${inputClass} w-full resize-y leading-relaxed ${className ?? ''}`}
        value={value}
        placeholder={placeholder}
        rows={3}
        onChange={(event) => setAt(path, event.target.value)}
      />
    )
  }

  return (
    <input
      className={`${inputClass} ${className ?? ''}`}
      value={value}
      placeholder={placeholder}
      onChange={(event) => setAt(path, event.target.value)}
    />
  )
}
