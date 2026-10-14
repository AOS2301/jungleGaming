import { expect, test, type Page } from './fixtures'

/**
 * Regressão visual: início, detalhe, carrinho e pagamento em 390, 768 e 1440 px.
 * Dados estáveis (semente fixa + cenário "instant"), relógio fixo e animações desativadas.
 * As baselines ficam versionadas em e2e/__screenshots__/<projeto>/.
 * Para atualizar após uma mudança visual intencional: npm run test:e2e:update
 */
async function prepare(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  // leva cada imagem pendente (lazy) ao viewport para disparar o carregamento e espera todas concluírem
  for (let pass = 0; pass < 4; pass++) {
    await page.evaluate(async () => {
      for (const img of document.images) {
        if (!img.complete) {
          img.scrollIntoView({ block: 'center', behavior: 'instant' })
          await new Promise((r) => setTimeout(r, 80))
        }
      }
      window.scrollTo({ top: 0, behavior: 'instant' })
    })
  }
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0))
  await page.waitForTimeout(150)
}

const shot = async (page: Page, name: string) => {
  await prepare(page)
  await expect(page).toHaveScreenshot(name, {
    fullPage: true,
    mask: [page.getByTestId('mock-panel-trigger'), page.getByTestId('connection-status')],
  })
}

test.describe('Regressão visual', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-06-01T12:00:00Z'))
  })

  test('início', async ({ app, page }) => {
    await app.goto('/')
    await expect(page.getByTestId('catalog-grid')).toBeVisible()
    await expect(page.getByTestId('hero-featured').locator('img')).toBeVisible()
    await shot(page, 'inicio.png')
  })

  test('detalhe do NFT', async ({ app, page }) => {
    await app.goto('/nfts/nft-001')
    await expect(page.getByTestId('detail-price')).toBeVisible()
    await shot(page, 'detalhe.png')
  })

  test('carrinho', async ({ app, page }) => {
    await app.addToCart('nft-001', { qty: 2 })
    await expect(page.getByTestId('quote-total')).toContainText('1,7038')
    await shot(page, 'carrinho.png')
  })

  test('pagamento', async ({ app, page }) => {
    await app.quickLogin('ana', '/')
    await app.addToCart('nft-001')
    await page.getByRole('link', { name: 'Finalizar compra' }).click()
    await page.waitForURL('**/checkout')
    await expect(page.getByTestId('go-review')).toBeVisible()
    await expect(page.getByTestId('wallet-status')).toBeVisible()
    await shot(page, 'pagamento.png')
  })
})
