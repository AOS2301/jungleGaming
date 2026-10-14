import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import * as React from 'react'
import { cn } from '@/lib/utils'

export const RadioGroup = React.forwardRef<React.ElementRef<typeof RadioGroupPrimitive.Root>, React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>>(
  ({ className, ...props }, ref) => <RadioGroupPrimitive.Root ref={ref} className={cn('grid gap-3', className)} {...props} />,
)
RadioGroup.displayName = 'RadioGroup'

export const RadioGroupItem = React.forwardRef<React.ElementRef<typeof RadioGroupPrimitive.Item>, React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>>(
  ({ className, children, ...props }, ref) => (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        'group relative flex w-full cursor-pointer items-start gap-3 rounded-md border border-border bg-surface p-4 text-left transition-colors hover:border-muted/70 data-[state=checked]:border-primary data-[state=checked]:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-55',
        className,
      )}
      {...props}
    >
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-muted group-data-[state=checked]:border-primary" aria-hidden>
        <RadioGroupPrimitive.Indicator className="size-2.5 rounded-full bg-primary" />
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </RadioGroupPrimitive.Item>
  ),
)
RadioGroupItem.displayName = 'RadioGroupItem'
