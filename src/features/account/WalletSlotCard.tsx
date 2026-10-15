import { Pencil, PlugZap, Plus, Unplug, WalletCards } from 'lucide-react'
import { useState } from 'react'
import type { Wallet, WalletSlot } from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NETWORK_LABELS, PROVIDER_LABELS } from '@/lib/catalog'
import { useConnectWallet, useDisconnectWallet } from './wallet-hooks'
import { WalletDialog } from './WalletDialog'
import { SLOT_LABEL } from './walletSlots'

/** Cartão de um slot: mostra a carteira (com conectar/desconectar/editar) ou convida a cadastrar. */
export function WalletSlotCard({ slot, wallet }: { slot: WalletSlot; wallet?: Wallet }) {
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
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="col-span-2"><dt className="text-muted">Nome</dt><dd className="font-semibold" data-testid="wallet-label">{wallet.label}</dd></div>
            <div className="col-span-2"><dt className="text-muted">Endereço</dt><dd className="eth break-all">{wallet.address}</dd></div>
            <div><dt className="text-muted">Provedor</dt><dd className="font-semibold">{PROVIDER_LABELS[wallet.provider]}</dd></div>
            <div><dt className="text-muted">Rede preferida</dt><dd className="font-semibold">{NETWORK_LABELS[wallet.preferredNetwork]}</dd></div>
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
