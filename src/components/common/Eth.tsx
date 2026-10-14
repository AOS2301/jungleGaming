import { formatEth } from '@/lib/decimal'
import { cn } from '@/lib/utils'

/** Valor em ETH com precisão preservada; o "ETH" é texto (não depende de cor/ícone). */
export function Eth({ value, className, unitClassName, showUnit = true }: { value: string; className?: string; unitClassName?: string; showUnit?: boolean }) {
  return (
    <span className={cn('eth whitespace-nowrap', className)}>
      {formatEth(value)}
      {showUnit && <span className={cn('ml-1 text-[0.85em] font-normal text-muted', unitClassName)}>ETH</span>}
    </span>
  )
}
