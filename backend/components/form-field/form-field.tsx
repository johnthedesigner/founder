import * as React from 'react'
import { Field as FieldPrimitive } from '@base-ui-components/react/field'

export interface FormFieldProps {
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export function FormField({ label, hint, error, required, children, className = '' }: FormFieldProps) {
  return (
    <FieldPrimitive.Root
      invalid={Boolean(error)}
      className={`flex flex-col gap-[--form-field-gap] ${className}`}
    >
      <FieldPrimitive.Label className="text-[--form-field-label-font-size] font-[--form-field-label-font-weight] text-[--form-field-label-color]">
        {label}
        {required && <span className="ml-1 text-[--form-field-error-color]" aria-hidden="true">*</span>}
      </FieldPrimitive.Label>
      {children}
      {hint && !error && (
        <FieldPrimitive.Description className="text-[--form-field-hint-color] text-[--form-field-error-font-size]">
          {hint}
        </FieldPrimitive.Description>
      )}
      <FieldPrimitive.Error className="text-[--form-field-error-color] text-[--form-field-error-font-size]" />
    </FieldPrimitive.Root>
  )
}
