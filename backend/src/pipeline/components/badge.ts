import type { GeneratedFile } from '@ds-gen/types'

export function generateBadge(): GeneratedFile[] {
  return [
    {
      path: 'components/badge/badge.tsx',
      content: `import * as React from 'react'
import { cn } from '../utils'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-[--color-action-secondary] text-[--color-action-secondary-fg]',
  success: 'bg-[--color-feedback-success] text-[--color-action-primary-fg]',
  warning: 'bg-[--color-feedback-warning] text-[--color-action-primary-fg]',
  error: 'bg-[--color-feedback-error] text-[--color-action-primary-fg]',
  info: 'bg-[--color-feedback-info] text-[--color-action-primary-fg]',
}

export function Badge({ variant = 'default', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[--badge-border-radius] px-[--badge-padding] text-[--badge-font-size] font-[--badge-font-weight]',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  )
}
`,
    },
    {
      path: 'components/badge/badge.types.ts',
      content: `export type { BadgeProps, BadgeVariant } from './badge'
`,
    },
  ]
}
