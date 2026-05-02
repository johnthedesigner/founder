import type { GeneratedFile } from '@ds-gen/types'

export function generateInput(): GeneratedFile[] {
  return [
    {
      path: 'components/input/input.tsx',
      content: `import * as React from 'react'
import { Input as BaseInput } from '@base-ui-components/react/input'
import { cn } from '../utils'
import type { InputProps } from './input.types'

export function Input({ className, ...props }: InputProps) {
  return (
    <BaseInput
      className={cn(
        'w-full rounded-[--input-border-radius] border border-[--input-border-color] bg-[--input-background] px-[--input-padding] text-[--input-color] text-[--input-font-size] focus-visible:outline-2 focus-visible:outline-[--color-border-action] focus-visible:border-[--input-border-color-focus] disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
`,
    },
    {
      path: 'components/input/input.types.ts',
      content: `import type { ComponentPropsWithoutRef } from 'react'
import type { Input as BaseInput } from '@base-ui-components/react/input'

export interface InputProps extends Omit<ComponentPropsWithoutRef<typeof BaseInput>, 'className'> {
  className?: string
}
`,
    },
  ]
}
