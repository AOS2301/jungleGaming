# Kurio — Marketplace de NFTs

Solução do **Desafio Frontend — Marketplace de NFTs** (enunciado completo em [`docs/DESAFIO.md`](docs/DESAFIO.md)).
React + TypeScript, com APIs, autenticação, carteiras, pagamentos e **tempo real simulados na camada de rede** (MSW + Socket.IO).

| Item | Link |
| --- | --- |
| Repositório | https://github.com/AOS2301/jungleGaming (branch `claude/nft-marketplace-frontend-93jvo6`) |
| Aplicação publicada | _a preencher após o deploy_ (veja [Deploy](#deploy)) |
| Arquitetura, decisões e limitações | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| Contratos REST e eventos | [`docs/API.md`](docs/API.md) |
| Relatórios Lighthouse | [`reports/lighthouse/summary.md`](reports/lighthouse/summary.md) |

## Stack

| Responsabilidade | Tecnologia | Onde participa |
| --- | --- | --- |
| Interface / Linguagem | React 19 + TypeScript (strict) | `src/` |
| Roteamento | TanStack Router (rotas em código, search params validados, guarda de rotas privadas) | `src/router.tsx` |
| Estado remoto | TanStack Query (chaves por usuário/parâmetros, otimismo, invalidação por evento) | `src/api/queries.ts`, `src/features/*/hooks.ts` |
| Cliente HTTP | Axios (única porta de saída REST, interceptors de sessão/erros) | `src/api/client.ts`, `src/api/endpoints.ts` |
| Contratos | zod (transporte → estado → UI) | `src/api/contracts.ts` |
| Tempo real | `socket.io-client` | `src/realtime/` |
| Estilização / Componentes | Tailwind CSS 4 + componentes no padrão shadcn/ui (Radix) | `src/components/ui/` |
| Mocking | MSW (REST + `ws`) com `@mswjs/socket.io-binding` | `src/mocks/` |
| Testes E2E e visual | Playwright (Chromium) | `e2e/` |
| Auditoria | Lighthouse | `scripts/lighthouse/` |

## Setup

Requer **Node ≥ 20** (testado com 22) e npm.

```bash
npm ci                  # instala a partir do lockfile
npm run dev:mocks       # desenvolvimento com mocks (http://localhost:5173)
npm run build && npm run preview   # build de produção + preview (http://localhost:4173)
```

Tudo funciona a partir de um checkout limpo, sem backend nem serviços privados: a API e o servidor Socket.IO são simulados no próprio navegador (Service Worker do MSW).

### Variáveis de ambiente (`.env`, prefixo `VITE_`)

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` | Liga a camada MSW (REST + Socket.IO). Em `false` o app fala com um backend real em `VITE_API_BASE_URL` e o código de mocks nem entra no bundle. |
| `VITE_MOCK_SCENARIO` | `default` | Cenário inicial dos mocks (veja [Cenários](#cenários-dos-mocks)). |
| `VITE_MOCK_CONTROLS` | `true` | Exibe o painel “Mocks” e expõe `window.__mocks` / `window.__realtime` (usado nos testes E2E e na demonstração). |
| `VITE_API_BASE_URL` | `/api` | Base da API REST. |
| `VITE_SOCKET_URL` | _(vazio = mesma origem)_ | Origem do servidor Socket.IO. |
| `VITE_API_TIMEOUT_MS` | `10000` | Timeout do Axios (`.env.e2e` usa 2500 para o teste de timeout). |

## Credenciais fictícias

| Usuário | E-mail | Senha |
| --- | --- | --- |
| Ana Souza (2 carteiras, 1 pedido, favorito `nft-007`) | `ana@example.com` | `Senha@123` |
| Bruno Lima (1 carteira, 1 pedido) | `bruno@example.com` | `Senha@456` |

Senhas **nunca** são guardadas em claro: o banco simulado guarda PBKDF2-SHA256 (50 mil iterações, sal por usuário) e o cliente só guarda o token opaco da sessão.

Cupons: `JUNGLE10` (10%), `WELCOME5` (0,05 ETH, mín. 0,2 ETH), `MEGA20` (20%, mín. 3 ETH), `EXPIRED20` (expirado).
NFTs úteis: `nft-001` (2 edições com estoque), `nft-002` (uma edição esgotada), `nft-003` (esgotado), `nft-004` (1 unidade), `nft-005` (3 unidades, preço `0.0125`), `nft-006` (preço alto).

## Cenários dos mocks

Selecione de 4 formas (a escolha persiste em `localStorage`):

1. **URL**: `http://localhost:5173/?scenario=slow` (combine com `+`: `?scenario=slow+payment-declined`);
2. **Painel “Mocks”** (botão flutuante no canto inferior esquerdo);
3. **Console**: `__mocks.scenario.set('flaky')`;
4. **Variável** `VITE_MOCK_SCENARIO`.

| Cenário | Efeito |
| --- | --- |
| `default` | Sucesso com latência realista (80–260 ms, determinística). |
| `instant` | Sem latência (base dos testes E2E). |
| `empty` | Catálogo vazio. |
| `slow` | 1,8–2,6 s por requisição → skeletons com shimmer. |
| `variable-latency` | Listagem com latência decrescente (1,8 s → 0,9 s → 0,25 s): respostas **fora de ordem**. |
| `offline` | Falha de conexão em toda requisição REST. |
| `server-error` | HTTP 500 permanente em `GET /api/nfts`. |
| `flaky` | 2 primeiros `GET /api/nfts` respondem 503; depois recupera (retries automáticos). |
| `session-expired` | `GET /api/session` responde 401 `SESSION_EXPIRED` uma vez. |
| `expire-on-submit` | A sessão expira exatamente ao enviar o pedido. |
| `forbidden` | `GET /api/wallets` responde 403. |
| `signup-conflict` | Todo cadastro responde 409 `EMAIL_TAKEN`. |
| `profile-validation` | `PUT /api/profile` responde 422 com erro de campo. |
| `favorites-fail` | Mutations de favoritos respondem 500 (rollback otimista). |
| `price-change-on-submit` | O preço do 1º item muda (e emite `nft.updated`) logo antes de criar o pedido → 409 `QUOTE_CHANGED`. |
| `sold-out-on-submit` | A edição do 1º item esgota logo antes de criar o pedido → 409 `AVAILABILITY_CONFLICT`. |
| `order-timeout` | O pedido é **criado**, mas a resposta nunca chega (timeout); o reenvio com a mesma `Idempotency-Key` recupera o mesmo pedido. |
| `order-503` | A criação do pedido falha uma vez com 503 (antes de gravar). |
| `payment-declined` / `payment-confirmed` | Pagamento recusado / confirmado (padrão). |
| `pending-hold` | Pedidos ficam pendentes até `__mocks.orders.resolve(id)` (ou botões do painel). |
| `wallet-rejected` | A conexão da carteira é recusada. |
| `realtime-offline` | O servidor Socket.IO recusa conexões. |

Cupom inválido/expirado/valor mínimo, conflito de cadastro (e-mail da Ana) e validação de formulários acontecem naturalmente com os dados da semente.

### Resetar os dados

O estado simulado (catálogo, usuários, sessões, carrinhos, favoritos, carteiras, pedidos e chaves de idempotência) persiste em `localStorage` (`jg.mock.db`). Para voltar integralmente ao cenário conhecido:

- abra `/?reset=1`, **ou**
- botão **Resetar dados** no painel “Mocks”, **ou**
- `__mocks.reset()` no console (limpa também sessão, carrinho de visitante e rascunhos do cliente e recarrega).

### Reproduzindo fluxos de falha e tempo real

Com o painel “Mocks” (ou `window.__mocks`):

- **Preço/disponibilidade mudando ao vivo**: com um NFT no carrinho, `Preço +10%` / `Esgotar 1ª edição` (ou `__mocks.nft.update('nft-001', { standard: { price: '1.2' } })`). O evento sai do servidor simulado e chega via `socket.io-client`; o carrinho avisa e atualiza o resumo; no checkout a confirmação é bloqueada até aceitar a nova cotação.
- **Eventos duplicados/antigos**: `Reenviar duplicado` ou `__mocks.realtime.emitRaw('nft.updated', { ...evento, version: 1 })`.
- **Interrupção de conexão**: `Derrubar conexão`; `Indisponibilizar` mantém o servidor recusando conexões até `Restabelecer`. Ao reconectar o cliente reconcilia com a REST.
- **Pedido pendente + queda**: `?scenario=pending-hold`, confirme uma compra, derrube a conexão, resolva o pedido no painel e restabeleça: a UI recupera o estado sem criar outra compra.
- **Sessão expirada**: botão `Expirar sessão` (ou cenário `session-expired` / `expire-on-submit`).

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` / `npm run dev:mocks` | Desenvolvimento (mocks ligados por padrão via `.env`). |
| `npm run build` | Verificação de tipos + build de produção (`dist/`, com mocks e Service Worker). |
| `npm run preview` | Serve o build em `http://localhost:4173`. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run lint` | ESLint (inclui regra que proíbe `fetch` fora dos mocks: REST só via Axios). |
| `npm run test:unit` | Vitest (aritmética decimal). |
| `npm run test:e2e` | Playwright (build `e2e` + preview + testes). Relatório HTML em `playwright-report/`, traces das falhas em `test-results/`. |
| `npm run test:e2e:update` | Regenera as baselines de regressão visual. |
| `npm run test:e2e:report` | Abre o relatório HTML. |
| `npm run lighthouse` | Build + 3 medições × (início, detalhe) × (mobile, desktop); relatórios em `reports/lighthouse/`. |
| `npm run generate:assets` | Regenera as artes SVG e o catálogo semente (determinístico). |

Os testes rodam em Chromium nos projetos `desktop` (1440), `mobile` (390) e `tablet` (768, só responsividade/visual). Cada teste usa um contexto novo (storage e Service Worker limpos) = estado isolado.

## Deploy

O app é um SPA estático (Vite). `vercel.json` já define o fallback de rotas (acesso direto e refresh funcionam) e cache; `public/_redirects` cobre Netlify/Cloudflare Pages. O Service Worker do MSW (`/mockServiceWorker.js`) é publicado junto, então **os mocks e o tempo real funcionam no ambiente publicado**.

```bash
npx vercel --prod   # ou conecte o repositório na Vercel (framework Vite, build: npm run build, saída: dist)
```

## Estrutura

```
src/
  api/          contratos (zod), Axios, endpoints, chaves/opções do Query
  features/     auth, catalog, nft, cart, checkout, orders, account, favorites
  realtime/     provider Socket.IO, processador de eventos, status/avisos
  mocks/        MSW: banco, cenários, handlers REST, servidor Socket.IO, painel
  components/   ui (shadcn/ui adaptado), layout, common
e2e/            testes Playwright + baselines visuais
scripts/        gerador de assets, auditoria Lighthouse
docs/           enunciado do desafio e contratos da API
```
