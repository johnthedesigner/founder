import * as React from 'react'
import { Checkbox as CheckboxPrimitive } from '@base-ui-components/react/checkbox'
import { cn } from '../utils'

export interface CheckboxProps extends Omit<React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>, 'className'> {
  label?: string
  className?: string
}

export function Checkbox({ label, className, ...props }: CheckboxProps) {
  return (
    <label className="inline-flex items-center gap-[--checkbox-gap]">
      <CheckboxPrimitive.Root
        className={cn(
          'size-[--checkbox-size] rounded-[--checkbox-border-radius] border border-[--checkbox-border-color] bg-[--checkbox-color-unchecked] focus-visible:outline-2 focus-visible:outline-[--color-border-action] data-[checked]:bg-[--checkbox-color-checked]',
          className,
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-[--checkbox-color-checked-fg]">
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
            <path d="M1 4L4 7L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {label && <span className="text-[--color-text-primary]">{label}</span>}
    </label>
  )
}
