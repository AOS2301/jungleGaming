import { expect, test } from './fixtures'

const order = (page: import('@playwright/test').Page) => page.getByTestId('order-page')

test.describe('Compra completa, pagamento e idempotência', () => {
  test('do catálogo ao recibo confirmado, com snapshot imutável e carrinho esvaziado', async ({ app, page }) => {
    await app.quickLogin('ana', '/')
    // catálogo -> detalhe -> carrinho
    await page.getByTestId('catalog-grid').getByRole('link', { name: 'Aurora Drift' }).first().click().catch(() => undefined)
    await app.goto('/nfts/nft-001')
    await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
    await page.waitForURL('**/cart')
    await page.getByLabel('Cupom de desconto').fill('JUNGLE10')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByTestId('coupon-applied')).toBeVisible()
    await expect(page.getByTestId('quote-total')).toContainText('1,5338')

    await page.getByRole('link', { name: 'Finalizar compra' }).click()
    await page.waitForURL('**/checkout')
    // validação do formulário antes de revisar
    await page.getByTestId('go-review').click()
    await expect(page.getByText('Informe um documento válido')).toBeVisible()
    await app.checkoutToReview()
    await expect(page.getByTestId('review')).toContainText('Carteira principal')
    await expect(page).toHaveURL(/step=review/)
    await app.confirmOrder()

    await expect(order(page)).toHaveAttribute('data-status', /pending|confirmed/)
    await expect(order(page)).toHaveAttribute('data-status', 'confirmed')
    await expect(page.getByTestId('order-title')).toHaveText('Compra confirmada!')
    await expect(page.getByTestId('tx-hash')).toHaveText(/^0x[0-9a-f]{64}$/)
    await expect(page.getByTestId('receipt-subtotal')).toContainText('1,70')
    await expect(page.getByTestId('receipt-discount')).toContainText('0,17')
    await expect(page.getByTestId('receipt-fee')).toContainText('0,0038')
    await expect(page.getByTestId('receipt-total')).toContainText('1,5338')

    // o carrinho comprado foi removido e o estoque baixou (12 -> 10)
    await app.goto('/cart')
    await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
    await app.goto('/nfts/nft-001')
    await expect(page.getByTestId('edition-standard')).toContainText('10 de 100 disponíveis')

    // alterações posteriores no catálogo não mudam o recibo
    const id = (await app.orders()).find((o) => !o.id.startsWith('ord_seed'))!.id
    await app.nftUpdate('nft-001', { standard: { price: '5' } })
    await app.goto(`/orders/${id}`)
    await expect(page.getByTestId('receipt-total')).toContainText('1,5338')
    await expect(page.getByTestId('receipt')).toContainText('1,70')
  })

  test('pagamento recusado: estado terminal, itens preservados e nova tentativa', async ({ app, page }) => {
    await app.quickLogin('ana', '/')
    await app.scenario('instant+payment-declined')
    await app.buyFlowToReview()
    await app.confirmOrder()
    await expect(order(page)).toHaveAttribute('data-status', 'declined')
    await expect(page.getByTestId('order-title')).toHaveText('Pagamento recusado')
    await expect(page.getByTestId('decline-reason')).toContainText('recusou')
    await expect(page.getByTestId('tx')).toHaveCount(0) // sem transação
    await app.goto('/cart')
    await expect(page.getByTestId('cart-line')).toHaveCount(1) // itens preservados
    // o estoque não foi alterado
    expect((await app.nft('nft-001'))!.editions[0]!.available).toBe(12)
    // "tentar novamente" com o pagamento saudável
    await app.scenario('instant')
    await app.goto('/checkout?step=review')
    await expect(page.getByTestId('review')).toBeVisible()
    await app.confirmOrder()
    await expect(order(page)).toHaveAttribute('data-status', 'confirmed')
  })

  test('cliques repetidos no botão de confirmar criam um único pedido', async ({ app, page }) => {
    await app.quickLogin('ana', '/')
    await app.buyFlowToReview()
    await app.scenario('default') // latência realista: o 2º clique chega com o 1º em andamento
    await page.getByLabel(/Revisei os itens/).check()
    const confirm = page.getByTestId('confirm-order')
    await confirm.dispatchEvent('click')
    await confirm.dispatchEvent('click')
    await confirm.dispatchEvent('click')
    await expect(order(page)).toBeVisible({ timeout: 15_000 })
    expect(await app.orderCount()).toBe(3) // 2 da semente + 1
  })

  test('timeout após a criação (sem tempo real): reenvio com a mesma chave recupera o MESMO pedido', async ({ app, page }) => {
    await app.quickLogin('ana', '/')
    await app.buyFlowToReview()
    await app.scenario('instant+order-timeout+realtime-offline')
    await app.dropConnections() // sem Socket.IO, só a REST pode recuperar o pedido
    await app.confirmOrder()
    // 1ª tentativa estoura o timeout (2,5 s no build e2e); a repetição automática usa a mesma Idempotency-Key
    await expect(order(page)).toBeVisible({ timeout: 20_000 })
    await expect(order(page)).toHaveAttribute('data-status', /pending|confirmed/)
    const metrics = await page.evaluate(() => window.__mocks!.db.snapshot().metrics)
    expect(metrics['order.requests']).toBe(2) // tentativa original + reenvio
    expect(metrics['order.replays']).toBe(1) // o reenvio recuperou o pedido existente
    await expect(order(page)).toHaveAttribute('data-status', 'confirmed', { timeout: 15_000 }) // fallback por polling
    const created = (await app.orders()).filter((o) => !o.id.startsWith('ord_seed'))
    expect(created).toHaveLength(1) // um único pedido
  })

  test('timeout após a criação (com tempo real): o pedido é recuperado sem duplicar', async ({ app, page }) => {
    await app.quickLogin('ana', '/')
    await app.buyFlowToReview()
    await app.scenario('instant+order-timeout')
    await app.confirmOrder()
    await expect(order(page)).toBeVisible({ timeout: 20_000 })
    await expect(order(page)).toHaveAttribute('data-status', 'confirmed', { timeout: 10_000 })
    // a mutation original ainda repete em segundo plano com a mesma chave; mesmo assim só existe um pedido
    await expect.poll(async () => (await page.evaluate(() => window.__mocks!.db.snapshot().metrics))['order.replays'] ?? 0, { timeout: 10_000 }).toBe(1)
    const created = (await app.orders()).filter((o) => !o.id.startsWith('ord_seed'))
    expect(created).toHaveLength(1)
  })

  test('falha transitória 503 não cria pedido; reenviar funciona', async ({ app, page }) => {
    await app.quickLogin('ana', '/')
    await app.buyFlowToReview()
    await app.scenario('instant+order-503')
    await app.confirmOrder()
    await expect(page.getByTestId('submit-error')).toContainText('indisponível')
    expect(await app.orderCount()).toBe(2)
    await page.getByTestId('confirm-order').click()
    await expect(order(page)).toHaveAttribute('data-status', 'confirmed')
    expect(await app.orderCount()).toBe(3)
  })

  test('chave de idempotência reutilizada com conteúdo diferente gera conflito (API)', async ({ app, page }) => {
    await app.quickLogin('ana', '/')
    await app.buyFlowToReview()
    const result = await page.evaluate(async () => {
      const token = JSON.parse(localStorage.getItem('jg.session')!).token
      const quote = await (await fetch('/api/cart/quote?network=ethereum', { headers: { Authorization: `Bearer ${token}` } })).json()
      const wallets = await (await fetch('/api/wallets', { headers: { Authorization: `Bearer ${token}` } })).json()
      const body = (name: string) => ({
        items: quote.lines.map((l: { nftId: string; editionId: string; quantity: number }) => ({ nftId: l.nftId, editionId: l.editionId, quantity: l.quantity })),
        couponCode: null, network: 'ethereum', walletId: wallets.items[0].id,
        collector: { fullName: name, email: 'ana@example.com', country: 'BR', document: '12345678900' },
        quoteFingerprint: quote.fingerprint,
      })
      const post = async (b: unknown) => {
        const r = await fetch('/api/orders', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': 'k-1', 'content-type': 'application/json' }, body: JSON.stringify(b) })
        return { status: r.status, replayed: r.headers.get('Idempotent-Replayed'), json: await r.json() }
      }
      const first = await post(body('Ana Souza'))
      const again = await post(body('Ana Souza'))
      const other = await post(body('Outro Nome'))
      return { first: first.status, again: again.status, replayed: again.replayed, sameId: first.json.id === again.json.id, other: other.status, code: other.json.error?.code }
    })
    expect(result).toEqual({ first: 201, again: 200, replayed: 'true', sameId: true, other: 409, code: 'IDEMPOTENCY_KEY_REUSED' })
  })

  test('recusa e desconexão da carteira (simulação)', async ({ app, page }) => {
    await app.quickLogin('ana', '/')
    await app.addToCart('nft-001')
    await page.getByRole('link', { name: 'Finalizar compra' }).click()
    await page.waitForURL('**/checkout')
    await app.scenario('instant+wallet-rejected')
    await page.getByTestId('connect-wallet').click()
    await expect(page.getByTestId('wallet-error')).toContainText('recusada')
    await page.getByLabel('Documento (CPF ou passaporte)').fill('123456789')
    await page.getByTestId('go-review').click()
    await expect(page).not.toHaveURL(/step=review/) // sem carteira conectada, não revisa
    await app.scenario('instant')
    await app.connectWallet()
    await page.getByTestId('disconnect-wallet').click()
    await expect(page.getByTestId('wallet-status')).toContainText('Conecte a carteira')
    // trocar a rede com a carteira conectada em outra pede reconexão
    await app.connectWallet()
    await page.getByRole('combobox', { name: /Rede/ }).click()
    await page.getByRole('option', { name: 'Polygon' }).click()
    await expect(page.getByTestId('wallet-status')).toContainText('Reconecte')
  })

  test('pedido pendente sobrevive a refresh e a navegação; confirmação chega pelo Socket.IO', async ({ app, page }) => {
    await app.quickLogin('ana', '/')
    await app.scenario('instant+pending-hold')
    await app.buyFlowToReview()
    await app.confirmOrder()
    await expect(order(page)).toHaveAttribute('data-status', 'pending')
    const id = app.orderIdFromUrl()
    await app.waitRealtimeConnected()
    await page.reload()
    await expect(order(page)).toHaveAttribute('data-status', 'pending')
    expect(app.orderIdFromUrl()).toBe(id)
    // voltar ao checkout redireciona para o pedido pendente (sem nova compra)
    await app.goto('/checkout')
    await expect(page).toHaveURL(new RegExp(`/orders/${id}`))
    expect(await app.orderCount()).toBe(3)
    await app.waitRealtimeConnected()
    // o servidor resolve o pedido; a UI muda sozinha via evento order.updated
    await app.resolveOrder(id, 'confirmed')
    await expect(order(page)).toHaveAttribute('data-status', 'confirmed')
    await expect(page.getByTestId('tx-hash')).toBeVisible()
    expect(await app.orderCount()).toBe(3)
  })

  test('apenas os itens e quantidades comprados saem do carrinho', async ({ app, page }) => {
    await app.quickLogin('ana', '/')
    await app.scenario('instant+pending-hold')
    await app.buyFlowToReview('nft-001', 1)
    await app.confirmOrder()
    await expect(order(page)).toHaveAttribute('data-status', 'pending')
    const id = app.orderIdFromUrl()
    await app.addToCart('nft-007') // novo item adicionado enquanto o pedido está pendente
    await app.resolveOrder(id, 'confirmed')
    await app.goto('/cart')
    await expect(page.getByTestId('cart-line')).toHaveCount(1)
    await expect(page.getByTestId('cart-line')).toContainText('Sereno Cidade')
  })

  test('preço alterado durante a compra exige nova confirmação', async ({ app, page }) => {
    await app.quickLogin('ana', '/')
    await app.buyFlowToReview()
    await app.scenario('instant+price-change-on-submit')
    await app.confirmOrder()
    await expect(page.getByTestId('quote-changed')).toBeVisible()
    await expect(page.getByTestId('confirm-order')).toBeDisabled()
    expect(await app.orderCount()).toBe(2) // nenhum pedido criado
    await page.getByTestId('accept-quote').click()
    await expect(page.getByTestId('quote-changed')).toBeHidden()
    await expect(page.getByTestId('confirm-order')).toBeDisabled() // ainda precisa marcar o aceite novamente
    await app.confirmOrder()
    await expect(order(page)).toHaveAttribute('data-status', 'confirmed')
    await expect(page.getByTestId('receipt-total')).toContainText('0,9384') // 0,85 +10% = 0,935 + taxa 0,0034
  })

  test('edição esgotada durante a compra bloqueia o pedido', async ({ app, page }) => {
    await app.quickLogin('ana', '/')
    await app.buyFlowToReview()
    await app.scenario('instant+sold-out-on-submit')
    await app.confirmOrder()
    await expect(page.getByTestId('quote-changed')).toBeVisible()
    await expect(page.getByTestId('quote-changed').getByRole('link', { name: 'Ajustar carrinho' })).toBeVisible()
    await expect(page.getByTestId('confirm-order')).toBeDisabled()
    expect(await app.orderCount()).toBe(2)
  })

  test('sessão expira no envio do pedido: contexto é preservado e a compra é retomada', async ({ app, page }) => {
    await app.quickLogin('ana', '/')
    await app.buyFlowToReview()
    await app.scenario('instant+expire-on-submit')
    await app.confirmOrder()
    await expect(page).toHaveURL(/\/login\?.*reason=expired/)
    await expect(page).toHaveURL(/redirect=%2Fcheckout%3Fstep%3Dreview/)
    expect(await app.orderCount()).toBe(2)
    await page.getByLabel('E-mail').fill('ana@example.com')
    await page.locator('#password').fill('Senha@123')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL(/\/checkout\?step=review/)
    await expect(page.getByTestId('review')).toContainText('123.456.789-09') // rascunho restaurado
    await app.confirmOrder()
    await expect(order(page)).toHaveAttribute('data-status', 'confirmed')
  })

  test('acesso a pedido de outro usuário é negado e pedido inexistente é 404', async ({ app, page }) => {
    await app.quickLogin('ana', '/orders/ord_seed_bruno')
    await expect(page.getByRole('heading', { name: 'Sem permissão para ver este pedido' })).toBeVisible()
    await app.goto('/orders/ord_nao_existe')
    await expect(page.getByRole('heading', { name: 'Pedido não encontrado' })).toBeVisible()
    await app.goto('/orders/ord_seed_ana')
    await expect(page.getByTestId('order-title')).toHaveText('Compra confirmada!')
  })
})
