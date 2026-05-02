import type { GeneratedFile } from '@ds-gen/types'

export function generateAvatar(): GeneratedFile[] {
  return [
    {
      path: 'components/avatar/avatar.tsx',
      content: `import * as React from 'react'
import { cn } from '../utils'

export type AvatarSize = 'sm' | 'md' | 'lg'

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string
  alt?: string
  initials?: string
  size?: AvatarSize
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'size-[--avatar-size-sm]',
  md: 'size-[--avatar-size-md]',
  lg: 'size-[--avatar-size-lg]',
}

export function Avatar({ src, alt, initials, size = 'md', className, ...props }: AvatarProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center overflow-hidden rounded-[--avatar-border-radius] bg-[--avatar-background]',
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {src ? (
        <img src={src} alt={alt ?? ''} className="h-full w-full object-cover" />
      ) : (
        <span className="text-[--avatar-color] font-[--font-weight-medium] select-none">
          {initials ?? '?'}
        </span>
      )}
    </span>
  )
}
`,
    },
    {
      path: 'components/avatar/avatar.types.ts',
      content: `export type { AvatarProps, AvatarSize } from './avatar'
`,
    },
  ]
}
