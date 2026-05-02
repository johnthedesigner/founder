import type { GeneratedFile } from '@ds-gen/types'

export function generateAlert(): GeneratedFile[] {
  return [
    {
      path: 'components/alert/alert.tsx',
      content: `import * as React from 'react'
import { cn } from '../utils'

export type AlertVariant = 'success' | 'warning' | 'error' | 'info'

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant
  title?: string
}

const variantClasses: Record<AlertVariant, string> = {
  success: 'border-l-4 border-[--alert-color-success]',
  warning: 'border-l-4 border-[--alert-color-warning]',
  error: 'border-l-4 border-[--alert-color-error]',
  info: 'border-l-4 border-[--alert-color-info]',
}

export function Alert({ variant = 'info', title, className, children, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-[--alert-border-radius] bg-[--color-surface-subtle] px-[--alert-padding] text-[--alert-font-size]',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {title && (
        <p className="font-[--font-weight-semibold] text-[--color-text-primary]">{title}</p>
      )}
      <div className="text-[--color-text-secondary]">{children}</div>
    </div>
  )
}
`,
    },
    {
      path: 'components/alert/alert.types.ts',
      content: `export type { AlertProps, AlertVariant } from './alert'
`,
    },
  ]
}
