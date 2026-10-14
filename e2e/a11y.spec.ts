import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from './fixtures'

async function expectNoA11yViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)
  expect(summary, `violações de acessibilidade em ${label}`).toEqual([])
}

test.describe('Acessibilidade', () => {
  test('axe: páginas públicas sem violações WCAG A/AA', async ({ app, page }) => {
    await app.goto('/')
    await expect(page.getByTestId('catalog-grid')).toBeVisible()
    await page.waitForFunction(() => [...document.images].every((i) => i.loading === 'lazy' || i.complete))
    await expectNoA11yViolations(page, 'início')
    await app.goto('/nfts/nft-001')
    await expect(page.getByTestId('detail-price')).toBeVisible()
    await expectNoA11yViolations(page, 'detalhe')
    await app.goto('/login')
    await expectNoA11yViolations(page, 'login')
    await app.goto('/signup')
    await expectNoA11yViolations(page, 'cadastro')
  })

  test('axe: carrinho, checkout, pedido, perfil e carteiras', async ({ app, page }) => {
    await app.quickLogin('ana', '/')
    await app.addToCart('nft-001')
    await expect(page.getByTestId('quote-total')).toBeVisible()
    await expectNoA11yViolations(page, 'carrinho')
    await page.getByRole('link', { name: 'Finalizar compra' }).click()
    await expect(page.getByTestId('go-review')).toBeVisible()
    await expectNoA11yViolations(page, 'pagamento')
    await app.goto('/orders/ord_seed_ana')
    await expect(page.getByTestId('receipt')).toBeVisible()
    await expectNoA11yViolations(page, 'confirmação')
    await app.goto('/profile')
    await expect(page.getByRole('heading', { name: 'Dados do colecionador' })).toBeVisible()
    await expectNoA11yViolations(page, 'perfil')
    await app.goto('/wallets')
    await expect(page.getByTestId('slot-primary')).toBeVisible()
    await expectNoA11yViolations(page, 'carteiras')
  })

  test('link "Ir para o conteúdo" e foco visível na navegação por teclado', async ({ app, page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'teclado físico: cenário de desktop')
    await app.goto('/')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Ir para o conteúdo' })
    await expect(skip).toBeFocused()
    await expect(skip).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page.locator('main#conteudo')).toBeFocused()
    // foco visível: o elemento focado por Tab tem contorno
    await page.locator('body').click({ position: { x: 5, y: 5 } })
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement
      const cs = getComputedStyle(el)
      return { style: cs.outlineStyle, width: cs.outlineWidth }
    })
    expect(outline.style).not.toBe('none')
    expect(parseFloat(outline.width)).toBeGreaterThanOrEqual(2)
  })

  test('catálogo operável só pelo teclado (busca, filtro, card)', async ({ app, page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'teclado físico: cenário de desktop')
    await app.goto('/')
    const search = page.getByRole('searchbox', { name: 'Buscar NFTs' })
    await search.focus()
    await page.keyboard.type('aurora')
    await expect(page).toHaveURL(/q=aurora/)
    // o filtro de categoria é um checkbox real: Espaço alterna
    const arte = page.getByRole('complementary', { name: 'Filtros' }).getByLabel('Arte')
    await arte.focus()
    await page.keyboard.press('Space')
    await expect(page).toHaveURL(/category=art/)
    // o card tem um link focável que abre o detalhe com Enter
    const link = page.getByTestId('catalog-grid').getByRole('link', { name: 'Aurora Drift' })
    await link.focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/nfts\/nft-001/)
  })

  test('menu móvel (drawer): foco preso, Esc fecha e devolve o foco', async ({ app, page }, testInfo) => {
    test.skip(testInfo.project.name === 'desktop', 'drawer só existe abaixo de 1024px')
    await app.goto('/')
    const trigger = page.getByRole('button', { name: 'Abrir menu' })
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: 'Menu' })
    await expect(dialog).toBeVisible()
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('drawer de filtros (telas < 1024px): foco controlado', async ({ app, page }, testInfo) => {
    test.skip(testInfo.project.name === 'desktop', 'sidebar fixa no desktop')
    await app.goto('/')
    const trigger = page.getByRole('button', { name: /Filtros/ })
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: 'Filtros' })
    await expect(dialog).toBeVisible()
    await dialog.getByLabel('Arte').check()
    await expect(page).toHaveURL(/category=art/)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('movimento reduzido desativa o shimmer dos skeletons', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.addInitScript(() => localStorage.setItem('jg.mock.scenario', 'slow'))
    await page.goto('/')
    const skeleton = page.getByTestId('catalog-skeleton').locator('.skeleton').first()
    await expect(skeleton).toBeVisible()
    await expect(skeleton).toHaveCSS('animation-name', 'none')
  })

  test('mutations e mudanças em tempo real são anunciadas em região live', async ({ app, page }) => {
    await app.addToCart('nft-001')
    const live = page.getByTestId('live-region')
    await expect(live).toHaveAttribute('aria-live', 'polite')
    await page.getByLabel('Cupom de desconto').fill('JUNGLE10')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(live).toContainText('Cupom JUNGLE10 aplicado')
  })

  test('formulário de login: erro associado ao campo (aria-describedby) e foco no erro', async ({ app, page }) => {
    await app.goto('/login')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    const email = page.locator('#email')
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    const id = await email.getAttribute('aria-describedby')
    await expect(page.locator(`#${id}`)).toHaveAttribute('role', 'alert')
    await expect(page.locator(`#${id}`)).toContainText('Informe seu e-mail')
  })
})
