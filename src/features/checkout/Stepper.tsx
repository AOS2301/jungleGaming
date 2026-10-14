import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = ['Dados e carteira', 'Revisão', 'Confirmação']

/** Indicador de etapas: dados → revisão → confirmação (a confirmação é a página do pedido). */
export function Stepper({ step }: { step: 'details' | 'review' }) {
  const currentIndex = step === 'details' ? 0 : 1
  return (
    <ol aria-label="Etapas do pagamento" className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      {STEPS.map((label, i) => {
        const done = i < currentIndex
        const active = i === currentIndex
        return (
          <li key={label} aria-current={active ? 'step' : undefined} className={cn('flex items-center gap-2', active ? 'font-bold' : 'text-muted')}>
            <span
              className={cn(
                'eth flex size-6 items-center justify-center rounded-full border text-xs',
                done && 'border-success bg-success text-[#052e16]',
                active && 'border-primary bg-primary text-primary-foreground',
              )}
            >
              {done ? <Check className="size-3.5" aria-label="concluída" /> : i + 1}
            </span>
            {label}
          </li>
        )
      })}
    </ol>
  )
}
