import type { Edition } from '@/api/contracts'
import { Eth } from '@/components/common/Eth'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'

/** Escolha da edição (cada uma tem preço e estoque próprios). Edições esgotadas continuam visíveis. */
export function EditionPicker({ editions, selectedId, onSelect }: { editions: Edition[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Edição</legend>
      <RadioGroup value={selectedId} onValueChange={onSelect} aria-label="Escolha a edição" className="sm:grid-cols-2">
        {editions.map((edition) => {
          const soldOut = edition.available === 0
          return (
            <RadioGroupItem key={edition.id} value={edition.id} aria-describedby={`stock-${edition.id}`} data-testid={`edition-${edition.id}`} className={cn(soldOut && 'opacity-75')}>
              <span className="flex items-center justify-between gap-2">
                <span className="font-bold">{edition.name}</span>
                <Eth value={edition.price} className="text-sm font-bold" />
              </span>
              <span id={`stock-${edition.id}`} className={cn('mt-1 block text-[13px]', soldOut ? 'font-semibold text-danger' : 'text-muted')}>
                {soldOut ? 'Esgotada' : `${edition.available} de ${edition.total} disponíveis`}
              </span>
            </RadioGroupItem>
          )
        })}
      </RadioGroup>
    </fieldset>
  )
}
