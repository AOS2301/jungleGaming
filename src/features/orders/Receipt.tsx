import { COUNTRIES, type Order } from '@/api/contracts'
import { Eth } from '@/components/common/Eth'
import { NETWORK_LABELS, PROVIDER_LABELS } from '@/lib/catalog'
import { formatDateTime } from '@/lib/format'

/** Recibo: itens, valores, carteira e colecionador — sempre o snapshot do pedido (não muda com o catálogo). */
export function Receipt({ order }: { order: Order }) {
  return (
    <section aria-labelledby="receipt-title" className="rounded-lg border border-border bg-surface p-5 sm:p-7" data-testid="receipt">
      <h2 id="receipt-title" className="mb-5 text-xl font-bold">{order.status === 'confirmed' ? 'Recibo' : 'Resumo do pedido'}</h2>
      <ul className="divide-y divide-border" aria-label="Itens do pedido">
        {order.items.map((i) => (
          <li key={`${i.nftId}-${i.editionId}`} className="flex items-center gap-4 py-4 first:pt-0">
            <img src={i.image.src} alt={i.image.alt} width={64} height={64} className="size-16 rounded-md object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{i.name}</p>
              <p className="text-sm text-muted">Edição {i.editionName} · {i.quantity} × <Eth value={i.unitPrice} showUnit={false} /></p>
            </div>
            <Eth value={i.lineTotal} className="font-bold" />
          </li>
        ))}
      </ul>
      <dl className="mt-2 flex flex-col gap-3 border-t border-border pt-5 text-[15px]">
        <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd data-testid="receipt-subtotal"><Eth value={order.subtotal} /></dd></div>
        <div className="flex justify-between"><dt className="text-muted">Desconto{order.couponCode ? ` (${order.couponCode})` : ''}</dt><dd data-testid="receipt-discount"><Eth value={order.discount} /></dd></div>
        <div className="flex justify-between"><dt className="text-muted">Taxa de rede ({NETWORK_LABELS[order.network]})</dt><dd data-testid="receipt-fee"><Eth value={order.networkFee} /></dd></div>
        <div className="flex items-baseline justify-between border-t border-border pt-4"><dt className="text-lg font-bold">Total</dt><dd className="text-2xl font-bold" data-testid="receipt-total"><Eth value={order.total} /></dd></div>
      </dl>
      <dl className="mt-6 grid gap-4 border-t border-border pt-5 text-sm sm:grid-cols-2">
        <div><dt className="text-muted">Carteira</dt><dd className="font-semibold">{order.wallet.label} · {PROVIDER_LABELS[order.wallet.provider]}</dd><dd className="eth text-muted">{order.wallet.addressMasked}</dd></div>
        <div><dt className="text-muted">Colecionador</dt><dd className="font-semibold">{order.collector.fullName}</dd><dd className="text-muted">{order.collector.email} · {COUNTRIES.find((c) => c.code === order.collector.country)?.name}</dd></div>
        <div><dt className="text-muted">Pedido</dt><dd className="eth font-semibold">{order.id}</dd></div>
        <div><dt className="text-muted">Criado em</dt><dd className="font-semibold">{formatDateTime(order.createdAt)}</dd></div>
      </dl>
    </section>
  )
}
