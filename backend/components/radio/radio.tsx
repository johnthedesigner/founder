import * as React from 'react'
import { Radio as RadioPrimitive } from '@base-ui-components/react/radio'

export interface RadioProps extends Omit<React.ComponentPropsWithoutRef<typeof RadioPrimitive.Root>, 'className'> {
  label?: string
  className?: string
}

export function Radio({ label, className = '', ...props }: RadioProps) {
  return (
    <label className="inline-flex items-center gap-[--radio-gap]">
      <RadioPrimitive.Root
        className={`size-[--radio-size] rounded-full border border-[--radio-border-color] bg-[--radio-color-unchecked] focus-visible:outline-2 focus-visible:outline-[--color-border-action] data-[checked]:border-[--radio-color-checked] ${className}`}
        {...props}
      >
        <RadioPrimitive.Indicator className="flex items-center justify-center">
          <span className="size-2 rounded-full bg-[--radio-color-checked]" />
        </RadioPrimitive.Indicator>
      </RadioPrimitive.Root>
      {label && <span className="text-[--color-text-primary]">{label}</span>}
    </label>
  )
}
