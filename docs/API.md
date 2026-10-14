# Contratos REST e de eventos

Fonte única de verdade: [`src/api/contracts.ts`](../src/api/contracts.ts) (schemas **zod**; os tipos TypeScript são inferidos deles).
O cliente valida toda resposta contra esses schemas; os handlers MSW devolvem exatamente esses formatos.

Convenções:

- Base: `/api`. JSON em UTF-8. Datas ISO‑8601.
- **ETH sempre como string decimal** (`"0.0125"`, até 18 casas, regex `^\d+(\.\d{1,18})?$`). Quantidades são inteiras. O cliente usa BigInt (`src/lib/decimal.ts`); `number` nunca participa de valores monetários.
- Autenticação: `Authorization: Bearer <accessToken>`. Carrinho de visitante: `X-Cart-Token: <uuid>`.
- Erros: `{ "error": { "code", "message", "fields?", "details?", "retryable?" } }`.

## Erros

| Status | `code` | Quando |
| --- | --- | --- |
| 400 | `IDEMPOTENCY_KEY_REQUIRED` | `POST /orders` sem `Idempotency-Key` |
| 401 | `UNAUTHENTICATED` / `SESSION_EXPIRED` / `INVALID_CREDENTIALS` | sem/ com token inválido; sessão expirada; login incorreto |
| 403 | `FORBIDDEN` / `WALLET_CONNECTION_REJECTED` | recurso de outro usuário; conexão de carteira recusada |
| 404 | `NOT_FOUND` | NFT, pedido, carteira, item inexistente |
| 409 | `EMAIL_TAKEN`, `USERNAME_TAKEN`, `WALLET_ADDRESS_IN_USE`, `WALLET_SLOT_TAKEN` | conflitos de cadastro |
| 409 | `AVAILABILITY_CONFLICT` | estoque/limite (`details`: `nftId`, `editionId`, `available`, `max`; em pedidos também `quote`) |
| 409 | `QUOTE_CHANGED` | cotação mudou desde a revisão (`details.quote` traz a nova) |
| 409 | `WALLET_NOT_CONNECTED` | carteira não conectada na rede do pedido |
| 409 | `IDEMPOTENCY_KEY_REUSED` | mesma chave com conteúdo diferente |
| 422 | `VALIDATION_FAILED` (+`fields`) / `COUPON_INVALID` / `COUPON_EXPIRED` / `COUPON_MIN_NOT_MET` | validação por campo; cupom |
| 429/500/503 | `RATE_LIMITED` / `INTERNAL_ERROR` / `SERVICE_UNAVAILABLE` | transitórios (`Retry-After` em 429/503) |

## Sessão e conta

| Método e rota | Corpo → resposta |
| --- | --- |
| `POST /auth/signup` | `{ displayName, email, password }` → `201 { accessToken, expiresAt, user }`; `409 EMAIL_TAKEN` |
| `POST /auth/login` | `{ email, password }` → `200 { accessToken, expiresAt, user }`; `401 INVALID_CREDENTIALS` |
| `GET /session` | → `200 { user, expiresAt }`; `401 SESSION_EXPIRED` |
| `POST /auth/logout` | → `204` |

Senha: ≥ 8 caracteres com maiúscula, minúscula e número. Sessão: 30 min (token opaco).

## NFTs

| Método e rota | Descrição |
| --- | --- |
| `GET /nfts?q&category&network&minPrice&maxPrice&available&sort&page&pageSize` | `category`/`network` em CSV; `sort`: `featured｜newest｜popular｜price_asc｜price_desc`. → `{ items: Nft[], page, pageSize, total, totalPages, facets: { category, network }, query }`. `query` é o **eco** dos parâmetros aplicados; `facets` traz contagens considerando os demais filtros; `page` é limitado ao total. |
| `GET /nfts/featured` | → `{ items: Nft[] }` |
| `GET /nfts/:id` | → `Nft`; `404 NOT_FOUND` |

`Nft`: `id, name, description, category, network, collection, creator, images[{src,alt}], traits[], editions[{id,name,price,total,available}], priceFrom, available, featured, popularity, createdAt, version`.

## Favoritos (autenticado)

`GET /favorites` → `{ nftIds }` · `PUT /favorites/:nftId` (idempotente) · `DELETE /favorites/:nftId` → `{ nftIds }`.

## Carrinho e cotação

Dono do carrinho: usuário autenticado (Bearer) **ou** visitante (`X-Cart-Token`).

| Método e rota | Descrição |
| --- | --- |
| `GET /cart` | → `{ id, items[{id,nftId,editionId,quantity,name,editionName,image,unitPrice,available}], couponCode, version, updatedAt }` |
| `POST /cart/items` | `{ nftId, editionId, quantity }` → `201 Cart`; soma à linha existente; `409 AVAILABILITY_CONFLICT` (limite = `min(estoque, 10)`) |
| `PATCH /cart/items/:id` | `{ quantity }` → `Cart` |
| `DELETE /cart/items/:id` | → `Cart` |
| `PUT /cart/coupon` · `DELETE /cart/coupon` | `{ code }` → `Cart`; `422 COUPON_*` |
| `POST /cart/merge` | `{ guestToken }` → `Cart` (mescla o carrinho de visitante no do usuário; chamado após login/cadastro) |
| `GET /cart/quote?network=` | **Cotação**: `{ network, currency:"ETH", lines[], subtotal, discount, networkFee, total, coupon, couponError, canCheckout, fingerprint, generatedAt }` |

`fingerprint` é um hash do conteúdo financeiro (linhas, preços, status de disponibilidade, cupom, taxa, total, rede). Linha: `status: ok｜insufficient｜sold_out`.
Taxa de rede = base + por unidade, por rede (ex.: Ethereum `0.003 + 0.0004/un.`).

## Pedidos (autenticado)

| Método e rota | Descrição |
| --- | --- |
| `POST /orders` | Cabeçalho obrigatório `Idempotency-Key`. Corpo: `{ items[], couponCode, network, walletId, collector{fullName,email,country,document}, quoteFingerprint }`. `201` novo pedido `pending`; `200` + `Idempotent-Replayed: true` se a mesma chave/conteúdo já criou um pedido; `409 IDEMPOTENCY_KEY_REUSED` se o conteúdo difere. Revalida preço, disponibilidade, cupom, taxa e carteira (`409 QUOTE_CHANGED｜AVAILABILITY_CONFLICT｜WALLET_NOT_CONNECTED`). |
| `GET /orders?status=` | → `{ items: Order[] }` do usuário |
| `GET /orders/:id` | → `Order` (snapshot/recibo); `403` se for de outro usuário |

`Order`: `id, status (pending｜confirmed｜declined), version, items[snapshot], subtotal, discount, networkFee, total, couponCode, wallet (mascarada), collector, tx { hash, explorerUrl, blockNumber, confirmedAt } | null, decline { code, message } | null`. Estados `confirmed`/`declined` são **terminais**. O recibo é um snapshot: mudanças posteriores no catálogo não o alteram.

## Perfil (autenticado)

`GET /profile` · `PUT /profile` `{ displayName, username, email, bio, country }` (`409 EMAIL_TAKEN｜USERNAME_TAKEN`) · `POST /profile/avatar` (`multipart/form-data`, campo `avatar`, PNG/JPEG/WebP ≤ 2 MB) · `DELETE /profile/avatar` · `PUT /profile/password` `{ currentPassword, newPassword }` → `204` (`422` com `fields.currentPassword`).

## Carteiras (autenticado)

`GET /wallets` · `POST /wallets` `{ slot: primary｜secondary, label, address, provider, preferredNetwork }` · `PUT /wallets/:id` · `POST /wallets/:id/connect` `{ network }` (`403 WALLET_CONNECTION_REJECTED`) · `POST /wallets/:id/disconnect`.
Endereço: `0x` + 40 hex, único entre usuários.

## Eventos Socket.IO

Transporte: WebSocket (`transports: ['websocket']`), path `/socket.io`. Handshake: `auth: { token }` (opcional; visitantes recebem apenas eventos públicos).
Todo evento carrega **`id`** (identidade estável), **`resource`** (`{type,id}`), **`version`** (do recurso) e `occurredAt`.

| Evento | Audiência | `data` |
| --- | --- | --- |
| `nft.updated` | todos | `{ editions[{id,price,available}], priceFrom, available }` — estado completo (idempotente) |
| `order.updated` | só o dono (`userId` no payload) | `{ status, order }` |

Regras do cliente (`src/realtime/processor.ts`): payload inválido é descartado; duplicata (`id` já visto) é ignorada; evento com `version` ≤ versão conhecida (cache REST incluído) é descartado; `order.updated` de outro `userId` é ignorado; `confirmed`/`declined` nunca regridem. Após reconexão, as consultas ativas são revalidadas via REST.
