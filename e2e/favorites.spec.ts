import { expect, test } from './fixtures'

test.describe('Favoritos', () => {
  test('visitante é levado ao login ao favoritar', async ({ app, page }) => {
    await app.goto('/nfts/nft-001')
    await page.getByRole('button', { name: /Adicionar Aurora Drift aos favoritos/ }).click()
    await expect(page).toHaveURL(/\/login\?redirect=%2Fnfts%2Fnft-001/)
  })

  test('favoritar persiste para o usuário após refresh e é privado por conta', async ({ app, page }) => {
    await app.quickLogin('ana', '/nfts/nft-001')
    const toggle = page.getByRole('button', { name: /Aurora Drift (aos|dos) favoritos/ })
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('live-region')).toContainText('Aurora Drift adicionado aos favoritos')
    await page.reload()
    await expect(page.getByRole('button', { name: /Remover Aurora Drift dos favoritos/ })).toHaveAttribute('aria-pressed', 'true')
    // Bruno não vê o favorito da Ana
    await app.logout()
    await app.login('bruno', '/nfts/nft-001')
    await expect(page.getByRole('button', { name: /Adicionar Aurora Drift aos favoritos/ })).toHaveAttribute('aria-pressed', 'false')
  })

  test('falha na mutation faz rollback otimista e a recuperação funciona', async ({ app, page }) => {
    await app.quickLogin('ana', '/nfts/nft-001')
    await app.scenario('instant+favorites-fail')
    const toggle = page.getByRole('button', { name: /Adicionar Aurora Drift aos favoritos/ })
    await toggle.click()
    // o toast de erro avisa e o estado volta ao anterior
    await expect(page.getByText('Não foi possível favoritar “Aurora Drift”')).toBeVisible()
    await expect(page.getByRole('button', { name: /Adicionar Aurora Drift aos favoritos/ })).toHaveAttribute('aria-pressed', 'false')
    await page.reload()
    await expect(page.getByRole('button', { name: /Adicionar Aurora Drift aos favoritos/ })).toHaveAttribute('aria-pressed', 'false')
    // recuperação: com a API saudável, a ação funciona
    await app.scenario('instant')
    await page.getByRole('button', { name: /Adicionar Aurora Drift aos favoritos/ }).click()
    await expect(page.getByRole('button', { name: /Remover Aurora Drift dos favoritos/ })).toHaveAttribute('aria-pressed', 'true')
  })

  test('atualização otimista é imediata (antes da resposta da API)', async ({ app, page }) => {
    await app.quickLogin('ana', '/nfts/nft-001')
    await app.scenario('slow')
    await page.getByRole('button', { name: /Adicionar Aurora Drift aos favoritos/ }).click()
    // com a API lenta (≥1,8 s) o coração já está marcado
    await expect(page.getByRole('button', { name: /Remover Aurora Drift dos favoritos/ })).toHaveAttribute('aria-pressed', 'true', { timeout: 1000 })
  })
})
