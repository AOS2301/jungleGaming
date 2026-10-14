import { expect, test as base, type Locator, type Page } from '@playwright/test'

export const USERS = {
  ana: { email: 'ana@example.com', password: 'Senha@123', name: 'Ana Souza', id: 'usr_ana' },
  bruno: { email: 'bruno@example.com', password: 'Senha@456', name: 'Bruno Lima', id: 'usr_bruno' },
} as const

/** Ajudantes de alto nível sobre a página — encapsulam o "servidor" simulado (window.__mocks). */
export class App {
  constructor(readonly page: Page) {}

  /** Abre uma rota e espera a camada de mocks e o app estarem prontos. */
  async goto(path = '/') {
    await this.page.goto(path)
    await this.page.waitForFunction(() => !!window.__mocks && !!window.__realtime)
    await this.page.locator('main#conteudo').waitFor()
  }

  /** Troca o cenário em tempo de execução (persiste em localStorage). */
  async scenario(spec: string) {
    await this.page.evaluate((s) => window.__mocks!.scenario.set(s), spec)
  }

  // ---- "servidor" simulado (window.__mocks): muda dados/eventos; a UI só recebe pelo socket.io-client/REST ----

  /** Dispara nft.updated pelo servidor simulado (chega ao app via socket.io-client). */
  nftUpdate(id: string, patches: Record<string, { price?: string; available?: number }>) {
    return this.page.evaluate((a) => window.__mocks!.nft.update(a.id, a.patches)?.event ?? null, { id, patches })
  }
  nft(id: string) {
    return this.page.evaluate((nftId) => window.__mocks!.nft.get(nftId) ?? null, id)
  }
  /** Envia um payload arbitrário pelo socket (duplicado, antigo, de outro usuário...). */
  emitRaw(eventName: string, payload: unknown, audience: 'everyone' | { userId: string } = 'everyone') {
    return this.page.evaluate((a) => window.__mocks!.realtime.emitRaw(a.eventName, a.payload, a.audience), { eventName, payload, audience })
  }
  dropConnections() {
    return this.page.evaluate(() => window.__mocks!.realtime.dropConnections())
  }
  setRealtimeAvailable(available: boolean) {
    return this.page.evaluate((v) => window.__mocks!.realtime.setAvailable(v), available)
  }
  serverConnections() {
    return this.page.evaluate(() => window.__mocks!.realtime.connections())
  }
  expireSessions() {
    return this.page.evaluate(() => window.__mocks!.session.expire())
  }
  orders() {
    return this.page.evaluate(() => window.__mocks!.orders.list())
  }
  resolveOrder(id: string, outcome: 'confirmed' | 'declined' = 'confirmed') {
    return this.page.evaluate((a) => window.__mocks!.orders.resolve(a.id, a.outcome), { id, outcome })
  }
  /** Estado do cliente Socket.IO (diagnóstico exposto em builds de demonstração). */
  async realtime() {
    await this.page.waitForFunction(() => !!window.__realtime)
    return this.page.evaluate(() => ({
      sockets: window.__realtime!.sockets(),
      listeners: window.__realtime!.listeners(),
      connected: window.__realtime!.connected(),
      userId: window.__realtime!.userId(),
    }))
  }
  async waitRealtimeConnected() {
    await this.page.waitForFunction(() => window.__realtime?.connected() === true)
  }

  /** Login pela interface, retornando ao fluxo (?redirect). */
  async login(user: keyof typeof USERS, redirect?: string) {
    const u = USERS[user]
    await this.goto(redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login')
    await this.page.getByLabel('E-mail').fill(u.email)
    await this.page.locator('#password').fill(u.password)
    await this.page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(this.page.getByRole('button', { name: /Menu da conta/ })).toBeVisible().catch(() => undefined)
    await this.page.waitForURL((url) => !url.pathname.startsWith('/login'))
  }

  /** Logout pela interface (menu da conta no desktop, drawer no mobile). */
  async logout() {
    const menu = this.page.getByRole('button', { name: /Menu da conta/ })
    if (await menu.isVisible()) {
      await menu.click()
      await this.page.getByRole('menuitem', { name: 'Sair' }).click()
    } else {
      await this.page.getByRole('button', { name: 'Abrir menu' }).click()
      await this.page.getByRole('button', { name: 'Sair' }).click()
    }
    await this.page.waitForFunction(() => !localStorage.getItem('jg.session'))
  }

  /** Login "rápido": usa a API simulada (MSW) e grava a sessão — para testes que não são sobre autenticação. */
  async quickLogin(user: keyof typeof USERS, path = '/') {
    const u = USERS[user]
    await this.goto('/login')
    await this.page.evaluate(async ({ email, password }) => {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) })
      const auth = await res.json()
      localStorage.setItem('jg.session', JSON.stringify({ token: auth.accessToken, expiresAt: auth.expiresAt, user: auth.user }))
    }, u)
    await this.goto(path)
  }

  /** Adiciona um NFT ao carrinho pela página de detalhe. */
  async addToCart(nftId: string, opts: { edition?: string; qty?: number } = {}) {
    await this.goto(`/nfts/${nftId}${opts.edition ? `?edition=${opts.edition}` : ''}`)
    const qty = opts.qty ?? 1
    for (let i = 1; i < qty; i++) await this.page.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await this.page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
    await this.page.waitForURL('**/cart')
  }

  /** Conecta a carteira selecionada no checkout. */
  async connectWallet() {
    await this.page.getByTestId('connect-wallet').click()
    await expect(this.page.getByTestId('wallet-status')).toContainText('Pronta para pagar')
  }

  /** Percorre o checkout até a revisão (preenche o documento). */
  async checkoutToReview() {
    await this.page.getByLabel('Documento (CPF ou passaporte)').fill('123.456.789-09')
    await this.connectWallet()
    await this.page.getByTestId('go-review').click()
    await expect(this.page.getByTestId('review')).toBeVisible()
  }

  /** Marca o aceite e confirma a compra. */
  async confirmOrder() {
    await this.page.getByLabel(/Revisei os itens/).check()
    await this.page.getByTestId('confirm-order').click()
  }

  /** Id do pedido atual (a partir da URL /orders/:id). */
  orderIdFromUrl() {
    return this.page.url().match(/\/orders\/([^/?#]+)/)?.[1] ?? ''
  }

  /** Atalho: carrinho com um item -> checkout -> revisão (carteira conectada). */
  async buyFlowToReview(nftId = 'nft-001', qty = 1) {
    await this.addToCart(nftId, { qty })
    await this.page.getByRole('link', { name: 'Finalizar compra' }).click()
    await this.page.waitForURL('**/checkout')
    await this.checkoutToReview()
  }

  async orderCount() {
    return (await this.orders()).length
  }
}

export const test = base.extend<{ app: App }>({
  page: async ({ page }, use) => {
    // Estado inicial determinístico: cenário "instant" (sem latência) salvo antes do app subir.
    await page.addInitScript(() => {
      try {
        if (!localStorage.getItem('jg.mock.scenario')) localStorage.setItem('jg.mock.scenario', 'instant')
      } catch {
        /* ignore */
      }
    })
    await use(page)
  },
  app: async ({ page }, use) => {
    await use(new App(page))
  },
})

export { expect }
export type { Locator, Page }

/** Texto de um valor ETH exibido -> número (apenas para comparar ordenação; a precisão é testada em unitários). */
export const ethNumber = (text: string) => Number(text.replace(/[^\d,]/g, '').replace(',', '.'))
