import type { GeneratedFile } from '@ds-gen/types'

export function generatePopover(): GeneratedFile[] {
  return [
    {
      path: 'components/popover/popover.tsx',
      content: `import * as React from 'react'
import { Popover as PopoverPrimitive } from '@base-ui-components/react/popover'

export { Popover } from '@base-ui-components/react/popover'

export interface PopoverContentProps {
  children: React.ReactNode
  className?: string
}

export function PopoverContent({ children, className = '' }: PopoverContentProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Popup
        className={\`rounded-[--popover-border-radius] border border-[--popover-border-color] bg-[--popover-background] p-[--popover-padding] shadow-[--popover-shadow] focus-visible:outline-none \${className}\`}
      >
        {children}
      </PopoverPrimitive.Popup>
    </PopoverPrimitive.Portal>
  )
}
`,
    },
    {
      path: 'components/popover/popover.types.ts',
      content: `export type { Popover } from '@base-ui-components/react/popover'
export type { PopoverContentProps } from './popover'
`,
    },
  ]
}
