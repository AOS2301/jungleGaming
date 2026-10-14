import * as React from 'react'
import { cn } from '@/lib/utils'

export const inputClasses =
  'flex h-11 w-full rounded-md border border-border bg-surface px-3.5 text-base text-foreground placeholder:text-muted/80 transition-colors hover:border-muted/60 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger md:text-[15px]'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type = 'text', ...props }, ref) => (
  <input ref={ref} type={type} className={cn(inputClasses, className)} {...props} />
))
Input.displayName = 'Input'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(inputClasses, 'h-auto min-h-24 resize-y py-2.5', className)} {...props} />
))
Textarea.displayName = 'Textarea'
