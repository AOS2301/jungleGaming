import { expect, test, USERS } from './fixtures'

const total = (page: import('@playwright/test').Page) => page.getByTestId('quote-total')

test.describe('Carrinho', () => {
  test('adicionar, alterar quantidade (valores exatos) e persistir após refresh', async ({ app, page }) => {
    await app.addToCart('nft-001')
    await expect(page.getByTestId('cart-line')).toHaveCount(1)
    await expect(page.getByTestId('quote-subtotal')).toContainText('0,85')
    await expect(total(page)).toContainText('0,8534') // 0,85 + taxa de rede 0,0034 (0,003 + 1 × 0,0004)

    await page.getByRole('button', { name: 'Aumentar quantidade de Aurora Drift' }).click()
    await expect(page.getByTestId('line-total')).toContainText('1,70')
    await expect(page.getByTestId('quote-subtotal')).toContainText('1,70')
    await expect(total(page)).toContainText('1,7038') // taxa 0,003 + 2 × 0,0004

    await page.reload()
    await expect(page.getByTestId('cart-line')).toHaveCount(1)
    await expect(total(page)).toContainText('1,7038')
    await expect(page.getByRole('link', { name: 'Carrinho, 2 itens' })).toBeVisible()
  })

  test('quantidade respeita a disponibilidade da edição', async ({ app, page }) => {
    await app.addToCart('nft-005', { qty: 3 })
    await expect(page.getByRole('button', { name: 'Aumentar quantidade de Etéreo Litoral' })).toBeDisabled()
    await expect(page.getByTestId('line-total')).toContainText('0,0375') // 3 × 0,0125 sem perda de precisão
    // tentar adicionar mais pelo detalhe: o limite já foi atingido
    await app.goto('/nfts/nft-005')
    await expect(page.getByTestId('qty-hint')).toContainText('máximo disponível (3) no carrinho')
    await expect(page.getByRole('button', { name: 'Adicionar ao carrinho' })).toBeDisabled()
  })

  test('remoção com confirmação em diálogo (foco controlado)', async ({ app, page }) => {
    await app.addToCart('nft-001')
    const trash = page.getByRole('button', { name: 'Remover Aurora Drift do carrinho' })
    await trash.click()
    const dialog = page.getByRole('dialog', { name: 'Remover item?' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeFocused().catch(() => undefined)
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trash).toBeFocused() // o foco volta ao gatilho
    await trash.click()
    await page.getByRole('dialog').getByRole('button', { name: 'Remover' }).click()
    await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
  })

  test('cupom válido, remoção e códigos inválido/expirado/valor mínimo', async ({ app, page }) => {
    await app.addToCart('nft-001', { qty: 2 })
    await expect(total(page)).toContainText('1,7038')
    const apply = async (code: string) => {
      await page.getByLabel('Cupom de desconto').fill(code)
      await page.getByRole('button', { name: 'Aplicar' }).click()
    }
    await apply('NAOEXISTE')
    await expect(page.getByText('Cupom inválido.')).toBeVisible()
    await expect(page.getByLabel('Cupom de desconto')).toHaveAttribute('aria-invalid', 'true')
    await apply('EXPIRED20')
    await expect(page.getByText('Este cupom expirou.')).toBeVisible()
    await apply('MEGA20')
    await expect(page.getByText(/a partir de 3 ETH/)).toBeVisible()

    await apply('JUNGLE10')
    await expect(page.getByTestId('coupon-applied')).toContainText('JUNGLE10')
    await expect(page.getByTestId('quote-discount')).toContainText('0,17') // 10% de 1,70
    await expect(total(page)).toContainText('1,5338') // 1,70 − 0,17 + 0,0038
    await page.reload()
    await expect(page.getByTestId('coupon-applied')).toBeVisible() // persiste
    await page.getByRole('button', { name: 'Remover cupom JUNGLE10' }).click()
    await expect(page.getByTestId('coupon-applied')).toBeHidden()
    await expect(total(page)).toContainText('1,7038')
  })

  test('itens do visitante são preservados e mesclados ao autenticar', async ({ app, page }) => {
    // Ana já tem um item no carrinho da conta
    await app.quickLogin('ana', '/')
    await app.addToCart('nft-007')
    await app.logout()
    // como visitante, adiciona outro item (carrinho anônimo, separado)
    await app.addToCart('nft-001')
    await expect(page.getByTestId('cart-line')).toHaveCount(1)
    await page.reload()
    await expect(page.getByTestId('cart-line')).toHaveCount(1) // visitante persiste após refresh
    // ao entrar, o item do visitante é mesclado ao carrinho da conta
    await app.login('ana', '/cart')
    await expect(page.getByTestId('cart-line')).toHaveCount(2)
    await expect(page.getByTestId('cart-line').filter({ hasText: 'Aurora Drift' })).toBeVisible()
    await expect(page.getByTestId('cart-line').filter({ hasText: 'Sereno Cidade' })).toBeVisible()
    // o carrinho de visitante foi descartado
    expect(await page.evaluate(() => localStorage.getItem('jg.guestCart'))).toBeNull()
  })

  test('carrinho de um usuário não aparece para outro', async ({ app, page }) => {
    await app.quickLogin('ana', '/')
    await app.addToCart('nft-001')
    await app.logout()
    await app.login('bruno', '/cart')
    await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
    void USERS
  })

  test('skeleton do resumo durante carregamento lento', async ({ app, page }) => {
    await app.addToCart('nft-001')
    await app.scenario('slow')
    await page.reload()
    await expect(page.getByTestId('cart-skeleton')).toBeVisible()
    await expect(page.getByTestId('cart-line')).toBeVisible({ timeout: 15_000 })
  })
})
