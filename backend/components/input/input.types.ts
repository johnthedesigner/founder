import type { ComponentPropsWithoutRef } from 'react'
import type { Input as BaseInput } from '@base-ui-components/react/input'

export interface InputProps extends Omit<ComponentPropsWithoutRef<typeof BaseInput>, 'className'> {
  className?: string
}
