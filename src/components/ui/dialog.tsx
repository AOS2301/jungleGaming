import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Dialog/Sheet sobre Radix: foco aprisionado e devolvido ao gatilho ao fechar, Esc fecha,
 * aria-modal e título/descrição associados (aria-labelledby/-describedby automáticos).
 */
export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close
export const DialogPortal = DialogPrimitive.Portal

export const DialogOverlay = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Overlay>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay ref={ref} className={cn('fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] animate-fade-in', className)} {...props} />
  ),
)
DialogOverlay.displayName = 'DialogOverlay'

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { side?: 'center' | 'left' | 'right' | 'bottom'; hideClose?: boolean }
>(({ className, children, side = 'center', hideClose, onCloseAutoFocus, onOpenAutoFocus, ...props }, ref) => {
  // Diálogos abertos por estado (sem <DialogTrigger>) não têm gatilho para o Radix devolver o foco:
  // guardamos o elemento que tinha foco ao abrir e o restauramos ao fechar.
  const opener = React.useRef<HTMLElement | null>(null)
  return (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      onOpenAutoFocus={(event) => {
        opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        onOpenAutoFocus?.(event)
      }}
      onCloseAutoFocus={(event) => {
        onCloseAutoFocus?.(event)
        if (opener.current?.isConnected) opener.current.focus()
      }}
      className={cn(
        'fixed z-50 flex flex-col gap-4 border border-border bg-surface p-6 shadow-2xl animate-fade-in',
        side === 'center' && 'left-1/2 top-1/2 max-h-[90dvh] w-[calc(100%-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg',
        side === 'left' && 'inset-y-0 left-0 h-dvh w-[min(88vw,340px)] overflow-y-auto border-y-0 border-l-0',
        side === 'right' && 'inset-y-0 right-0 h-dvh w-[min(92vw,400px)] overflow-y-auto border-y-0 border-r-0',
        side === 'bottom' && 'inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-lg border-x-0 border-b-0',
        className,
      )}
      {...props}
    >
      {children}
      {!hideClose && (
        <DialogPrimitive.Close className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-foreground" aria-label="Fechar">
          <X className="size-5" aria-hidden />
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
  )
})
DialogContent.displayName = 'DialogContent'

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn('flex flex-col gap-1.5 pr-8', className)} {...props} />
export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />
)

export const DialogTitle = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Title>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(
  ({ className, ...props }, ref) => <DialogPrimitive.Title ref={ref} className={cn('text-xl font-bold', className)} {...props} />,
)
DialogTitle.displayName = 'DialogTitle'

export const DialogDescription = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Description>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>>(
  ({ className, ...props }, ref) => <DialogPrimitive.Description ref={ref} className={cn('text-sm text-muted', className)} {...props} />,
)
DialogDescription.displayName = 'DialogDescription'
