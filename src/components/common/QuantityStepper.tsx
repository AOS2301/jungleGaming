import { Minus, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export function QuantityStepper({
  value, onChange, min = 1, max, disabled, label = 'Quantidade', className, size = 'md', id,
}: {
  value: number
  onChange: (next: number) => void
  min?: number
  max: number
  disabled?: boolean
  label?: string
  className?: string
  size?: 'sm' | 'md'
  id?: string
}) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])
  const clamp = (n: number) => Math.min(Math.max(n, min), Math.max(min, max))
  const commit = (raw: string) => {
    const parsed = Number.parseInt(raw, 10)
    const next = Number.isFinite(parsed) ? clamp(parsed) : value
    setDraft(String(next))
    if (next !== value) onChange(next)
  }
  const btn = cn(
    'inline-flex items-center justify-center text-foreground transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40',
    size === 'sm' ? 'size-9' : 'size-11',
  )
  return (
    <div role="group" aria-label={label} className={cn('inline-flex items-center overflow-hidden rounded-md border border-border bg-surface', className)}>
      <button type="button" className={btn} disabled={disabled || value <= min} onClick={() => onChange(clamp(value - 1))} aria-label={`Diminuir ${label.toLowerCase()}`}>
        <Minus className="size-4" aria-hidden />
      </button>
      <input
        id={id}
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, '').slice(0, 3))}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit(draft)
          if (e.key === 'ArrowUp') { e.preventDefault(); onChange(clamp(value + 1)) }
          if (e.key === 'ArrowDown') { e.preventDefault(); onChange(clamp(value - 1)) }
        }}
        className={cn('eth w-12 bg-transparent text-center text-base font-bold outline-offset-[-2px]', size === 'sm' ? 'h-9' : 'h-11')}
      />
      <button type="button" className={btn} disabled={disabled || value >= max} onClick={() => onChange(clamp(value + 1))} aria-label={`Aumentar ${label.toLowerCase()}`}>
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  )
}
