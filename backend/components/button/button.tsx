import * as React from 'react'
import { Button as BaseButton } from '@base-ui-components/react/button'
import { cva } from 'cva'
import { cn } from '../utils'
import type { ButtonProps } from './button.types'

const buttonVariants = cva({
  base: 'inline-flex items-center justify-center font-[--button-font-weight] rounded-[--button-border-radius] transition-colors focus-visible:outline-2 focus-visible:outline-[--color-border-action] disabled:opacity-50 disabled:pointer-events-none',
  variants: {
    variant: {
      primary: 'bg-[--color-action-primary] text-[--color-action-primary-fg] hover:bg-[--color-action-primary-hover]',
      secondary: 'bg-[--color-action-secondary] text-[--color-action-secondary-fg]',
      ghost: 'bg-transparent text-[--color-text-primary] hover:bg-[--color-surface-subtle]',
      destructive: 'bg-[--color-action-destructive] text-[--color-action-destructive-fg]',
    },
    size: {
      sm: 'text-[--font-size-sm] px-[--button-padding-sm]',
      md: 'text-[--font-size-base] px-[--button-padding-md]',
      lg: 'text-[--font-size-lg] px-[--button-padding-lg]',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
})

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <BaseButton
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
