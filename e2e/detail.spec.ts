import { expect, test } from './fixtures'

test.describe('Detalhe do NFT', () => {
  test('acesso direto: galeria, informações e preço', async ({ app, page }) => {
    await app.goto('/nfts/nft-001')
    await expect(page.getByRole('heading', { level: 1, name: 'Aurora Drift' })).toBeVisible()
    await expect(page.getByText('Aurora Series').first()).toBeVisible()
    await expect(page.getByTestId('detail-price')).toContainText('0,85')
    // galeria: trocar a imagem principal
    const main = page.locator('main img[fetchpriority="high"]').first()
    const first = await main.getAttribute('src')
    await page.getByRole('button', { name: 'Mostrar imagem 2 de 3' }).click()
    await expect(page.getByRole('button', { name: 'Mostrar imagem 2 de 3' })).toHaveAttribute('aria-pressed', 'true')
    expect(await main.getAttribute('src')).not.toBe(first)
    // atributos e detalhes
    await expect(page.getByRole('heading', { name: 'Atributos' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Detalhes' })).toBeVisible()
  })

  test('NFT inexistente mostra estado de não encontrado', async ({ app, page }) => {
    await app.goto('/nfts/nft-999')
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
    await page.getByRole('link', { name: 'Voltar ao catálogo' }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('rota inexistente mostra a página 404', async ({ app, page }) => {
    await app.goto('/essa-rota-nao-existe')
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  })

  test('edição indisponível: aviso, compra bloqueada e outra edição liberada', async ({ app, page }) => {
    await app.goto('/nfts/nft-002?edition=legendary')
    await expect(page.getByTestId('edition-unavailable')).toContainText('Legendary')
    await expect(page.getByRole('button', { name: 'Esgotado' })).toBeDisabled()
    await expect(page.getByTestId('qty-hint')).toContainText('Sem unidades')
    await page.getByTestId('edition-standard').click()
    await expect(page.getByTestId('edition-unavailable')).toBeHidden()
    await expect(page.getByRole('button', { name: 'Adicionar ao carrinho' })).toBeEnabled()
  })

  test('NFT totalmente esgotado', async ({ app, page }) => {
    await app.goto('/nfts/nft-003')
    await expect(page.getByTestId('edition-unavailable')).toContainText('não tem unidades disponíveis')
    await expect(page.getByRole('button', { name: 'Esgotado' })).toBeDisabled()
    await expect(page.getByRole('button', { name: /comprar|Entrar e comprar/i })).toBeDisabled()
  })

  test('limite de quantidade respeita a disponibilidade', async ({ app, page }) => {
    await app.goto('/nfts/nft-005') // 3 unidades disponíveis
    const plus = page.getByRole('button', { name: 'Aumentar quantidade' })
    await plus.click()
    await plus.click()
    await expect(page.locator('#qty')).toHaveValue('3')
    await expect(plus).toBeDisabled()
    await expect(page.getByTestId('qty-hint')).toContainText('3 disponíveis')
    // digitar valor acima do limite é ajustado
    await page.locator('#qty').fill('9')
    await page.locator('#qty').blur()
    await expect(page.locator('#qty')).toHaveValue('3')

    await app.goto('/nfts/nft-004') // 1 unidade
    await expect(page.getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled()
    await app.goto('/nfts/nft-007') // 30 disponíveis, mas máximo de 10 por compra
    await expect(page.getByTestId('qty-hint')).toContainText('Máximo de 10 por compra')
  })

  test('tempo real: preço atualizado no detalhe sem recarregar', async ({ app, page }) => {
    await app.goto('/nfts/nft-001')
    await app.waitRealtimeConnected()
    await expect(page.getByTestId('detail-price')).toContainText('0,85')
    await app.nftUpdate('nft-001', { standard: { price: '0.95' } })
    await expect(page.getByTestId('detail-price')).toContainText('0,95')
    await expect(page.getByTestId('live-region')).toContainText('mudou de 0,85 ETH para 0,95 ETH')
  })
})
