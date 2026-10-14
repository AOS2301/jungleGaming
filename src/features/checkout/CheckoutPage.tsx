import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi, Link, useRouter } from '@tanstack/react-router'
import { AlertTriangle, Check, Loader2, PlugZap, ShieldCheck, Unplug, WalletCards } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  collectorSchema, COUNTRIES, NETWORK_IDS, networkSchema, quoteSchema,
  type CreateOrderRequest, type NetworkId, type Quote, type Wallet,
} from '@/api/contracts'
import { api } from '@/api/endpoints'
import { isOutcomeUnknown, toApiError } from '@/api/errors'
import { pendingOrdersOptions, qk } from '@/api/queries'
import { Eth } from '@/components/common/Eth'
import { EmptyState, ErrorState } from '@/components/common/States'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useConnectWallet, useDisconnectWallet, useWallets } from '@/features/account/wallet-hooks'
import { useSession } from '@/features/auth/session'
import { useCart, useQuote } from '@/features/cart/hooks'
import { QuoteIssues, QuoteRows, QuoteSkeleton, SummaryCard } from '@/features/cart/QuoteSummary'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { NETWORK_LABELS, PROVIDER_LABELS } from '@/lib/catalog'
import { formatEthWithUnit } from '@/lib/decimal'
import { cn } from '@/lib/utils'
import { announce } from '@/realtime/notices'
import { clearDraft, clearIdempotencyKey, getIdempotencyKey, loadDraft, saveDraft } from './storage'

const route = getRouteApi('/_auth/checkout')

const checkoutSchema = collectorSchema.extend({
  walletId: z.string().min(1, 'Selecione uma carteira'),
  network: networkSchema,
})
type CheckoutForm = z.infer<typeof checkoutSchema>

function Section({ title, step, children, action }: { title: string; step: number; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section aria-labelledby={`sec-${step}`} className="rounded-lg border border-border bg-surface p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 id={`sec-${step}`} className="flex items-center gap-3 text-xl font-bold">
          <span className="eth flex size-8 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground" aria-hidden>{step}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Stepper({ step }: { step: 'details' | 'review' }) {
  const items = [
    ['details', 'Dados e carteira'],
    ['review', 'Revisão'],
    ['done', 'Confirmação'],
  ] as const
  const currentIndex = step === 'details' ? 0 : 1
  return (
    <ol aria-label="Etapas do pagamento" className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      {items.map(([id, label], i) => (
        <li key={id} aria-current={i === currentIndex ? 'step' : undefined} className={cn('flex items-center gap-2', i === currentIndex ? 'font-bold text-foreground' : 'text-muted')}>
          <span className={cn('eth flex size-6 items-center justify-center rounded-full border text-xs', i < currentIndex ? 'border-success bg-success text-[#052e16]' : i === currentIndex ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
            {i < currentIndex ? <Check className="size-3.5" aria-label="concluída" /> : i + 1}
          </span>
          {label}
          {i < items.length - 1 && <span className="mx-1 hidden h-px w-6 bg-border sm:block" aria-hidden />}
        </li>
      ))}
    </ol>
  )
}

function WalletPicker({
  wallets, value, onChange, network,
}: {
  wallets: Wallet[]
  value: string
  onChange: (id: string) => void
  network: NetworkId
}) {
  const connect = useConnectWallet()
  const disconnect = useDisconnectWallet()
  const selected = wallets.find((w) => w.id === value)
  const connected = selected?.connection?.network === network
  const wrongNetwork = !!selected?.connection && !connected
  const error = connect.error ? toApiError(connect.error) : disconnect.error ? toApiError(disconnect.error) : null

  return (
    <div className="flex flex-col gap-5">
      <RadioGroup value={value} onValueChange={onChange} aria-label="Carteira de pagamento">
        {wallets.map((w) => (
          <RadioGroupItem key={w.id} value={w.id} data-testid={`wallet-${w.slot}`}>
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold">{w.label}</span>
              <span className="flex gap-2">
                <Badge variant="outline">{w.slot === 'primary' ? 'Principal' : 'Secundária'}</Badge>
                {w.connection ? <Badge variant="success">Conectada · {NETWORK_LABELS[w.connection.network]}</Badge> : <Badge variant="default">Desconectada</Badge>}
              </span>
            </span>
            <span className="eth mt-1 block text-[13px] text-muted">{PROVIDER_LABELS[w.provider]} · {w.address.slice(0, 6)}…{w.address.slice(-4)}</span>
          </RadioGroupItem>
        ))}
      </RadioGroup>

      {selected && (
        <div className="flex flex-col gap-3 rounded-md border border-border bg-background/40 p-4">
          <p className="text-sm" role="status" data-testid="wallet-status">
            {connected
              ? <>Conectada na rede <strong>{NETWORK_LABELS[network]}</strong>. Pronta para pagar.</>
              : wrongNetwork
                ? <>Conectada em <strong>{NETWORK_LABELS[selected.connection!.network]}</strong>, mas o pedido usa <strong>{NETWORK_LABELS[network]}</strong>. Reconecte para continuar.</>
                : <>Conecte a carteira na rede <strong>{NETWORK_LABELS[network]}</strong> para pagar.</>}
          </p>
          <div className="flex flex-wrap gap-3">
            {!connected && (
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
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error.message}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function CheckoutSkeleton() {
  return (
    <div className="container-page py-8 sm:py-12" data-testid="checkout-skeleton" aria-busy="true" aria-label="Carregando pagamento">
      <Skeleton className="mb-8 h-10 w-56" />
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_400px]">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-80 w-full rounded-lg" />
          <Skeleton className="h-72 w-full rounded-lg" />
        </div>
        <div className="rounded-lg border border-border bg-surface p-6"><Skeleton className="mb-5 h-7 w-40" /><QuoteSkeleton /></div>
      </div>
    </div>
  )
}

export function CheckoutPage() {
  useDocumentTitle('Pagamento')
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, scope } = useSession()
  const userId = user!.id

  const step: 'details' | 'review' = search.step === 'review' ? 'review' : 'details'
  const cart = useCart()
  const wallets = useWallets()
  const pending = useQuery(pendingOrdersOptions(scope))

  const draft = useMemo(() => loadDraft(userId), [userId])
  const form = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: draft?.fullName ?? user?.displayName ?? '',
      email: draft?.email ?? user?.email ?? '',
      country: draft?.country ?? 'BR',
      document: draft?.document ?? '',
      walletId: draft?.walletId ?? '',
      network: draft?.network ?? 'ethereum',
    },
  })
  const { register, control, handleSubmit, watch, setValue, trigger, getValues, formState: { errors } } = form
  const values = watch()
  const network = values.network
  const quote = useQuote(network)

  // rascunho persistido por usuário (retomada após refresh ou expiração de sessão)
  useEffect(() => {
    const t = setTimeout(() => saveDraft(userId, { fullName: values.fullName, email: values.email, country: values.country, document: values.document, walletId: values.walletId, network: values.network }), 300)
    return () => clearTimeout(t)
  }, [userId, values.fullName, values.email, values.country, values.document, values.walletId, values.network])

  // pré-seleciona a carteira principal quando as carteiras carregam
  useEffect(() => {
    if (!wallets.data?.length) return
    if (!wallets.data.some((w) => w.id === getValues('walletId'))) {
      const primary = wallets.data.find((w) => w.slot === 'primary') ?? wallets.data[0]!
      setValue('walletId', primary.id)
      if (!draft?.network) setValue('network', primary.preferredNetwork)
    }
  }, [wallets.data, getValues, setValue, draft?.network])

  // pedido pendente existente: recupera o estado em vez de permitir nova compra
  useEffect(() => {
    const existing = pending.data?.[0]
    if (existing) {
      toast.info('Você já tem um pedido em andamento', { description: 'Mostramos o status dele em vez de criar outra compra.' })
      void router.navigate({ to: '/orders/$orderId', params: { orderId: existing.id }, replace: true })
    }
  }, [pending.data, router])

  const selectedWallet = wallets.data?.find((w) => w.id === values.walletId)
  const walletReady = selectedWallet?.connection?.network === network

  // --- revisão: a cotação confirmada pelo usuário ---
  const [reviewedQuote, setReviewedQuote] = useState<Quote | null>(null)
  useEffect(() => {
    if (step === 'review' && !reviewedQuote && quote.data && !quote.isPlaceholderData) setReviewedQuote(quote.data)
    if (step === 'details' && reviewedQuote) setReviewedQuote(null)
  }, [step, quote.data, quote.isPlaceholderData, reviewedQuote])
  const changed = !!(reviewedQuote && quote.data && !quote.isPlaceholderData && quote.data.fingerprint !== reviewedQuote.fingerprint)
  const [accepted, setAccepted] = useState(false)
  useEffect(() => setAccepted(false), [reviewedQuote?.fingerprint])

  // refresh direto em ?step=review: só mantém se o formulário e a carteira estiverem válidos
  const stepGuarded = useRef(false)
  useEffect(() => {
    if (step !== 'review' || stepGuarded.current || !wallets.data) return
    stepGuarded.current = true
    void trigger().then((valid) => {
      const w = wallets.data!.find((x) => x.id === getValues('walletId'))
      if (!valid || w?.connection?.network !== getValues('network')) void navigate({ search: {}, replace: true })
    })
  }, [step, wallets.data, trigger, getValues, navigate])

  const goReview = handleSubmit(() => {
    if (!walletReady) return void toast.error('Conecte a carteira na rede selecionada para continuar')
    if (!quote.data?.canCheckout) return void toast.error('Ajuste o carrinho antes de continuar')
    void navigate({ search: { step: 'review' } })
    announce('Revise os dados do pedido antes de confirmar.')
  })

  // --- envio idempotente ---
  const submittingRef = useRef(false)
  const submit = useMutation({
    mutationFn: (payload: CreateOrderRequest) => api.orders.create(payload, getIdempotencyKey(userId, payload)),
    // sem resposta (timeout/rede): repete com a MESMA chave — o servidor devolve o mesmo pedido
    retry: (failureCount, error) => isOutcomeUnknown(error) && failureCount < 2,
    retryDelay: 800,
    onSuccess: (order) => {
      clearIdempotencyKey(userId)
      clearDraft(userId)
      queryClient.setQueryData(qk.order(scope, order.id), order)
      void queryClient.invalidateQueries({ queryKey: qk.pendingOrders(scope) })
      void router.navigate({ to: '/orders/$orderId', params: { orderId: order.id }, replace: true })
    },
    onError: (error) => {
      const err = toApiError(error)
      if (!isOutcomeUnknown(err) && err.status !== 503) clearIdempotencyKey(userId)
      const nextQuote = quoteSchema.safeParse((err.details as { quote?: unknown } | undefined)?.quote)
      if (nextQuote.success) queryClient.setQueryData(qk.quote(scope, network), nextQuote.data)
      if (err.code === 'QUOTE_CHANGED') announce('Os valores do pedido mudaram. Revise e confirme novamente.')
      if (err.code === 'WALLET_NOT_CONNECTED') void queryClient.invalidateQueries({ queryKey: qk.wallets(scope) })
      void queryClient.invalidateQueries({ queryKey: qk.cart(scope) })
    },
    onSettled: () => {
      submittingRef.current = false
    },
  })

  const confirm = () => {
    if (submittingRef.current || submit.isPending || !reviewedQuote || changed || !accepted) return
    submittingRef.current = true // trava cliques repetidos antes mesmo do re-render
    const v = getValues()
    submit.mutate({
      items: reviewedQuote.lines.map((l) => ({ nftId: l.nftId, editionId: l.editionId, quantity: l.quantity })),
      couponCode: reviewedQuote.coupon?.code ?? null,
      network: v.network,
      walletId: v.walletId,
      collector: { fullName: v.fullName.trim(), email: v.email, country: v.country, document: v.document.trim() },
      quoteFingerprint: reviewedQuote.fingerprint,
    })
  }

  // ---- renderização ----
  if (cart.isPending || wallets.isPending || pending.isPending) return <CheckoutSkeleton />
  if (cart.isError) return <div className="container-page py-12"><ErrorState error={cart.error} onRetry={() => void cart.refetch()} title="Não foi possível carregar o carrinho" /></div>
  if ((cart.data?.items.length ?? 0) === 0 && !submit.isPending && !submit.isSuccess) {
    return (
      <div className="container-page py-12">
        <EmptyState title="Seu carrinho está vazio" description="Adicione NFTs ao carrinho antes de pagar.">
          <Button asChild><Link to="/">Explorar catálogo</Link></Button>
        </EmptyState>
      </div>
    )
  }

  const submitError = submit.error ? toApiError(submit.error) : null
  const walletList = wallets.data ?? []

  return (
    <div className="container-page py-8 sm:py-12">
      <h1 className="mb-6 text-3xl font-bold sm:text-4xl">Pagamento</h1>
      <Stepper step={step} />

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_400px]">
        <div className="flex flex-col gap-6">
          {step === 'details' ? (
            <form onSubmit={(e) => void goReview(e)} noValidate className="flex flex-col gap-6" aria-label="Dados do pedido">
              <Section step={1} title="Dados do colecionador">
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField id="fullName" label="Nome completo" required error={errors.fullName?.message} className="sm:col-span-2">
                    {(a) => <Input {...a} autoComplete="name" {...register('fullName')} />}
                  </FormField>
                  <FormField id="email" label="E-mail" required error={errors.email?.message}>
                    {(a) => <Input {...a} type="email" autoComplete="email" {...register('email')} />}
                  </FormField>
                  <FormField id="document" label="Documento (CPF ou passaporte)" required error={errors.document?.message}>
                    {(a) => <Input {...a} autoComplete="off" {...register('document')} />}
                  </FormField>
                  <FormField id="country" label="País" required error={errors.country?.message}>
                    {(a) => (
                      <Controller
                        control={control}
                        name="country"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id={a.id} aria-invalid={a['aria-invalid']} aria-describedby={a['aria-describedby']}><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}</SelectContent>
                          </Select>
                        )}
                      />
                    )}
                  </FormField>
                </div>
              </Section>

              <Section step={2} title="Carteira e rede">
                <div className="flex flex-col gap-6">
                  <FormField id="network" label="Rede" required>
                    {(a) => (
                      <Controller
                        control={control}
                        name="network"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id={a.id} className="sm:max-w-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{NETWORK_IDS.map((n) => <SelectItem key={n} value={n}>{NETWORK_LABELS[n]}</SelectItem>)}</SelectContent>
                          </Select>
                        )}
                      />
                    )}
                  </FormField>
                  {walletList.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border p-5 text-center" data-testid="no-wallets">
                      <WalletCards className="mx-auto mb-2 size-8 text-accent" aria-hidden />
                      <p className="font-semibold">Você ainda não cadastrou uma carteira</p>
                      <p className="mb-3 text-sm text-muted">Cadastre uma carteira para poder pagar.</p>
                      <Button asChild variant="outline"><Link to="/wallets">Cadastrar carteira</Link></Button>
                    </div>
                  ) : (
                    <div>
                      <WalletPicker wallets={walletList} value={values.walletId} onChange={(id) => setValue('walletId', id, { shouldValidate: true })} network={network} />
                      {errors.walletId && <p role="alert" className="mt-2 text-sm font-medium text-danger">{errors.walletId.message}</p>}
                    </div>
                  )}
                </div>
              </Section>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <Button asChild variant="outline" size="lg"><Link to="/cart">Voltar ao carrinho</Link></Button>
                <Button type="submit" size="lg" disabled={!quote.data?.canCheckout} data-testid="go-review">Revisar pedido</Button>
              </div>
            </form>
          ) : (
            <>
              <Section step={3} title="Revisão do pedido" action={<Button variant="ghost" size="sm" onClick={() => void navigate({ search: {} })}>Editar dados</Button>}>
                <dl className="grid gap-4 text-[15px] sm:grid-cols-2" data-testid="review">
                  <div><dt className="text-sm text-muted">Colecionador</dt><dd className="font-semibold">{values.fullName}</dd><dd className="text-muted">{values.email}</dd></div>
                  <div><dt className="text-sm text-muted">Documento · País</dt><dd className="font-semibold">{values.document} · {COUNTRIES.find((c) => c.code === values.country)?.name}</dd></div>
                  <div><dt className="text-sm text-muted">Carteira</dt><dd className="font-semibold">{selectedWallet?.label}</dd><dd className="eth text-[13px] text-muted">{selectedWallet?.address.slice(0, 6)}…{selectedWallet?.address.slice(-4)}</dd></div>
                  <div><dt className="text-sm text-muted">Rede</dt><dd className="font-semibold">{NETWORK_LABELS[network]}</dd></div>
                </dl>
                <ul className="mt-6 divide-y divide-border border-t border-border" aria-label="Itens do pedido">
                  {(reviewedQuote ?? quote.data)?.lines.map((l) => (
                    <li key={`${l.nftId}-${l.editionId}`} className="flex items-center gap-4 py-4">
                      <img src={l.image.src} alt={l.image.alt} width={64} height={64} className="size-16 rounded-md object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{l.name}</p>
                        <p className="text-sm text-muted">Edição {l.editionName} · {l.quantity} × <Eth value={l.unitPrice} showUnit={false} /></p>
                      </div>
                      <Eth value={l.lineTotal} className="font-bold" />
                    </li>
                  ))}
                </ul>
              </Section>

              {changed && reviewedQuote && quote.data && (
                <div role="alert" className="rounded-lg border border-warning/50 bg-warning/10 p-5" data-testid="quote-changed">
                  <p className="flex items-center gap-2 text-lg font-bold"><AlertTriangle className="size-5 text-warning" aria-hidden /> Os valores do pedido mudaram</p>
                  <p className="mt-1 text-muted">Preço, disponibilidade, cupom ou taxas foram atualizados desde a sua revisão. Por segurança, é preciso confirmar a nova cotação.</p>
                  <p className="mt-3 text-sm">Total anterior: <strong className="eth">{formatEthWithUnit(reviewedQuote.total)}</strong> → novo total: <strong className="eth">{formatEthWithUnit(quote.data.total)}</strong></p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button onClick={() => { setReviewedQuote(quote.data!); announce('Nova cotação aceita. Confirme a compra para finalizar.') }} disabled={!quote.data.canCheckout} data-testid="accept-quote">Revisar e aceitar novos valores</Button>
                    {!quote.data.canCheckout && <Button asChild variant="outline"><Link to="/cart">Ajustar carrinho</Link></Button>}
                  </div>
                </div>
              )}

              {submitError && (
                <div role="alert" className="rounded-lg border border-danger/50 bg-danger/10 p-5" data-testid="submit-error">
                  <p className="flex items-center gap-2 font-bold text-danger"><AlertTriangle className="size-5" aria-hidden />
                    {isOutcomeUnknown(submitError) ? 'Não recebemos a confirmação do pedido' : submitError.code === 'QUOTE_CHANGED' ? 'Os valores mudaram' : 'Não foi possível enviar o pedido'}
                  </p>
                  <p className="mt-1 text-sm">{submitError.message}</p>
                  {isOutcomeUnknown(submitError) && <p className="mt-1 text-sm text-muted">Ao tentar de novo, usamos a mesma chave de idempotência: se o pedido já foi criado, você o recupera — sem comprar duas vezes.</p>}
                  {submitError.code === 'AVAILABILITY_CONFLICT' && <Button asChild variant="outline" size="sm" className="mt-3"><Link to="/cart">Ajustar carrinho</Link></Button>}
                </div>
              )}

              <div className="flex items-start gap-3 rounded-lg border border-border bg-surface p-5">
                <Checkbox id="accept" checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} disabled={changed} />
                <Label htmlFor="accept" className="cursor-pointer text-[15px] font-medium leading-snug">
                  Revisei os itens, a rede e os valores e confirmo esta compra de <span className="eth">{formatEthWithUnit((reviewedQuote ?? quote.data)?.total ?? '0')}</span> (transação simulada).
                </Label>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <Button variant="outline" size="lg" onClick={() => void navigate({ search: {} })}>Voltar</Button>
                <Button size="lg" onClick={confirm} loading={submit.isPending} disabled={!accepted || changed || !reviewedQuote?.canCheckout || !walletReady} data-testid="confirm-order">
                  <ShieldCheck aria-hidden />
                  {submit.isPending ? (submit.failureCount > 0 ? `Reenviando (tentativa ${submit.failureCount + 1})…` : 'Enviando pedido…') : 'Confirmar compra'}
                </Button>
              </div>
              <p role="status" className="sr-only">{submit.isPending ? 'Enviando pedido' : ''}</p>
            </>
          )}
        </div>

        <div className="lg:sticky lg:top-24">
          <SummaryCard>
            {quote.isPending ? <QuoteSkeleton /> : quote.isError && !quote.data ? (
              <ErrorState error={quote.error} onRetry={() => void quote.refetch()} className="px-2 py-6" title="Falha ao calcular" />
            ) : (
              <>
                <ul className="mb-5 flex flex-col gap-3" aria-label="Itens">
                  {quote.data!.lines.map((l) => (
                    <li key={`${l.nftId}-${l.editionId}`} className="flex items-center gap-3 text-sm">
                      <img src={l.image.src} alt="" width={44} height={44} className="size-11 rounded object-cover" />
                      <span className="min-w-0 flex-1 truncate">{l.name} <span className="text-muted">({l.editionName}) × {l.quantity}</span></span>
                    </li>
                  ))}
                </ul>
                <QuoteRows quote={quote.data!} dim={quote.isFetching} />
                <QuoteIssues quote={quote.data!} />
              </>
            )}
            {quote.isFetching && !quote.isPending && <p className="mt-3 flex items-center gap-1.5 text-xs text-muted"><Loader2 className="size-3 animate-spin" aria-hidden /> Atualizando cotação…</p>}
          </SummaryCard>
        </div>
      </div>
    </div>
  )
}
