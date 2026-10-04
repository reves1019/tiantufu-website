import { ArrowRight } from 'lucide-react'
import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react'
import './creative-button.css'

export interface CreativeButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  text?: ReactNode
  direction?: 'right' | 'top'
}

/** Compact directional button language for secondary and utility actions. */
export function CreativeButton({ text, direction = 'right', className = '', type = 'button', ...props }: CreativeButtonProps) {
  return <button type={type} className={`creative-button creative-button--${direction} ${className}`} {...props}>
    <span className="creative-button-label">{text}</span>
    <ArrowRight className="creative-button-arrow" aria-hidden="true" size={16} strokeWidth={1.7} />
    <span className="creative-button-ink" aria-hidden="true" />
  </button>
}

export interface CreativeButtonLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> {
  text?: ReactNode
  direction?: 'right' | 'top'
}

/** Anchor counterpart for public CTAs that leave the current scene. */
export const CreativeButtonLink = forwardRef<HTMLAnchorElement, CreativeButtonLinkProps>(function CreativeButtonLink(
  { text, direction = 'right', className = '', ...props }, ref,
) {
  return <a ref={ref} className={`creative-button creative-button--${direction} ${className}`} {...props}>
    <span className="creative-button-label">{text}</span>
    <ArrowRight className="creative-button-arrow" aria-hidden="true" size={16} strokeWidth={1.7} />
    <span className="creative-button-ink" aria-hidden="true" />
  </a>
})

