import { AlertCircle } from 'lucide-react'
import * as React from 'react'
import { cn } from '@/lib/utils'
import { Label } from './label'

/**
 * Campo de formulário acessível: rótulo associado, dica e erro ligados via aria-describedby,
 * erro anunciado por role="alert" e indicado por ícone + texto (não só por cor).
 */
export function FormField({
  id, label, error, hint, required, className, children,
}: {
  id: string
  label: React.ReactNode
  error?: string
  hint?: React.ReactNode
  required?: boolean
  className?: string
  /** Render prop recebe as props de acessibilidade a espalhar no controle. */
  children: (a11y: { id: string; 'aria-invalid': boolean | undefined; 'aria-describedby': string | undefined; 'aria-required': boolean | undefined }) => React.ReactNode
}) {
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint && !error ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-0.5 text-danger" aria-hidden="true"> *</span>}
      </Label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy, 'aria-required': required || undefined })}
      {hint && !error && <p id={hintId} className="text-[13px] text-muted">{hint}</p>}
      {error && (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-[13px] font-medium text-danger">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
