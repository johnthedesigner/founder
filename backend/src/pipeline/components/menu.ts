import type { GeneratedFile } from '@ds-gen/types'

export function generateMenu(): GeneratedFile[] {
  return [
    {
      path: 'components/menu/menu.tsx',
      content: `import * as React from 'react'
import { Menu as MenuPrimitive } from '@base-ui-components/react/menu'

export { Menu } from '@base-ui-components/react/menu'

export interface MenuItemProps extends React.ComponentPropsWithoutRef<typeof MenuPrimitive.Item> {}

export function MenuItem({ className = '', ...props }: MenuItemProps) {
  return (
    <MenuPrimitive.Item
      className={\`cursor-default px-[--menu-item-padding] text-[--color-text-primary] text-[--menu-item-font-size] focus-visible:outline-none data-[highlighted]:bg-[--menu-item-color-hover] \${className}\`}
      {...props}
    />
  )
}

export function MenuPopup({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <MenuPrimitive.Popup
      className={\`rounded-[--menu-border-radius] bg-[--menu-background] p-[--menu-padding] shadow-[--menu-shadow] focus-visible:outline-none \${className}\`}
      {...props}
    />
  )
}
`,
    },
    {
      path: 'components/menu/menu.types.ts',
      content: `export type { Menu } from '@base-ui-components/react/menu'
export type { MenuItemProps } from './menu'
`,
    },
  ]
}
