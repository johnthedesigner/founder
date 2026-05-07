import * as React from 'react'
import { Switch as SwitchPrimitive } from '@base-ui-components/react/switch'

export interface SwitchProps extends Omit<React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>, 'className'> {
  label?: string
  className?: string
}

export function Switch({ label, className = '', ...props }: SwitchProps) {
  return (
    <label className="inline-flex items-center gap-[--switch-gap]">
      <SwitchPrimitive.Root
        className={`relative inline-flex h-[--switch-height] w-[--switch-width] items-center rounded-[--switch-border-radius] bg-[--switch-color-unchecked] transition-colors focus-visible:outline-2 focus-visible:outline-[--color-border-action] data-[checked]:bg-[--switch-color-checked] ${className}`}
        {...props}
      >
        <SwitchPrimitive.Thumb className="pointer-events-none block size-4 translate-x-0.5 rounded-[--switch-thumb-border-radius] bg-[--switch-thumb-background] shadow transition-transform data-[checked]:translate-x-[calc(var(--switch-width)-1.125rem)]" />
      </SwitchPrimitive.Root>
      {label && <span className="text-[--color-text-primary]">{label}</span>}
    </label>
  )
}
