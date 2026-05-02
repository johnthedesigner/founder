import type { GeneratedFile } from '@ds-gen/types'

export function generateCard(): GeneratedFile[] {
  return [
    {
      path: 'components/card/card.tsx',
      content: `import * as React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {}
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className = '', ...props }: CardProps) {
  return (
    <div
      className={\`rounded-[--card-border-radius] border border-[--card-border-color] bg-[--card-background] shadow-[--card-shadow] \${className}\`}
      {...props}
    />
  )
}

export function CardHeader({ className = '', ...props }: CardHeaderProps) {
  return <div className={\`px-[--card-padding] pt-[--card-padding] \${className}\`} {...props} />
}

export function CardBody({ className = '', ...props }: CardBodyProps) {
  return <div className={\`px-[--card-padding] py-[--card-padding] \${className}\`} {...props} />
}

export function CardFooter({ className = '', ...props }: CardFooterProps) {
  return <div className={\`px-[--card-padding] pb-[--card-padding] \${className}\`} {...props} />
}
`,
    },
    {
      path: 'components/card/card.types.ts',
      content: `export type { CardProps, CardHeaderProps, CardBodyProps, CardFooterProps } from './card'
`,
    },
  ]
}
