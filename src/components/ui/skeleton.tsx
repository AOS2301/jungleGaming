import { cn } from '@/lib/utils'

/** Placeholder com shimmer. Sempre receba dimensões explícitas para evitar deslocamento de layout. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn('skeleton', className)} {...props} />
}
