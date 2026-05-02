import type { GeneratedFile } from '@ds-gen/types'

export function generateDialog(): GeneratedFile[] {
  return [
    {
      path: 'components/dialog/dialog.tsx',
      content: `import * as React from 'react'
import { Dialog as DialogPrimitive } from '@base-ui-components/react/dialog'

export { Dialog } from '@base-ui-components/react/dialog'

export interface DialogContentProps {
  children: React.ReactNode
  className?: string
  title?: string
  description?: string
}

export function DialogContent({ children, className = '', title, description }: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 bg-[--color-text-primary]/50" />
      <DialogPrimitive.Popup
        className={\`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[--dialog-border-radius] bg-[--dialog-background] p-[--dialog-padding] shadow-[--dialog-shadow] focus-visible:outline-none \${className}\`}
      >
        {title && (
          <DialogPrimitive.Title className="text-[--color-text-primary] font-[--font-weight-semibold]">
            {title}
          </DialogPrimitive.Title>
        )}
        {description && (
          <DialogPrimitive.Description className="text-[--color-text-secondary]">
            {description}
          </DialogPrimitive.Description>
        )}
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}
`,
    },
    {
      path: 'components/dialog/dialog.types.ts',
      content: `export type { Dialog } from '@base-ui-components/react/dialog'
export type { DialogContentProps } from './dialog'
`,
    },
  ]
}
