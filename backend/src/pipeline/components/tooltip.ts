import type { GeneratedFile } from '@ds-gen/types'

export function generateTooltip(): GeneratedFile[] {
  return [
    {
      path: 'components/tooltip/tooltip.tsx',
      content: `import * as React from 'react'
import { Tooltip as TooltipPrimitive } from '@base-ui-components/react/tooltip'

export { Tooltip } from '@base-ui-components/react/tooltip'

export interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  className?: string
}

export function TooltipWrapper({ children, content, className = '' }: TooltipProps) {
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger className="focus-visible:outline-2 focus-visible:outline-[--color-border-action]">
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Popup
            className={\`rounded-[--tooltip-border-radius] bg-[--tooltip-background] px-[--tooltip-padding] py-1 text-[--tooltip-color] text-[--tooltip-font-size] \${className}\`}
          >
            {content}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
`,
    },
    {
      path: 'components/tooltip/tooltip.types.ts',
      content: `export type { Tooltip } from '@base-ui-components/react/tooltip'
export type { TooltipProps } from './tooltip'
`,
    },
  ]
}
