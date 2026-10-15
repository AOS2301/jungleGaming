import { zodResolver } from '@hookform/resolvers/zod'
import { getRouteApi, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { EmptyState, ErrorState } from '@/components/common/States'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useWallets } from '@/features/account/wallet-hooks'
import { useSession } from '@/features/auth/session'
import { useCart, useQuote } from '@/features/cart/hooks'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { announce } from '@/realtime/notices'
import { CheckoutSkeleton } from './CheckoutSkeleton'
import { CollectorForm } from './CollectorForm'
import { checkoutSchema, initialFormValues, type CheckoutForm } from './form'
import { OrderSummary } from './OrderSummary'
import { ReviewStep } from './ReviewStep'
import { Stepper } from './Stepper'
import { loadDraft } from './storage'
import { useCheckoutDraft } from './useCheckoutDraft'
import { usePendingOrderRedirect } from './usePendingOrderRedirect'
import { useReviewedQuote } from './useReviewedQuote'
import { useSubmitOrder } from './useSubmitOrder'

const route = getRouteApi('/_auth/checkout')

/**
 * Pagamento em duas etapas (a etapa fica na URL: ?step=review):
 *   1. dados do colecionador + rede + carteira conectada  →  2. revisão e confirmação.
 */
export function CheckoutPage() {
  useDocumentTitle('Pagamento')
  const step = route.useSearch().step === 'review' ? 'review' : 'details'
  const navigate = route.useNavigate()
  const { user } = useSession()

  const cart = useCart()
  const wallets = useWallets()
  const pendingOrder = usePendingOrderRedirect()

  // --- formulário (começa pelo rascunho salvo) ---
  const draft = useMemo(() => loadDraft(user!.id), [user])
  const form = useForm<CheckoutForm>({ resolver: zodResolver(checkoutSchema), defaultValues: initialFormValues(user!, draft) })
  const values = form.watch()
  useCheckoutDraft(user!.id, values)

  const quote = useQuote(values.network)
  const { reviewed, changed, accepted, setAccepted, acceptNewQuote } = useReviewedQuote(step, quote)
  const order = useSubmitOrder(values.network)

  const selectedWallet = wallets.data?.find((w) => w.id === values.walletId)
  const walletIsReady = selectedWallet?.connection?.network === values.network

  // Sem carteira escolhida, seleciona a principal (e a rede preferida dela, se não havia rascunho).
  useEffect(() => {
    if (!wallets.data?.length || wallets.data.some((w) => w.id === form.getValues('walletId'))) return
    const primary = wallets.data.find((w) => w.slot === 'primary') ?? wallets.data[0]!
    form.setValue('walletId', primary.id)
    if (!draft?.network) form.setValue('network', primary.preferredNetwork)
  }, [wallets.data, form, draft?.network])

  // Recarregou direto em ?step=review: só mantém a revisão se o formulário e a carteira estiverem OK.
  const checkedReviewStep = useRef(false)
  useEffect(() => {
    if (step !== 'review' || checkedReviewStep.current || !wallets.data) return
    checkedReviewStep.current = true
    void form.trigger().then((formIsValid) => {
      const wallet = wallets.data!.find((w) => w.id === form.getValues('walletId'))
      const connected = wallet?.connection?.network === form.getValues('network')
      if (!formIsValid || !connected) void navigate({ search: {}, replace: true })
    })
  }, [step, wallets.data, form, navigate])

  const goToReview = form.handleSubmit(() => {
    if (!walletIsReady) return void toast.error('Conecte a carteira na rede selecionada para continuar')
    if (!quote.data?.canCheckout) return void toast.error('Ajuste o carrinho antes de continuar')
    void navigate({ search: { step: 'review' } })
    announce('Revise os dados do pedido antes de confirmar.')
  })

  const confirmOrder = () => {
    if (!reviewed || changed || !accepted) return
    const v = form.getValues()
    order.submit({
      items: reviewed.lines.map((l) => ({ nftId: l.nftId, editionId: l.editionId, quantity: l.quantity })),
      couponCode: reviewed.coupon?.code ?? null,
      network: v.network,
      walletId: v.walletId,
      collector: { fullName: v.fullName.trim(), email: v.email, country: v.country, document: v.document.trim() },
      quoteFingerprint: reviewed.fingerprint,
    })
  }

  // --- estados da página ---
  if (cart.isPending || wallets.isPending || pendingOrder.isPending) return <CheckoutSkeleton />
  if (cart.isError) {
    return <PageMessage><ErrorState error={cart.error} onRetry={() => void cart.refetch()} title="Não foi possível carregar o carrinho" /></PageMessage>
  }
  const cartIsEmpty = (cart.data?.items.length ?? 0) === 0
  if (cartIsEmpty && !order.isPending && !order.isSuccess) {
    return (
      <PageMessage>
        <EmptyState title="Seu carrinho está vazio" description="Adicione NFTs ao carrinho antes de pagar.">
          <Button asChild><Link to="/">Explorar catálogo</Link></Button>
        </EmptyState>
      </PageMessage>
    )
  }

  return (
    <div className="container-page py-8 sm:py-12">
      <h1 className="mb-6 text-3xl font-bold sm:text-4xl">Pagamento</h1>
      <Stepper step={step} />

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col gap-6">
          {step === 'details' ? (
            <CollectorForm form={form} wallets={wallets.data ?? []} canReview={!!quote.data?.canCheckout} onSubmit={(e) => void goToReview(e)} />
          ) : !reviewed ? (
            <Skeleton className="h-96 w-full rounded-lg" /> // esperando a cotação para montar a revisão
          ) : (
            <ReviewStep
              values={values}
              wallet={selectedWallet}
              reviewed={reviewed}
              current={quote.data}
              changed={changed}
              accepted={accepted}
              onAcceptedChange={setAccepted}
              onAcceptNewQuote={acceptNewQuote}
              canConfirm={accepted && !changed && reviewed.canCheckout && walletIsReady}
              onConfirm={confirmOrder}
              onBack={() => void navigate({ search: {} })}
              sending={order}
            />
          )}
        </div>

        <div className="lg:sticky lg:top-24">
          <OrderSummary quote={quote} />
        </div>
      </div>
    </div>
  )
}

function PageMessage({ children }: { children: React.ReactNode }) {
  return <div className="container-page py-12">{children}</div>
}
