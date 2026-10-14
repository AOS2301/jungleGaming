import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, createRoute, createRouter, Outlet, redirect } from '@tanstack/react-router'
import { AppLoading, NotFoundPage, RouteError } from '@/app/NotFoundPage'
import { nftDetailOptions, nftListOptions, featuredOptions } from '@/api/queries'
import { AppShell } from '@/components/layout/AppShell'
import { AccountLayout } from '@/features/account/AccountLayout'
import { ProfilePage } from '@/features/account/ProfilePage'
import { WalletsPage } from '@/features/account/WalletsPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { SignupPage } from '@/features/auth/SignupPage'
import { ensureSession } from '@/features/auth/session'
import { safeRedirect } from '@/features/auth/session-manager'
import { CartPage } from '@/features/cart/CartPage'
import { HomePage } from '@/features/catalog/HomePage'
import { toApiQuery, validateCatalogSearch } from '@/features/catalog/search'
import { CheckoutPage } from '@/features/checkout/CheckoutPage'
import { NftDetailPage } from '@/features/nft/NftDetailPage'
import { OrderPage } from '@/features/orders/OrderPage'
import { RealtimeProvider } from '@/realtime/RealtimeProvider'

export interface RouterContext {
  queryClient: QueryClient
}

/**
 * URLs limpas: ?category=art,music&page=2 (em vez do JSON padrão do router).
 * Os valores chegam como string e cada rota os valida/coage em `validateSearch`.
 */
const parseSearch = (search: string): Record<string, string> => Object.fromEntries(new URLSearchParams(search.startsWith('?') ? search.slice(1) : search))
const stringifySearch = (search: Record<string, unknown>): string => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null || value === '' || value === false) continue
    params.set(key, String(value))
  }
  const out = params.toString()
  return out ? `?${out}` : ''
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  // a sessão é resolvida antes de qualquer tela, então as rotas já sabem se há usuário
  beforeLoad: async ({ context }) => {
    await ensureSession(context.queryClient)
  },
  component: () => (
    <RealtimeProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </RealtimeProvider>
  ),
  notFoundComponent: NotFoundPage,
  errorComponent: RouteError,
  pendingComponent: AppLoading,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: validateCatalogSearch,
  loaderDeps: ({ search }) => ({ search }),
  // pré-busca sem bloquear a navegação: a tela abre com skeleton enquanto a consulta já está em andamento
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(nftListOptions(toApiQuery(deps.search)))
    void context.queryClient.prefetchQuery(featuredOptions())
  },
  component: HomePage,
})

const nftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/nfts/$nftId',
  validateSearch: (raw: Record<string, unknown>): { edition?: string } => ({ edition: typeof raw.edition === 'string' && raw.edition ? raw.edition : undefined }),
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(nftDetailOptions(params.nftId))
  },
  component: NftDetailPage,
})

const cartRoute = createRoute({ getParentRoute: () => rootRoute, path: '/cart', component: CartPage })

const authSearch = (raw: Record<string, unknown>): { redirect?: string; reason?: 'expired' } => ({
  redirect: safeRedirect(raw.redirect),
  reason: raw.reason === 'expired' ? 'expired' : undefined,
})

/** Quem já está autenticado não precisa ver login/cadastro. */
const guestOnly = async ({ context, search }: { context: RouterContext; search: { redirect?: string } }) => {
  const user = await ensureSession(context.queryClient)
  if (user) throw redirect({ to: (safeRedirect(search.redirect) ?? '/') as '/' })
}

const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: '/login', validateSearch: authSearch, beforeLoad: guestOnly, component: LoginPage })
const signupRoute = createRoute({ getParentRoute: () => rootRoute, path: '/signup', validateSearch: authSearch, beforeLoad: guestOnly, component: SignupPage })

/** Rotas privadas: sem sessão, redireciona ao login guardando o destino para retorno. */
const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_auth',
  beforeLoad: async ({ context, location }) => {
    const user = await ensureSession(context.queryClient)
    if (!user) throw redirect({ to: '/login', search: { redirect: location.href } })
  },
})

const checkoutRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/checkout',
  validateSearch: (raw: Record<string, unknown>): { step?: 'review' } => ({ step: raw.step === 'review' ? 'review' : undefined }),
  component: CheckoutPage,
})
const orderRoute = createRoute({ getParentRoute: () => authRoute, path: '/orders/$orderId', component: OrderPage })

const accountRoute = createRoute({ getParentRoute: () => authRoute, id: '_account', component: AccountLayout })
const profileRoute = createRoute({ getParentRoute: () => accountRoute, path: '/profile', component: ProfilePage })
const walletsRoute = createRoute({ getParentRoute: () => accountRoute, path: '/wallets', component: WalletsPage })

const routeTree = rootRoute.addChildren([
  indexRoute,
  nftRoute,
  cartRoute,
  loginRoute,
  signupRoute,
  authRoute.addChildren([checkoutRoute, orderRoute, accountRoute.addChildren([profileRoute, walletsRoute])]),
])

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    parseSearch,
    stringifySearch,
    defaultPreload: 'intent',
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
    scrollRestoration: true,
    defaultNotFoundComponent: NotFoundPage,
    defaultErrorComponent: RouteError,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}

