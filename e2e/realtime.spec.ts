import { expect, test } from './fixtures'

test.describe('Tempo real (Socket.IO sobre MSW)', () => {
  test('mudança de preço de item no carrinho informa o usuário e atualiza o resumo', async ({ app, page }) => {
    await app.addToCart('nft-001')
    await app.waitRealtimeConnected()
    await expect(page.getByTestId('quote-subtotal')).toContainText('0,85')
    await app.nftUpdate('nft-001', { standard: { price: '1' } })
    await expect(page.getByTestId('cart-notices')).toContainText('mudou de 0,85 ETH para 1,00 ETH')
    await expect(page.getByTestId('quote-subtotal')).toContainText('1,00')
    await expect(page.getByTestId('quote-total')).toContainText('1,0034')
    await expect(page.getByTestId('live-region')).toContainText('mudou de 0,85 ETH')
  })

  test('disponibilidade zerada bloqueia o carrinho', async ({ app, page }) => {
    await app.addToCart('nft-001')
    await app.waitRealtimeConnected()
    await app.nftUpdate('nft-001', { standard: { available: 0 } })
    await expect(page.getByTestId('line-issue')).toContainText('esgotou')
    await expect(page.getByRole('link', { name: 'Finalizar compra' })).toHaveAttribute('aria-disabled', 'true')
    await expect(page.getByTestId('cart-notices')).toContainText('esgotou')
  })

  test('catálogo e detalhe também refletem nft.updated', async ({ app, page }) => {
    await app.goto('/')
    await app.waitRealtimeConnected()
    const card = page.getByTestId('catalog-grid').locator('[data-nft-id="nft-001"]')
    await expect(card).toBeVisible()
    await app.nftUpdate('nft-001', { standard: { price: '0.2' }, rare: { price: '1.4' } })
    await expect(card).toContainText('0,20')
    await expect(page.getByTestId('hero-featured')).toBeVisible()
  })

  test('o checkout impede confirmar com cotação desatualizada', async ({ app, page }) => {
    await app.quickLogin('ana', '/')
    await app.buyFlowToReview()
    await app.waitRealtimeConnected()
    await page.getByLabel(/Revisei os itens/).check()
    await expect(page.getByTestId('confirm-order')).toBeEnabled()
    await app.nftUpdate('nft-001', { standard: { price: '0.9' } })
    await expect(page.getByTestId('quote-changed')).toBeVisible()
    await expect(page.getByTestId('confirm-order')).toBeDisabled()
    await expect(page.getByLabel(/Revisei os itens/)).toBeDisabled()
    expect(await app.orderCount()).toBe(2)
    await page.getByTestId('accept-quote').click()
    await app.confirmOrder()
    await expect(page.getByTestId('order-page')).toHaveAttribute('data-status', 'confirmed')
    await expect(page.getByTestId('receipt-total')).toContainText('0,9034')
  })

  test('eventos duplicados, antigos e inválidos não reaplicam efeitos nem regridem o estado', async ({ app, page }) => {
    await app.addToCart('nft-001')
    await app.waitRealtimeConnected()
    const event = await app.nftUpdate('nft-001', { standard: { price: '1' } })
    await expect(page.getByTestId('quote-subtotal')).toContainText('1,00')
    const notices = page.getByTestId('cart-notices').locator('li')
    await expect(notices).toHaveCount(1)

    // duplicata (mesmo id): sem novo aviso
    await app.emitRaw('nft.updated', event)
    // evento antigo (versão anterior, outro id) com preço velho: não regride
    await app.emitRaw('nft.updated', { ...event, id: 'evt_stale', version: event!.version - 1, data: { ...event!.data, editions: event!.data.editions.map((e) => ({ ...e, price: '0.5' })) } })
    // payload inválido: ignorado sem quebrar
    await app.emitRaw('nft.updated', { foo: 'bar' })
    // um evento realmente novo ainda é aplicado (prova que o cliente continua vivo)
    await app.nftUpdate('nft-001', { standard: { price: '1.2' } })
    await expect(page.getByTestId('quote-subtotal')).toContainText('1,20')
    await expect(notices).toHaveCount(2) // 1 do evento inicial + 1 do novo; nenhum das duplicatas/antigos
    await expect(page.getByTestId('quote-subtotal')).not.toContainText('0,50')
  })

  test('interrupção da conexão: reconecta e reconcilia com a REST', async ({ app, page }) => {
    await app.addToCart('nft-001')
    await app.waitRealtimeConnected()
    await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected')
    await app.setRealtimeAvailable(false)
    await app.dropConnections()
    await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', /reconnecting|offline/)
    // enquanto desconectado, o preço muda no servidor (o evento NÃO chega)
    await app.nftUpdate('nft-001', { standard: { price: '1.5' } })
    await expect(page.getByTestId('quote-subtotal')).toContainText('0,85')
    await app.setRealtimeAvailable(true)
    // após reconectar, os dados ativos são reconciliados via REST
    await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', { timeout: 15_000 })
    await expect(page.getByTestId('quote-subtotal')).toContainText('1,50')
  })

  test('pedido pendente: conexão cai, pedido é resolvido e o estado é recuperado sem nova compra', async ({ app, page }) => {
    await app.quickLogin('ana', '/')
    await app.scenario('instant+pending-hold')
    await app.buyFlowToReview()
    await app.confirmOrder()
    await expect(page.getByTestId('order-page')).toHaveAttribute('data-status', 'pending')
    const id = app.orderIdFromUrl()
    await app.waitRealtimeConnected()
    await app.setRealtimeAvailable(false)
    await app.dropConnections()
    await expect(page.getByTestId('realtime-down')).toBeVisible()
    await app.resolveOrder(id, 'confirmed') // o evento se perde: não há conexão
    await app.setRealtimeAvailable(true)
    await expect(page.getByTestId('order-page')).toHaveAttribute('data-status', 'confirmed', { timeout: 15_000 })
    expect(await app.orderCount()).toBe(3)
  })

  test('evento de outro usuário ou antigo não altera o pedido exibido', async ({ app, page }) => {
    await app.quickLogin('bruno', '/orders/ord_seed_bruno')
    await expect(page.getByTestId('order-page')).toHaveAttribute('data-status', 'confirmed')
    await app.waitRealtimeConnected()
    const payload = await page.evaluate(() => {
      const o = window.__mocks!.db.snapshot().orders.find((x) => x.id === 'ord_seed_bruno')!
      const { userId: _u, resolveAt: _r, idempotencyKey: _k, ...pub } = o
      void _u; void _r; void _k
      return { ...pub, status: 'declined' as const, version: 99 }
    })
    const event = (userId: string, version: number, id: string) => ({
      id, type: 'order.updated', resource: { type: 'order', id: 'ord_seed_bruno' }, version, occurredAt: new Date().toISOString(), userId,
      data: { status: 'declined', order: { ...payload, version } },
    })
    await app.emitRaw('order.updated', event('usr_ana', 99, 'evt_x1')) // outro usuário
    await app.emitRaw('order.updated', event('usr_bruno', 1, 'evt_x2')) // versão antiga
    await app.emitRaw('order.updated', event('usr_bruno', 99, 'evt_x3')) // regressão de estado terminal (confirmed -> declined)
    // dá tempo ao cliente processar; nada muda
    await page.waitForTimeout(400)
    await expect(page.getByTestId('order-page')).toHaveAttribute('data-status', 'confirmed')
    await expect(page.getByTestId('order-title')).toHaveText('Compra confirmada!')
  })

  test('subscriptions são liberadas: logout encerra a conexão do usuário anterior', async ({ app }) => {
    await app.quickLogin('ana', '/')
    await app.waitRealtimeConnected()
    const before = await app.serverConnections()
    expect(before).toHaveLength(1)
    expect(before[0]!.userId).toBe('usr_ana')
    await app.logout()
    await expect.poll(async () => (await app.serverConnections()).map((c) => c.userId)).toEqual([null])
    expect((await app.realtime()).sockets).toBe(1)
  })
})
