import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes } from 'react'
import { ArrowRight } from 'lucide-react'
import './flow-button.css'

export interface FlowButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  text?: string
  variant?: 'outline' | 'solid'
}

/** Arrow handoff and expanding ink wash; native button behaviour is preserved. */
export const FlowButton = forwardRef<HTMLButtonElement, FlowButtonProps>(function FlowButton(
  { text = '探索地图', variant = 'outline', className = '', type = 'button', ...props }, ref,
) {
  return <button ref={ref} type={type} className={`flow-button flow-button--${variant} ${className}`} {...props}>
    <span className="flow-button-wash" aria-hidden="true" />
    <span className="flow-button-arrow flow-button-arrow--in" aria-hidden="true"><ArrowRight size={16} strokeWidth={1.7} /></span>
    <span className="flow-button-text">{text}</span>
    <span className="flow-button-arrow flow-button-arrow--out" aria-hidden="true"><ArrowRight size={16} strokeWidth={1.7} /></span>
  </button>
})

export interface FlowButtonLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> {
  text: string
  variant?: 'outline' | 'solid'
}

export const FlowButtonLink = forwardRef<HTMLAnchorElement, FlowButtonLinkProps>(function FlowButtonLink(
  { text, variant = 'outline', className = '', ...props }, ref,
) {
  return <a ref={ref} className={`flow-button flow-button--${variant} ${className}`} {...props}>
    <span className="flow-button-wash" aria-hidden="true" />
    <span className="flow-button-arrow flow-button-arrow--in" aria-hidden="true"><ArrowRight size={16} strokeWidth={1.7} /></span>
    <span className="flow-button-text">{text}</span>
    <span className="flow-button-arrow flow-button-arrow--out" aria-hidden="true"><ArrowRight size={16} strokeWidth={1.7} /></span>
  </a>
})
