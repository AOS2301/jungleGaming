import { Link } from '@tanstack/react-router'
import { WalletCards } from 'lucide-react'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { COUNTRIES, NETWORK_IDS, type Wallet } from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NETWORK_LABELS } from '@/lib/catalog'
import type { CheckoutForm } from './form'
import { Section } from './Section'
import { WalletPicker } from './WalletPicker'

interface Props {
  form: UseFormReturn<CheckoutForm>
  wallets: Wallet[]
  canReview: boolean
  onSubmit: React.FormEventHandler<HTMLFormElement>
}

/** Etapa 1 do checkout: dados do colecionador, rede e carteira. */
export function CollectorForm({ form, wallets, canReview, onSubmit }: Props) {
  const { register, control, watch, setValue, formState: { errors } } = form
  const { network, walletId } = watch()

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6" aria-label="Dados do pedido">
      <Section number={1} title="Dados do colecionador">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField id="fullName" label="Nome completo" required error={errors.fullName?.message} className="sm:col-span-2">
            {(a11y) => <Input {...a11y} autoComplete="name" {...register('fullName')} />}
          </FormField>
          <FormField id="email" label="E-mail" required error={errors.email?.message}>
            {(a11y) => <Input {...a11y} type="email" autoComplete="email" {...register('email')} />}
          </FormField>
          <FormField id="document" label="Documento (CPF ou passaporte)" required error={errors.document?.message}>
            {(a11y) => <Input {...a11y} autoComplete="off" {...register('document')} />}
          </FormField>
          <FormField id="country" label="País" required error={errors.country?.message}>
            {(a11y) => (
              <Controller
                control={control}
                name="country"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id={a11y.id} aria-invalid={a11y['aria-invalid']} aria-describedby={a11y['aria-describedby']}>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </FormField>
        </div>
      </Section>

      <Section number={2} title="Carteira e rede">
        <div className="flex flex-col gap-6">
          <FormField id="network" label="Rede" required>
            {(a11y) => (
              <Controller
                control={control}
                name="network"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id={a11y.id} className="sm:max-w-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {NETWORK_IDS.map((id) => <SelectItem key={id} value={id}>{NETWORK_LABELS[id]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </FormField>

          {wallets.length === 0 ? (
            <NoWallets />
          ) : (
            <div>
              <WalletPicker wallets={wallets} selectedId={walletId} onSelect={(id) => setValue('walletId', id, { shouldValidate: true })} network={network} />
              {errors.walletId && <p role="alert" className="mt-2 text-sm font-medium text-danger">{errors.walletId.message}</p>}
            </div>
          )}
        </div>
      </Section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button asChild variant="outline" size="lg"><Link to="/cart">Voltar ao carrinho</Link></Button>
        <Button type="submit" size="lg" disabled={!canReview} data-testid="go-review">Revisar pedido</Button>
      </div>
    </form>
  )
}

function NoWallets() {
  return (
    <div className="rounded-md border border-dashed border-border p-5 text-center" data-testid="no-wallets">
      <WalletCards className="mx-auto mb-2 size-8 text-accent" aria-hidden />
      <p className="font-semibold">Você ainda não cadastrou uma carteira</p>
      <p className="mb-3 text-sm text-muted">Cadastre uma carteira para poder pagar.</p>
      <Button asChild variant="outline"><Link to="/wallets">Cadastrar carteira</Link></Button>
    </div>
  )
}
