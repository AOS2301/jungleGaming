import { AlertTriangle, PlugZap, Unplug } from 'lucide-react'
import type { NetworkId, Wallet } from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useConnectWallet, useDisconnectWallet } from '@/features/account/wallet-hooks'
import { NETWORK_LABELS, PROVIDER_LABELS } from '@/lib/catalog'

interface Props {
  wallets: Wallet[]
  selectedId: string
  onSelect: (walletId: string) => void
  /** Rede escolhida para o pedido: a carteira precisa estar conectada nela. */
  network: NetworkId
}

/** Escolha da carteira de pagamento + botões para conectar/desconectar (conexão simulada pela API). */
export function WalletPicker({ wallets, selectedId, onSelect, network }: Props) {
  const connect = useConnectWallet()
  const disconnect = useDisconnectWallet()

  const selected = wallets.find((w) => w.id === selectedId)
  const connectedNetwork = selected?.connection?.network
  const isReady = connectedNetwork === network
  const isOnOtherNetwork = !!connectedNetwork && !isReady
  const error = connect.error ?? disconnect.error

  return (
    <div className="flex flex-col gap-5">
      <RadioGroup value={selectedId} onValueChange={onSelect} aria-label="Carteira de pagamento">
        {wallets.map((wallet) => (
          <RadioGroupItem key={wallet.id} value={wallet.id} data-testid={`wallet-${wallet.slot}`}>
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold">{wallet.label}</span>
              <span className="flex gap-2">
                <Badge variant="outline">{wallet.slot === 'primary' ? 'Principal' : 'Secundária'}</Badge>
                {wallet.connection ? (
                  <Badge variant="success">Conectada · {NETWORK_LABELS[wallet.connection.network]}</Badge>
                ) : (
                  <Badge>Desconectada</Badge>
                )}
              </span>
            </span>
            <span className="eth mt-1 block text-[13px] text-muted">
              {PROVIDER_LABELS[wallet.provider]} · {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
            </span>
          </RadioGroupItem>
        ))}
      </RadioGroup>

      {selected && (
        <div className="flex flex-col gap-3 rounded-md border border-border bg-background/40 p-4">
          <p className="text-sm" role="status" data-testid="wallet-status">
            {isReady ? (
              <>Conectada na rede <strong>{NETWORK_LABELS[network]}</strong>. Pronta para pagar.</>
            ) : isOnOtherNetwork ? (
              <>Conectada em <strong>{NETWORK_LABELS[connectedNetwork]}</strong>, mas o pedido usa <strong>{NETWORK_LABELS[network]}</strong>. Reconecte para continuar.</>
            ) : (
              <>Conecte a carteira na rede <strong>{NETWORK_LABELS[network]}</strong> para pagar.</>
            )}
          </p>

          <div className="flex flex-wrap gap-3">
            {!isReady && (
              <Button type="button" onClick={() => connect.mutate({ id: selected.id, network })} loading={connect.isPending} data-testid="connect-wallet">
                <PlugZap aria-hidden /> {connect.isPending ? 'Aguardando aprovação…' : `Conectar em ${NETWORK_LABELS[network]}`}
              </Button>
            )}
            {selected.connection && (
              <Button type="button" variant="outline" onClick={() => disconnect.mutate(selected.id)} loading={disconnect.isPending} data-testid="disconnect-wallet">
                <Unplug aria-hidden /> Desconectar
              </Button>
            )}
          </div>

          {error && (
            <p role="alert" className="flex items-start gap-2 text-sm font-medium text-danger" data-testid="wallet-error">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {toApiError(error).message}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
