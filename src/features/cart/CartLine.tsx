import { Link } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { CartItem, QuoteLine } from '@/api/contracts'
import { Eth } from '@/components/common/Eth'
import { QuantityStepper } from '@/components/common/QuantityStepper'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { MAX_QTY_PER_LINE } from '@/lib/catalog'
import { ethMulInt } from '@/lib/decimal'
import { useRemoveCartItem, useUpdateCartItem } from './hooks'

export function CartLineSkeleton() {
  return (
    <li className="flex gap-4 rounded-lg border border-border bg-surface p-4" aria-hidden="true">
      <Skeleton className="size-24 shrink-0 sm:size-28" />
      <div className="flex flex-1 flex-col gap-3">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="mt-auto h-11 w-32" />
      </div>
    </li>
  )
}

/** Linha do carrinho: imagem, nome, quantidade, total e remoção (com confirmação). */
export function CartLine({ item, line }: { item: CartItem; line?: QuoteLine }) {
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const [confirming, setConfirming] = useState(false)
  const max = Math.max(1, Math.min(item.available, MAX_QTY_PER_LINE))
  return (
    <li className="flex gap-4 rounded-lg border border-border bg-surface p-4" data-testid="cart-line" data-nft-id={item.nftId}>
      <Link to="/nfts/$nftId" params={{ nftId: item.nftId }} search={{ edition: item.editionId }} className="shrink-0 rounded-md" aria-label={`Ver ${item.name}`}>
        <img src={item.image.src} alt={item.image.alt} width={112} height={112} loading="lazy" decoding="async" className="size-24 rounded-md object-cover sm:size-28" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold">
              <Link to="/nfts/$nftId" params={{ nftId: item.nftId }} search={{ edition: item.editionId }}>{item.name}</Link>
            </h3>
            <p className="text-sm text-muted">Edição {item.editionName} · <Eth value={item.unitPrice} className="text-foreground" /> cada</p>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label={`Remover ${item.name} do carrinho`} onClick={() => setConfirming(true)}>
            <Trash2 aria-hidden />
          </Button>
        </div>
        {line && line.status !== 'ok' && (
          <p role="alert" className="text-sm font-semibold text-warning" data-testid="line-issue">
            {line.status === 'sold_out' ? 'Esta edição esgotou. Remova o item para continuar.' : `Apenas ${Math.min(line.available, MAX_QTY_PER_LINE)} unidade(s) disponível(is). Reduza a quantidade.`}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
          <QuantityStepper
            size="sm"
            value={item.quantity}
            max={Math.max(max, item.quantity)}
            onChange={(quantity) => update.mutate({ itemId: item.id, quantity, name: item.name })}
            label={`Quantidade de ${item.name}`}
          />
          <p className="text-lg font-bold" data-testid="line-total"><Eth value={ethMulInt(item.unitPrice, item.quantity)} /></p>
        </div>
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover item?</DialogTitle>
            <DialogDescription>“{item.name}” ({item.editionName}) será removido do seu carrinho.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button variant="destructive" onClick={() => { remove.mutate({ itemId: item.id, name: item.name }); setConfirming(false) }}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  )
}
