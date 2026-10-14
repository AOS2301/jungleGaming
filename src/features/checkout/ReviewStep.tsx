import { Link } from '@tanstack/react-router'
import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { COUNTRIES, type Quote, type Wallet } from '@/api/contracts'
import type { ApiError } from '@/api/errors'
import { isOutcomeUnknown } from '@/api/errors'
import { Eth } from '@/components/common/Eth'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { NETWORK_LABELS } from '@/lib/catalog'
import { formatEthWithUnit } from '@/lib/decimal'
import { announce } from '@/realtime/notices'
import type { CheckoutForm } from './form'
import { Section } from './Section'

interface Props {
  values: CheckoutForm
  wallet: Wallet | undefined
  /** Cotação que o usuário revisou (a que será enviada). */
  reviewed: Quote
  /** Cotação atual da API: se for diferente da revisada, é preciso aceitar de novo. */
  current: Quote | undefined
  changed: boolean
  accepted: boolean
  onAcceptedChange: (accepted: boolean) => void
  onAcceptNewQuote: () => void
  canConfirm: boolean
  onConfirm: () => void
  onBack: () => void
  sending: { isPending: boolean; failureCount: number; error: ApiError | null }
}

/** Etapa 2 do checkout: revisão dos dados e confirmação da compra. */
export function ReviewStep(props: Props) {
  const { values, wallet, reviewed, current, changed, accepted, sending } = props
  const country = COUNTRIES.find((c) => c.code === values.country)?.name

  return (
    <>
      <Section number={3} title="Revisão do pedido" action={<Button variant="ghost" size="sm" onClick={props.onBack}>Editar dados</Button>}>
        <dl className="grid gap-4 text-[15px] sm:grid-cols-2" data-testid="review">
          <Field label="Colecionador" value={values.fullName} extra={values.email} />
          <Field label="Documento · País" value={`${values.document} · ${country}`} />
          <Field label="Carteira" value={wallet?.label} extra={wallet && `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`} mono />
          <Field label="Rede" value={NETWORK_LABELS[values.network]} />
        </dl>
        <ul className="mt-6 divide-y divide-border border-t border-border" aria-label="Itens do pedido">
          {reviewed.lines.map((line) => (
            <li key={`${line.nftId}-${line.editionId}`} className="flex items-center gap-4 py-4">
              <img src={line.image.src} alt={line.image.alt} width={64} height={64} className="size-16 rounded-md object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{line.name}</p>
                <p className="text-sm text-muted">Edição {line.editionName} · {line.quantity} × <Eth value={line.unitPrice} showUnit={false} /></p>
              </div>
              <Eth value={line.lineTotal} className="font-bold" />
            </li>
          ))}
        </ul>
      </Section>

      {changed && current && <QuoteChangedNotice reviewed={reviewed} current={current} onAccept={props.onAcceptNewQuote} />}
      {sending.error && <SubmitError error={sending.error} />}

      <div className="flex items-start gap-3 rounded-lg border border-border bg-surface p-5">
        <Checkbox id="accept" checked={accepted} onCheckedChange={(v) => props.onAcceptedChange(v === true)} disabled={changed} />
        <Label htmlFor="accept" className="cursor-pointer text-[15px] font-medium leading-snug">
          Revisei os itens, a rede e os valores e confirmo esta compra de <span className="eth">{formatEthWithUnit(reviewed.total)}</span> (transação simulada).
        </Label>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button variant="outline" size="lg" onClick={props.onBack}>Voltar</Button>
        <Button size="lg" onClick={props.onConfirm} loading={sending.isPending} disabled={!props.canConfirm} data-testid="confirm-order">
          <ShieldCheck aria-hidden />
          {sending.isPending ? (sending.failureCount > 0 ? `Reenviando (tentativa ${sending.failureCount + 1})…` : 'Enviando pedido…') : 'Confirmar compra'}
        </Button>
      </div>
    </>
  )
}

function Field({ label, value, extra, mono }: { label: string; value?: string; extra?: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-semibold">{value}</dd>
      {extra && <dd className={mono ? 'eth text-[13px] text-muted' : 'text-muted'}>{extra}</dd>}
    </div>
  )
}

/** Aviso: preço, estoque, cupom ou taxa mudaram depois da revisão. */
function QuoteChangedNotice({ reviewed, current, onAccept }: { reviewed: Quote; current: Quote; onAccept: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-warning/50 bg-warning/10 p-5" data-testid="quote-changed">
      <p className="flex items-center gap-2 text-lg font-bold"><AlertTriangle className="size-5 text-warning" aria-hidden /> Os valores do pedido mudaram</p>
      <p className="mt-1 text-muted">
        Preço, disponibilidade, cupom ou taxas foram atualizados desde a sua revisão. Por segurança, é preciso confirmar a nova cotação.
      </p>
      <p className="mt-3 text-sm">
        Total anterior: <strong className="eth">{formatEthWithUnit(reviewed.total)}</strong> → novo total: <strong className="eth">{formatEthWithUnit(current.total)}</strong>
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          onClick={() => {
            onAccept()
            announce('Nova cotação aceita. Confirme a compra para finalizar.')
          }}
          disabled={!current.canCheckout}
          data-testid="accept-quote"
        >
          Revisar e aceitar novos valores
        </Button>
        {!current.canCheckout && <Button asChild variant="outline"><Link to="/cart">Ajustar carrinho</Link></Button>}
      </div>
    </div>
  )
}

function SubmitError({ error }: { error: ApiError }) {
  const noAnswer = isOutcomeUnknown(error)
  const title = noAnswer ? 'Não recebemos a confirmação do pedido' : error.code === 'QUOTE_CHANGED' ? 'Os valores mudaram' : 'Não foi possível enviar o pedido'
  return (
    <div role="alert" className="rounded-lg border border-danger/50 bg-danger/10 p-5" data-testid="submit-error">
      <p className="flex items-center gap-2 font-bold text-danger"><AlertTriangle className="size-5" aria-hidden /> {title}</p>
      <p className="mt-1 text-sm">{error.message}</p>
      {noAnswer && (
        <p className="mt-1 text-sm text-muted">
          Ao tentar de novo usamos a mesma chave de idempotência: se o pedido já foi criado, você o recupera — sem comprar duas vezes.
        </p>
      )}
      {error.code === 'AVAILABILITY_CONFLICT' && <Button asChild variant="outline" size="sm" className="mt-3"><Link to="/cart">Ajustar carrinho</Link></Button>}
    </div>
  )
}
