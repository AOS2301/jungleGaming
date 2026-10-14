import { ethNumber, expect, test } from './fixtures'

/** Cards do catálogo (exclui o carrossel de Destaques, que também usa NftCard). */
const cards = (page: import('@playwright/test').Page) => page.getByTestId('catalog-grid').getByTestId('nft-card')
const summary = (page: import('@playwright/test').Page) => page.getByTestId('results-summary')
/** Filtros: sidebar no desktop; drawer (dialog) em telas menores. Retorna o escopo e uma função para fechar. */
const openFilters = async (page: import('@playwright/test').Page) => {
  const sidebar = page.getByRole('complementary', { name: 'Filtros' })
  if (await sidebar.isVisible()) return { scope: sidebar, close: async () => undefined }
  await page.getByRole('button', { name: /Filtros/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Filtros' })
  await expect(dialog).toBeVisible()
  return { scope: dialog, close: async () => { await page.keyboard.press('Escape'); await expect(dialog).toBeHidden() } }
}
/** Espera a consulta em andamento terminar (a lista antiga fica visível, esmaecida, até a nova chegar). */
const settled = async (page: import('@playwright/test').Page) => {
  await expect(page.getByTestId('catalog-grid')).toHaveAttribute('aria-busy', 'false')
  await expect(summary(page)).not.toContainText('Atualizando')
}

test.describe('Catálogo: busca, filtros, ordenação e paginação (estado na URL)', () => {
  test('busca por texto atualiza a URL, a lista e sobrevive a refresh', async ({ app, page }) => {
    await app.goto('/')
    await page.getByRole('searchbox', { name: 'Buscar NFTs' }).fill('aurora')
    await expect(page).toHaveURL(/[?&]q=aurora/)
    await expect(cards(page).first()).toContainText('Aurora')
    await expect(summary(page)).toContainText('resultado')

    await page.reload()
    await expect(page.getByRole('searchbox', { name: 'Buscar NFTs' })).toHaveValue('aurora')
    await expect(cards(page).first()).toContainText('Aurora')
  })

  test('filtros combinados refletem os parâmetros da consulta e reiniciam a paginação', async ({ app, page }) => {
    await app.goto('/')
    await expect(summary(page)).toContainText('de 60 resultados')
    await page.getByRole('link', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/page=2/)

    // categoria + rede + somente disponíveis (mudar filtro volta para a página 1)
    const { scope: filters, close } = await openFilters(page)
    await filters.getByLabel('Arte').check()
    await expect(page).not.toHaveURL(/page=/)
    await filters.getByLabel('Ethereum').check()
    await filters.getByLabel('Somente disponíveis').click()
    await close()
    await settled(page)
    await expect(page).toHaveURL(/category=art/)
    await expect(page).toHaveURL(/network=ethereum/)
    await expect(page).toHaveURL(/available=true/)

    const total = Number((await summary(page).innerText()).match(/de (\d+)/)?.[1] ?? '0')
    expect(total).toBeGreaterThan(0)
    expect(total).toBeLessThan(60)
    // todos os cards exibidos são da rede Ethereum (badge) — confirma que o filtro foi aplicado pela API
    for (const badge of await cards(page).locator('span:text-is("Ethereum")').all()) await expect(badge).toBeVisible()
    expect(await cards(page).locator('span:text-is("Polygon"), span:text-is("Base"), span:text-is("Arbitrum")').count()).toBe(0)
    // faixa de preço
    const price = await openFilters(page)
    await price.scope.getByLabel('Mínimo').fill('0.5')
    await price.scope.getByRole('button', { name: 'Aplicar preço' }).click()
    await expect(page).toHaveURL(/min=0\.5/)
    await price.close()
    await settled(page)
    const prices = await cards(page).locator('.eth.font-bold').allInnerTexts()
    for (const price of prices) expect(ethNumber(price)).toBeGreaterThanOrEqual(0.5)
  })

  test('ordenação por preço', async ({ app, page }) => {
    await app.goto('/')
    await page.getByRole('combobox', { name: 'Ordenar por' }).click()
    await page.getByRole('option', { name: 'Menor preço' }).click()
    await expect(page).toHaveURL(/sort=price_asc/)
    await settled(page)
    const asc = (await cards(page).locator('.eth.font-bold').allInnerTexts()).map(ethNumber)
    expect(asc).toEqual([...asc].sort((a, b) => a - b))

    await page.getByRole('combobox', { name: 'Ordenar por' }).click()
    await page.getByRole('option', { name: 'Maior preço' }).click()
    await expect(page).toHaveURL(/sort=price_desc/)
    await settled(page)
    const desc = (await cards(page).locator('.eth.font-bold').allInnerTexts()).map(ethNumber)
    expect(desc).toEqual([...desc].sort((a, b) => b - a))
  })

  test('paginação e restauração pelo histórico (voltar/avançar)', async ({ app, page }) => {
    await app.goto('/')
    const firstPage = await cards(page).first().getAttribute('data-nft-id')
    await page.getByRole('link', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(page.getByRole('link', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')
    await expect(summary(page)).toContainText('13–24')
    await settled(page)
    const secondPage = await cards(page).first().getAttribute('data-nft-id')
    expect(secondPage).not.toBe(firstPage)

    await page.getByRole('link', { name: 'Página 3' }).click()
    await expect(page).toHaveURL(/page=3/)
    await expect(summary(page)).toContainText('25–36')

    await page.goBack()
    await expect(page).toHaveURL(/page=2/)
    await expect(cards(page).first()).toHaveAttribute('data-nft-id', secondPage!)
    await page.goBack()
    await expect(page).not.toHaveURL(/page=/)
    await expect(cards(page).first()).toHaveAttribute('data-nft-id', firstPage!)
    await page.goForward()
    await expect(page).toHaveURL(/page=2/)
    await expect(summary(page)).toContainText('13–24')
    await expect(cards(page).first()).toHaveAttribute('data-nft-id', secondPage!)
  })

  test('resultado vazio com ação de limpar filtros', async ({ app, page }) => {
    await app.goto('/?q=zzzzzz')
    await expect(page.getByRole('heading', { name: 'Nenhum NFT encontrado' })).toBeVisible()
    await page.getByRole('button', { name: 'Limpar filtros' }).click()
    await expect(cards(page).first()).toBeVisible()
    await expect(page).not.toHaveURL(/q=/)
  })

  test('catálogo vazio (cenário "empty")', async ({ app, page }) => {
    await app.goto('/')
    await app.scenario('instant+empty')
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Nenhum NFT encontrado' })).toBeVisible()
    await expect(page.getByText('O catálogo está vazio no momento.')).toBeVisible()
  })

  test('respostas fora de ordem: a lista final reflete a última consulta', async ({ app, page }) => {
    await app.goto('/')
    await expect(cards(page).first()).toBeVisible()
    await app.scenario('variable-latency') // 1ª consulta = 1,8 s, 2ª = 0,9 s, 3ª = 0,25 s
    const { scope: filters, close } = await openFilters(page)
    await filters.getByLabel('Arte').check() // consulta lenta
    await filters.getByLabel('Música').check() // consulta média
    await filters.getByLabel('Games').check() // consulta rápida (a última)
    await close()
    await expect(page).toHaveURL(/category=art%2Cmusic%2Cgames|category=art,music,games/)
    // aguarda as consultas antigas terminarem DEPOIS da última
    await page.waitForTimeout(2300)
    const total = await app.page.evaluate(() => document.querySelector('[data-testid=results-summary]')?.textContent ?? '')
    expect(total).toMatch(/de \d+ resultados/)
    const expected = await page.evaluate(async () => {
      const r = await fetch('/api/nfts?category=art,music,games&pageSize=12')
      return (await r.json()).total as number
    })
    await expect(summary(page)).toContainText(`de ${expected} resultados`)
    // chips refletem os 3 filtros e a UI não "voltou" para uma consulta antiga
    await expect(page.getByRole('button', { name: /^Remover filtro/ })).toHaveCount(3)
  })

  test('skeletons com shimmer durante carregamento lento e sem deslocamento de layout', async ({ app, page }) => {
    await page.addInitScript(() => localStorage.setItem('jg.mock.scenario', 'slow'))
    await page.goto('/')
    const skeleton = page.getByTestId('catalog-skeleton')
    await expect(skeleton).toBeVisible()
    await expect(skeleton.locator('.skeleton').first()).toHaveCSS('animation-name', 'shimmer')
    expect(await skeleton.locator('li').count()).toBe(12)
    const skeletonHeight = (await skeleton.locator('li').first().boundingBox())!.height
    await expect(page.getByTestId('catalog-grid')).toBeVisible({ timeout: 15_000 })
    const realHeight = (await page.getByTestId('catalog-grid').locator('li').first().boundingBox())!.height
    expect(Math.abs(realHeight - skeletonHeight)).toBeLessThanOrEqual(2)
    void app
  })

  test('falha HTTP 500 com nova tentativa e recuperação', async ({ app, page }) => {
    await page.addInitScript(() => localStorage.setItem('jg.mock.scenario', 'instant+server-error'))
    await page.goto('/')
    const alert = page.getByRole('alert').filter({ hasText: 'Não foi possível carregar o catálogo' })
    await expect(alert).toBeVisible({ timeout: 15_000 })
    // ainda falhando: continua mostrando o erro
    await alert.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(alert).toBeVisible({ timeout: 15_000 })
    // o backend "volta": nova tentativa recupera
    await app.scenario('instant')
    await alert.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(cards(page).first()).toBeVisible()
  })

  test('falha transitória (503) é recuperada automaticamente pelos retries', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('jg.mock.scenario', 'instant+flaky'))
    await page.goto('/')
    await expect(cards(page).first()).toBeVisible({ timeout: 15_000 })
  })

  test('indisponibilidade de rede mostra feedback e recupera', async ({ app, page }) => {
    await page.addInitScript(() => localStorage.setItem('jg.mock.scenario', 'instant+offline'))
    await page.goto('/')
    const alert = page.getByRole('alert').filter({ hasText: 'Não foi possível carregar o catálogo' })
    await expect(alert).toBeVisible({ timeout: 15_000 })
    await expect(alert.getByText(/Não foi possível conectar ao servidor/)).toBeVisible()
    await app.scenario('instant')
    await alert.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(cards(page).first()).toBeVisible()
  })
})
