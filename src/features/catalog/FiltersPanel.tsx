import { useEffect, useState } from 'react'
import { CATEGORY_IDS, NETWORK_IDS } from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { isEthString, ethCompare } from '@/lib/decimal'
import { CATEGORY_LABELS, NETWORK_LABELS } from '@/lib/catalog'
import { splitCsv, toCsv, type CatalogSearch } from './search'

function CheckGroup<T extends string>({
  legend, idPrefix, options, labels, selected, counts, onChange,
}: {
  legend: string
  idPrefix: string
  options: readonly T[]
  labels: Record<T, string>
  selected: string[]
  counts?: Record<string, number>
  onChange: (next: string | undefined) => void
}) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-2 text-lg font-bold">{legend}</legend>
      {options.map((option) => {
        const id = `${idPrefix}-${legend}-${option}`
        const checked = selected.includes(option)
        return (
          <div key={option} className="flex items-center gap-3 rounded-sm px-1 py-1.5 hover:bg-surface-2">
            <Checkbox id={id} checked={checked} onCheckedChange={(value) => onChange(toCsv(value === true ? [...selected, option] : selected.filter((s) => s !== option)))} />
            <Label htmlFor={id} className={`flex flex-1 cursor-pointer items-center justify-between gap-2 py-0.5 text-[15px] ${checked ? 'text-accent' : 'font-medium'}`}>
              <span>{labels[option]}</span>
              {counts && <span className="eth text-[13px] font-normal text-muted" aria-label={`${counts[option] ?? 0} NFTs`}>({counts[option] ?? 0})</span>}
            </Label>
          </div>
        )
      })}
    </fieldset>
  )
}

export function FiltersPanel({
  search, onChange, onClear, idPrefix, canClear, facets,
}: {
  facets?: { category: Record<string, number>; network: Record<string, number> }
  search: CatalogSearch
  onChange: (patch: Partial<CatalogSearch>) => void
  onClear: () => void
  idPrefix: string
  canClear: boolean
}) {
  const [min, setMin] = useState(search.min ?? '')
  const [max, setMax] = useState(search.max ?? '')
  const [error, setError] = useState<string | undefined>()
  useEffect(() => {
    setMin(search.min ?? '')
    setMax(search.max ?? '')
    setError(undefined)
  }, [search.min, search.max])

  const applyPrice = () => {
    const lo = min.trim().replace(',', '.')
    const hi = max.trim().replace(',', '.')
    if ((lo && !isEthString(lo)) || (hi && !isEthString(hi))) return setError('Use números como 0.5 ou 1.25')
    if (lo && hi && ethCompare(lo, hi) > 0) return setError('O mínimo não pode ser maior que o máximo')
    setError(undefined)
    if ((lo || undefined) !== search.min || (hi || undefined) !== search.max) onChange({ min: lo || undefined, max: hi || undefined })
  }

  return (
    <form
      aria-label="Filtros do catálogo"
      className="flex flex-col gap-7"
      onSubmit={(e) => {
        e.preventDefault()
        applyPrice()
      }}
    >
      <CheckGroup legend="Categoria" idPrefix={idPrefix} options={CATEGORY_IDS} labels={CATEGORY_LABELS} counts={facets?.category} selected={splitCsv(search.category)} onChange={(category) => onChange({ category })} />
      <CheckGroup legend="Rede" idPrefix={idPrefix} options={NETWORK_IDS} labels={NETWORK_LABELS} counts={facets?.network} selected={splitCsv(search.network)} onChange={(network) => onChange({ network })} />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-lg font-bold">Preço (ETH)</legend>
        <div className="grid grid-cols-2 gap-3">
          <FormField id={`${idPrefix}-min`} label="Mínimo" error={error}>
            {(a11y) => <Input {...a11y} inputMode="decimal" placeholder="0" value={min} onChange={(e) => setMin(e.target.value)} onBlur={applyPrice} />}
          </FormField>
          <FormField id={`${idPrefix}-max`} label="Máximo">
            {(a11y) => <Input {...a11y} aria-describedby={undefined} aria-invalid={error ? true : undefined} inputMode="decimal" placeholder="10" value={max} onChange={(e) => setMax(e.target.value)} onBlur={applyPrice} />}
          </FormField>
        </div>
        <Button type="submit" variant="outline" size="sm">Aplicar preço</Button>
      </fieldset>

      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={`${idPrefix}-available`} className="cursor-pointer text-[15px]">Somente disponíveis</Label>
        <Switch id={`${idPrefix}-available`} checked={!!search.available} onCheckedChange={(v) => onChange({ available: v || undefined })} />
      </div>

      {canClear && (
        <Button type="button" variant="ghost" onClick={onClear} className="justify-start px-0 text-accent hover:bg-transparent hover:text-foreground">
          Limpar todos os filtros
        </Button>
      )}
    </form>
  )
}
