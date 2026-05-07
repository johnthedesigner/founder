import * as React from 'react'
import { Tabs as TabsPrimitive } from '@base-ui-components/react/tabs'

export { Tabs } from '@base-ui-components/react/tabs'

export interface TabsTabProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Tab> {}

export function TabsTab({ className = '', ...props }: TabsTabProps) {
  return (
    <TabsPrimitive.Tab
      className={`px-[--tabs-padding] font-[--tabs-font-weight-inactive] text-[--tabs-color-inactive] transition-colors focus-visible:outline-2 focus-visible:outline-[--color-border-action] data-[selected]:font-[--tabs-font-weight-active] data-[selected]:text-[--tabs-color-active] ${className}`}
      {...props}
    />
  )
}
