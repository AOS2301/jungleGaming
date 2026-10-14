import { expect, test } from './fixtures'

const PUBLIC = ['/', '/nfts/nft-001', '/nfts/nft-002?edition=legendary', '/cart', '/login', '/signup', '/rota-inexistente']
const PRIVATE = ['/checkout', '/profile', '/wallets', '/orders/ord_seed_ana']

async function noHorizontalOverflow(page: import('@playwright/test').Page, label: string) {
  const overflow = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.documentElement.clientWidth,
  }))
  expect(overflow.doc, `overflow horizontal em ${label}`).toBeLessThanOrEqual(0)
  expect(overflow.body, `overflow do body em ${label}`).toBeLessThanOrEqual(0)
}

test.describe('Responsividade (390 / 768 / 1440) sem overflow horizontal', () => {
  test('páginas públicas', async ({ app, page }) => {
    for (const path of PUBLIC) {
      await app.goto(path)
      await page.locator('main#conteudo').waitFor()
      await noHorizontalOverflow(page, path)
    }
  })

  test('páginas privadas (inclui checkout com item no carrinho)', async ({ app, page }) => {
    await app.quickLogin('ana', '/')
    await app.addToCart('nft-001')
    for (const path of PRIVATE) {
      await app.goto(path)
      await page.locator('main#conteudo').waitFor()
      await noHorizontalOverflow(page, path)
    }
  })

  test('reflow com zoom de 400% (320 px equivalentes) não perde conteúdo', async ({ app, page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    for (const path of ['/', '/nfts/nft-001', '/cart', '/login']) {
      await app.goto(path)
      await noHorizontalOverflow(page, `${path} @320`)
    }
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('layout muda conforme a largura: sidebar de filtros só no desktop', async ({ app, page }, testInfo) => {
    await app.goto('/')
    const sidebar = page.getByRole('complementary', { name: 'Filtros' })
    const filtersButton = page.getByRole('button', { name: /Filtros/ })
    if (testInfo.project.name === 'desktop') {
      await expect(sidebar).toBeVisible()
      await expect(filtersButton).toBeHidden()
    } else {
      await expect(sidebar).toBeHidden()
      await expect(filtersButton).toBeVisible()
    }
  })
})
