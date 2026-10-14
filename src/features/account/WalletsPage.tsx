import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, PlugZap, Plus, Unplug, WalletCards } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { NETWORK_IDS, walletFormSchema, WALLET_PROVIDERS, type Wallet, type WalletForm, type WalletSlot } from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { ErrorState } from '@/components/common/States'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { NETWORK_LABELS, PROVIDER_LABELS } from '@/lib/catalog'
import { announce } from '@/realtime/notices'
import { useConnectWallet, useDisconnectWallet, useSaveWallet, useWallets } from './wallet-hooks'

const SLOT_LABEL: Record<WalletSlot, string> = { primary: 'Carteira principal', secondary: 'Carteira secundária' }

function WalletDialog({ slot, wallet, open, onOpenChange }: { slot: WalletSlot; wallet?: Wallet; open: boolean; onOpenChange: (o: boolean) => void }) {
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

function SlotCard({ slot, wallet }: { slot: WalletSlot; wallet?: Wallet }) {
  const [open, setOpen] = useState(false)
  const connect = useConnectWallet()
  const disconnect = useDisconnectWallet()
  const error = connect.error ? toApiError(connect.error) : disconnect.error ? toApiError(disconnect.error) : null
  return (
    <section aria-labelledby={`slot-${slot}`} className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 sm:p-6" data-testid={`slot-${slot}`}>
      <div className="flex items-start justify-between gap-3">
        <h2 id={`slot-${slot}`} className="text-xl font-bold">{SLOT_LABEL[slot]}</h2>
        {wallet && (wallet.connection ? <Badge variant="success">Conectada · {NETWORK_LABELS[wallet.connection.network]}</Badge> : <Badge variant="default">Desconectada</Badge>)}
      </div>
      {wallet ? (
        <>
          <dl className="grid gap-3 text-sm">
            <div><dt className="text-muted">Nome</dt><dd className="font-semibold" data-testid="wallet-label">{wallet.label}</dd></div>
            <div><dt className="text-muted">Endereço</dt><dd className="eth break-all">{wallet.address}</dd></div>
            <div className="grid grid-cols-2 gap-3">
              <div><dt className="text-muted">Provedor</dt><dd className="font-semibold">{PROVIDER_LABELS[wallet.provider]}</dd></div>
              <div><dt className="text-muted">Rede preferida</dt><dd className="font-semibold">{NETWORK_LABELS[wallet.preferredNetwork]}</dd></div>
            </div>
          </dl>
          {error && <p role="alert" className="text-sm font-medium text-danger" data-testid="wallet-error">{error.message}</p>}
          <div className="mt-auto flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setOpen(true)} aria-label={`Editar ${SLOT_LABEL[slot].toLowerCase()}`}><Pencil aria-hidden /> Editar</Button>
            {wallet.connection ? (
              <Button variant="ghost" onClick={() => disconnect.mutate(wallet.id)} loading={disconnect.isPending}><Unplug aria-hidden /> Desconectar</Button>
            ) : (
              <Button variant="secondary" onClick={() => connect.mutate({ id: wallet.id, network: wallet.preferredNetwork })} loading={connect.isPending}><PlugZap aria-hidden /> Conectar</Button>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border px-4 py-8 text-center">
          <WalletCards className="size-8 text-accent" aria-hidden />
          <p className="text-muted">Nenhuma carteira cadastrada neste slot.</p>
          <Button onClick={() => setOpen(true)}><Plus aria-hidden /> Adicionar carteira</Button>
        </div>
      )}
      {open && <WalletDialog slot={slot} wallet={wallet} open={open} onOpenChange={setOpen} />}
    </section>
  )
}

export function WalletsPage() {
  useDocumentTitle('Carteiras')
  const wallets = useWallets()
  if (wallets.isPending) {
    return (
      <div className="grid gap-6 md:grid-cols-2" aria-busy="true" aria-label="Carregando carteiras" data-testid="wallets-skeleton">
        <Skeleton className="h-72 w-full rounded-lg" />
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    )
  }
  if (wallets.isError) return <ErrorState error={wallets.error} onRetry={() => void wallets.refetch()} retrying={wallets.isFetching} title="Não foi possível carregar suas carteiras" />
  const bySlot = (slot: WalletSlot) => wallets.data.find((w) => w.slot === slot)
  return (
    <div>
      <p className="mb-6 max-w-2xl text-muted">Cadastre até duas carteiras. A principal é pré-selecionada no pagamento; a secundária serve como reserva. A conexão é simulada.</p>
      <div className="grid gap-6 md:grid-cols-2">
        <SlotCard slot="primary" wallet={bySlot('primary')} />
        <SlotCard slot="secondary" wallet={bySlot('secondary')} />
      </div>
    </div>
  )
}
