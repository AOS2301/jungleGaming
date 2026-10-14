import * as AvatarPrimitive from '@radix-ui/react-avatar'
import * as React from 'react'
import { cn } from '@/lib/utils'

export const Avatar = React.forwardRef<React.ElementRef<typeof AvatarPrimitive.Root>, React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>>(
  ({ className, ...props }, ref) => (
    <AvatarPrimitive.Root ref={ref} className={cn('relative flex size-10 shrink-0 overflow-hidden rounded-full bg-surface-2', className)} {...props} />
  ),
)
Avatar.displayName = 'Avatar'

export const AvatarImage = React.forwardRef<React.ElementRef<typeof AvatarPrimitive.Image>, React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>>(
  ({ className, ...props }, ref) => <AvatarPrimitive.Image ref={ref} className={cn('aspect-square size-full object-cover', className)} {...props} />,
)
AvatarImage.displayName = 'AvatarImage'

export const AvatarFallback = React.forwardRef<React.ElementRef<typeof AvatarPrimitive.Fallback>, React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>>(
  ({ className, ...props }, ref) => (
    <AvatarPrimitive.Fallback ref={ref} className={cn('flex size-full items-center justify-center bg-primary/30 text-sm font-bold text-foreground', className)} {...props} />
  ),
)
AvatarFallback.displayName = 'AvatarFallback'
