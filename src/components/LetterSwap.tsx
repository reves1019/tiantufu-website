import { useEffect, useRef, useState } from 'react'

const SCRAMBLE_POOL = '天图府舆图志山海经史探索构建绘制制图学疆域文字ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·'

interface LetterSwapProps {
  text: string
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span'
  className?: string
  /** 每个字符开始滚动的交错间隔（ms） */
  stagger?: number
}

/**
 * 文字切换效果（视频中的 Letter Swap / 21st.dev 组件）：
 * 悬停时字符逐个快速滚动替换，最终落回原文字；移开后归位。
 */
export default function LetterSwap({ text, as: Tag = 'span', className, stagger = 42 }: LetterSwapProps) {
  const [chars, setChars] = useState<string[]>(text.split(''))
  const sessionRef = useRef(0)

  useEffect(() => {
    setChars(text.split(''))
  }, [text])

  const runScramble = () => {
    const session = ++sessionRef.current
    const target = text.split('')
    target.forEach((_, i) => {
      window.setTimeout(() => {
        if (sessionRef.current !== session) return
        let step = 0
        const tick = () => {
          if (sessionRef.current !== session) return
          step += 1
          setChars((prev) => {
            const next = [...prev]
            next[i] = step >= 6 ? target[i] : SCRAMBLE_POOL[(Math.random() * SCRAMBLE_POOL.length) | 0]
            return next
          })
          if (step < 6) window.setTimeout(tick, 46)
        }
        tick()
      }, i * stagger)
    })
  }

  const settle = () => {
    sessionRef.current += 1
    setChars(text.split(''))
  }

  return (
    <Tag
      className={className}
      onMouseEnter={runScramble}
      onMouseLeave={settle}
      data-letterswap={text}
    >
      {chars.join('')}
    </Tag>
  )
}
