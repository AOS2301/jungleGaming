import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { NETWORK_IDS, walletFormSchema, WALLET_PROVIDERS, type Wallet, type WalletForm, type WalletSlot } from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NETWORK_LABELS, PROVIDER_LABELS } from '@/lib/catalog'
import { announce } from '@/realtime/notices'
import { useSaveWallet } from './wallet-hooks'
import { SLOT_LABEL } from './walletSlots'

/** Janela para cadastrar ou editar a carteira de um slot (principal ou secundária). */
export function WalletDialog({ slot, wallet, open, onOpenChange }: { slot: WalletSlot; wallet?: Wallet; open: boolean; onOpenChange: (o: boolean) => void }) {
  const save = useSaveWallet()
  const { register, control, handleSubmit, setError, reset, formState: { errors } } = useForm<WalletForm>({
    resolver: zodResolver(walletFormSchema),
    defaultValues: {
      slot,
      label: wallet?.label ?? (slot === 'primary' ? 'Carteira principal' : 'Carteira secundária'),
      address: wallet?.address ?? '',
      provider: wallet?.provider ?? 'metamask',
      preferredNetwork: wallet?.preferredNetwork ?? 'ethereum',
    },
  })
  const onSubmit = handleSubmit((form) =>
    save.mutate(
      { id: wallet?.id, form },
      {
        onSuccess: (w) => {
          toast.success(wallet ? 'Carteira atualizada' : 'Carteira cadastrada')
          announce(`${w.label} ${wallet ? 'atualizada' : 'cadastrada'}.`)
          onOpenChange(false)
          reset(form)
        },
        onError: (error) => {
          const err = toApiError(error)
          for (const [field, message] of Object.entries(err.fields)) setError(field as keyof WalletForm, { message })
          if (Object.keys(err.fields).length === 0) toast.error('Não foi possível salvar a carteira', { description: err.message })
        },
      },
    ),
  )
  const idp = `w-${slot}`
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{wallet ? `Editar ${SLOT_LABEL[slot].toLowerCase()}` : `Adicionar ${SLOT_LABEL[slot].toLowerCase()}`}</DialogTitle>
          <DialogDescription>Os dados são simulados: nenhuma extensão de carteira é acessada.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void onSubmit(e)} noValidate className="flex flex-col gap-5" aria-label="Formulário de carteira">
          <FormField id={`${idp}-label`} label="Nome da carteira" required error={errors.label?.message}>
            {(a) => <Input {...a} {...register('label')} />}
          </FormField>
          <FormField id={`${idp}-address`} label="Endereço" required error={errors.address?.message} hint="0x seguido de 40 caracteres hexadecimais">
            {(a) => <Input {...a} className="eth" spellCheck={false} autoComplete="off" {...register('address')} />}
          </FormField>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id={`${idp}-provider`} label="Provedor" required error={errors.provider?.message}>
              {(a) => (
                <Controller control={control} name="provider" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id={a.id}><SelectValue /></SelectTrigger>
                    <SelectContent>{WALLET_PROVIDERS.map((p) => <SelectItem key={p} value={p}>{PROVIDER_LABELS[p]}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              )}
            </FormField>
            <FormField id={`${idp}-network`} label="Rede preferida" required error={errors.preferredNetwork?.message}>
              {(a) => (
                <Controller control={control} name="preferredNetwork" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id={a.id}><SelectValue /></SelectTrigger>
                    <SelectContent>{NETWORK_IDS.map((n) => <SelectItem key={n} value={n}>{NETWORK_LABELS[n]}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              )}
            </FormField>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" loading={save.isPending}>Salvar carteira</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
