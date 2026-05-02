import type { GeneratedFile } from '@ds-gen/types'

export function generateTabs(): GeneratedFile[] {
  return [
    {
      path: 'components/tabs/tabs.tsx',
      content: `import * as React from 'react'
import { Tabs as TabsPrimitive } from '@base-ui-components/react/tabs'

export { Tabs } from '@base-ui-components/react/tabs'

export interface TabsTabProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Tab> {}

export function TabsTab({ className = '', ...props }: TabsTabProps) {
  return (
    <TabsPrimitive.Tab
      className={\`px-[--tabs-padding] font-[--tabs-font-weight-inactive] text-[--tabs-color-inactive] transition-colors focus-visible:outline-2 focus-visible:outline-[--color-border-action] data-[selected]:font-[--tabs-font-weight-active] data-[selected]:text-[--tabs-color-active] \${className}\`}
      {...props}
    />
  )
}
`,
    },
    {
      path: 'components/tabs/tabs.types.ts',
      content: `export type { Tabs } from '@base-ui-components/react/tabs'
export type { TabsTabProps } from './tabs'
`,
    },
  ]
}
