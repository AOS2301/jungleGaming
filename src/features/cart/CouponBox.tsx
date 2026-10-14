import { Tag, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { toApiError } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { useApplyCoupon, useRemoveCoupon } from './hooks'

/** Campo de cupom (ou o cupom aplicado, com botão de remover). */
export function CouponBox({ couponCode, disabled }: { couponCode: string | null; disabled: boolean }) {
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string>()
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return setError('Informe o código do cupom')
    setError(undefined)
    apply.mutate(code.trim(), {
      onSuccess: () => {
        setCode('')
        toast.success('Cupom aplicado')
      },
      onError: (err) => setError(toApiError(err).fields.code ?? toApiError(err).message),
    })
  }
  if (couponCode) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-success/40 bg-success/10 px-4 py-3" data-testid="coupon-applied">
        <p className="flex items-center gap-2 text-sm font-semibold"><Tag className="size-4 text-success" aria-hidden /> Cupom <span className="eth">{couponCode}</span> aplicado</p>
        <Button variant="ghost" size="sm" onClick={() => remove.mutate()} loading={remove.isPending} aria-label={`Remover cupom ${couponCode}`}>
          <X aria-hidden /> Remover
        </Button>
      </div>
    )
  }
  return (
    <form onSubmit={submit} noValidate className="flex items-start gap-2">
      <FormField id="coupon" label="Cupom de desconto" error={error} className="flex-1">
        {(a11y) => (
          <Input {...a11y} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Digite o código" autoComplete="off" disabled={disabled} />
        )}
      </FormField>
      <Button type="submit" variant="secondary" className="mt-[30px]" loading={apply.isPending} disabled={disabled}>Aplicar</Button>
    </form>
  )
}
