import * as React from 'react'
import { Select as SelectPrimitive } from '@base-ui-components/react/select'

export { Select } from '@base-ui-components/react/select'

export function SelectTrigger({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <SelectPrimitive.Trigger
      className={`inline-flex items-center justify-between rounded-[--select-border-radius] border border-[--select-border-color] bg-[--select-background] px-[--select-padding] text-[--select-color] focus-visible:outline-2 focus-visible:outline-[--color-border-action] ${className}`}
      {...props}
    >
      {children}
    </SelectPrimitive.Trigger>
  )
}
