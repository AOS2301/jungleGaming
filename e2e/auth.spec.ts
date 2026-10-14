import { expect, test, USERS } from './fixtures'

test.describe('Cadastro', () => {
  test('validação de campos com erros associados e acessíveis', async ({ app, page }) => {
    await app.goto('/signup')
    await page.getByRole('button', { name: 'Criar conta' }).click()
    const name = page.getByLabel('Nome')
    await expect(name).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('Informe seu nome (mín. 2 caracteres)')).toBeVisible()
    await expect(page.getByText('Informe seu e-mail')).toBeVisible()
    // erro ligado ao campo por aria-describedby
    const describedBy = await name.getAttribute('aria-describedby')
    await expect(page.locator(`#${describedBy}`)).toContainText('Informe seu nome')

    await page.getByLabel('Nome').fill('Carla Dias')
    await page.getByLabel('E-mail').fill('carla@example.com')
    await page.locator('#password').fill('fraca')
    await page.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page.getByText(/Use ao menos 8 caracteres/).first()).toBeVisible()
  })

  test('conflito de e-mail retornado pela API é exibido no campo', async ({ app, page }) => {
    await app.goto('/signup')
    await page.getByLabel('Nome').fill('Outra Ana')
    await page.getByLabel('E-mail').fill(USERS.ana.email)
    await page.locator('#password').fill('Senha@999')
    await page.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page.getByText('Este e-mail já está cadastrado').first()).toBeVisible()
    await expect(page.getByLabel('E-mail')).toHaveAttribute('aria-invalid', 'true')
    await expect(page).toHaveURL(/\/signup/)
  })

  test('cria a conta, entra e mantém a sessão após refresh', async ({ app, page }) => {
    await app.goto('/signup')
    await page.getByLabel('Nome').fill('Carla Dias')
    await page.getByLabel('E-mail').fill('carla@example.com')
    await page.locator('#password').fill('Senha@999')
    await page.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page).toHaveURL(/\/$/)
    await app.waitRealtimeConnected()
    const authed = page.getByRole('button', { name: 'Menu da conta de Carla Dias' }).or(page.getByRole('button', { name: 'Abrir menu' }))
    await expect(authed.first()).toBeVisible()
    await page.reload()
    await expect(page.getByRole('link', { name: 'Criar conta' })).toBeHidden()
    await expect.poll(async () => (await app.realtime()).userId).toMatch(/^usr_/)
    // a senha nunca é guardada em claro (nem no cliente, nem no banco simulado)
    const dump = await page.evaluate(() => JSON.stringify({ ...localStorage }))
    expect(dump).not.toContain('Senha@999')
  })

  test('segunda conta com a mesma senha não revela a senha no banco simulado', async ({ app, page }) => {
    await app.goto('/')
    const db = await page.evaluate(() => JSON.stringify(window.__mocks!.db.snapshot().users))
    expect(db).not.toContain('Senha@123')
    expect(db).not.toContain('Senha@456')
    expect(db).toContain('passwordHash')
  })
})

test.describe('Login, sessão e logout', () => {
  test('credenciais inválidas mostram erro da API', async ({ app, page }) => {
    await app.goto('/login')
    await page.getByLabel('E-mail').fill(USERS.ana.email)
    await page.locator('#password').fill('errada')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByTestId('login-error')).toContainText('E-mail ou senha incorretos')
  })

  test('validação local de campos vazios', async ({ app, page }) => {
    await app.goto('/login')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByText('Informe seu e-mail')).toBeVisible()
    await expect(page.getByText('Informe sua senha')).toBeVisible()
  })

  test('rota privada exige login e retorna ao fluxo anterior', async ({ app, page }) => {
    await app.goto('/wallets')
    await expect(page).toHaveURL(/\/login\?redirect=%2Fwallets/)
    await page.getByLabel('E-mail').fill(USERS.ana.email)
    await page.locator('#password').fill(USERS.ana.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL(/\/wallets$/)
    await expect(page.getByRole('heading', { name: 'Carteira principal' })).toBeVisible()
  })

  test('redirect externo é ignorado (sem open redirect)', async ({ app, page }) => {
    await app.goto('/login?redirect=//evil.example.com')
    await page.getByLabel('E-mail').fill(USERS.ana.email)
    await page.locator('#password').fill(USERS.ana.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL(/localhost:\d+\/$/)
  })

  test('expiração de sessão durante a navegação leva ao login e retoma o destino', async ({ app, page }) => {
    await app.quickLogin('ana', '/profile')
    await expect(page.getByRole('heading', { name: 'Dados do colecionador' })).toBeVisible()
    await app.expireSessions() // o servidor invalida a sessão
    await page.getByRole('link', { name: 'Carteiras' }).first().click().catch(async () => {
      await page.goto('/wallets') // mobile: o link do header fica no drawer
    })
    await expect(page).toHaveURL(/\/login\?.*reason=expired/)
    await expect(page.getByTestId('session-expired-notice')).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('jg.session'))).toBeNull()
    await page.getByLabel('E-mail').fill(USERS.ana.email)
    await page.locator('#password').fill(USERS.ana.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL(/\/wallets$/)
  })

  test('sessão expirada no boot (cenário session-expired) cai para visitante', async ({ app, page }) => {
    await app.quickLogin('ana', '/')
    await app.scenario('instant+session-expired')
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login\?redirect=%2Fprofile/)
  })

  test('logout limpa sessão e dados privados', async ({ app, page }) => {
    await app.quickLogin('ana', '/nfts/nft-007')
    await expect(page.getByRole('button', { name: /^Remover .* dos favoritos/ }).first()).toBeVisible()
    await app.logout()
    await expect(page.getByRole('button', { name: /^Adicionar .* aos favoritos/ }).first()).toBeVisible()
    await app.waitRealtimeConnected()
    expect((await app.realtime()).userId).toBeNull()
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login/)
  })

  test('troca de usuário isola dados e a subscription do socket', async ({ app, page }) => {
    await app.quickLogin('ana', '/nfts/nft-007') // Ana tem nft-007 nos favoritos (semente)
    await app.waitRealtimeConnected()
    expect((await app.realtime()).userId).toBe(USERS.ana.id)
    await expect(page.getByRole('button', { name: /^Remover .* dos favoritos/ }).first()).toHaveAttribute('aria-pressed', 'true')
    await app.logout()
    await app.login('bruno', '/nfts/nft-007')
    await app.waitRealtimeConnected()
    expect((await app.realtime()).userId).toBe(USERS.bruno.id)
    await expect(page.getByRole('button', { name: /^Adicionar .* aos favoritos/ }).first()).toHaveAttribute('aria-pressed', 'false')
    // um único socket e sem acúmulo de listeners após várias trocas
    const before = await app.realtime()
    await app.logout()
    await app.login('ana', '/')
    await app.waitRealtimeConnected()
    const after = await app.realtime()
    expect(after.sockets).toBe(1)
    expect(after.listeners).toBe(before.listeners)
    expect((await app.serverConnections()).length).toBe(1)
  })
})
