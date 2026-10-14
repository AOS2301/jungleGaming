# Arquitetura, decisões e limitações

## 1. Visão geral

```
UI (React) ── TanStack Router ── TanStack Query ── Axios ──┐
      │                                                    ├─► [Service Worker do MSW]  handlers REST ─┐
      └── socket.io-client ───────────────── WebSocket ────┘      (interceptação de ws)  servidor Socket.IO│
                                                                                                           ▼
                                                      banco simulado (localStorage) ◄── bus de eventos ◄──┘
```

- **Nada de negócio fica na UI, nos hooks ou no Axios.** Toda regra (estoque, cupom, taxa, idempotência, sessão, expiração) vive em `src/mocks/` e responde por HTTP/WebSocket. Os componentes só conhecem os contratos de `src/api/contracts.ts`.
- **O mesmo código roda em desenvolvimento, demonstração e testes**: `VITE_ENABLE_MOCKS` liga a camada; `import('@/mocks')` é dinâmico, então um build sem mocks não a inclui.
- **REST e Socket.IO nascem da mesma mutação**: `db.ts` publica em `bus.ts` sempre que NFTs/pedidos mudam; o servidor Socket.IO simulado assina o bus. Assim `GET /nfts/:id` e o evento `nft.updated` nunca divergem.

## 2. Roteamento (TanStack Router)

- Rotas em código (`src/router.tsx`). Search params do catálogo (`q, category, network, min, max, available, sort, page`) são validados em `validateSearch` e serializados como `?category=art,music&page=2` (parser/stringifier próprios para URLs limpas). A URL é a **única** fonte do estado de busca: refresh, links e voltar/avançar restauram a tela; mudar um filtro remove `page`.
- A busca digitada usa debounce de 350 ms e `replace` (não polui o histórico); filtros discretos usam `push`.
- Rotas privadas ficam sob a rota de layout `_auth` (`beforeLoad`): sem sessão → `/login?redirect=<destino>`. `redirect` só aceita caminhos internos (sem open redirect).
- A sessão é resolvida em `beforeLoad` da raiz antes de qualquer tela; `pendingMs: 0` evita atraso artificial.
- `loader`s apenas **pré-buscam** (`prefetchQuery`, sem `await`): a tela abre imediatamente com skeleton enquanto a consulta já está em voo. `defaultPreload: 'intent'` pré-busca ao focar/passar o mouse.
- 404 (`notFoundComponent`), erros de rota (`errorComponent`) e acesso direto a qualquer tela são tratados; no deploy, o fallback SPA está em `vercel.json`/`_redirects`.

## 3. Estado remoto e política de cache (TanStack Query)

Chaves e dados privados:

| Chave | Conteúdo |
| --- | --- |
| `['session']` | usuário atual (ou `null`) |
| `['nfts','list', <params>]`, `['nfts','detail', id]`, `['nfts','featured']` | catálogo (público); **os parâmetros fazem parte da chave** |
| `['u', <userId｜'guest'>, ...]` | tudo que é privado: `cart`, `quote/<rede>`, `favorites`, `orders/...`, `profile`, `wallets` |

Política (`src/api/query-client.ts`):

- `staleTime` 30 s (catálogo), 0 para carrinho/cotação/pedidos, 5 min para sessão; `gcTime` 5 min; revalida ao recuperar foco/rede.
- **Retries**: leituras até 2 vezes, backoff exponencial (500 ms → 4 s), **somente** para falhas transitórias (rede, timeout, 5xx, 429). 4xx nunca é repetido. Mutations não têm retry automático — exceto a criação de pedido, que repete só quando o resultado é desconhecido (timeout/rede) **reutilizando a mesma `Idempotency-Key`**.
- **Respostas fora de ordem / obsoletas**: cada combinação de parâmetros é uma chave; uma resposta antiga só preenche a sua própria chave, nunca a lista atual. `keepPreviousData` mantém a lista antiga esmaecida (`aria-busy`) enquanto a nova carrega. O Axios recebe o `AbortSignal` do Query, então consultas descartadas são canceladas.
- **Estados**: carregamento (skeleton com as mesmas dimensões do conteúdo), vazio, erro com “Tentar novamente”, sucesso e atualização em segundo plano (indicador “Atualizando…”; erro em background mantém os dados e mostra aviso).
- **Atualização otimista com rollback** em favoritos e na quantidade/remoção do carrinho (`onMutate` → snapshot → `onError` restaura → `onSettled` revalida). Em favoritos só a última mutation em voo revalida, evitando que respostas fora de ordem pisem no estado final.
- **Invalidação**: mutations atualizam o cache com a resposta e invalidam a cotação; eventos `nft.updated` invalidam carrinho/cotação quando o NFT está no carrinho; `order.updated` confirmado invalida carrinho/cotação.
- **Isolamento por usuário**: no logout, expiração ou troca de usuário todo `['u', …]` é cancelado e removido (`purgePrivateData`); o `RealtimeProvider` recria a conexão com a nova credencial.

## 4. Sessão

- `POST /auth/login|signup` devolve token opaco (30 min). O cliente guarda `{token, expiresAt, user}` em `localStorage` (`jg.session`); **senhas não são guardadas** (no “servidor” simulado: PBKDF2-SHA256, sal por usuário).
- Recuperação após refresh: `GET /session`. 401 → limpa credenciais e segue como visitante; falha transitória → mantém o usuário guardado (modo degradado), as chamadas seguintes mostram o erro real.
- **Expiração**: o interceptor do Axios detecta 401 `SESSION_EXPIRED/UNAUTHENTICATED` (com token enviado) e chama o gerenciador de sessão (uma vez): limpa credenciais e cache privado, avisa por toast e, se a rota é privada, vai para `/login?redirect=<href>&reason=expired`. Durante o checkout o rascunho do formulário (por usuário) é preservado e a compra é retomada após novo login em `/checkout?step=review`. Não há refresh token (limitação documentada).
- **Logout/troca de usuário**: invalida o token no servidor, limpa cache privado, rascunhos e chaves de idempotência, descarta o carrinho de visitante e recria o socket. Rascunhos de outros usuários são apagados no login.

## 5. Carrinho

- Dono: usuário autenticado **ou** visitante (`X-Cart-Token`, UUID criado na primeira adição). Persistem no servidor simulado → sobrevivem a refresh.
- Ao autenticar, `POST /cart/merge` mescla o carrinho de visitante no da conta (somando quantidades limitadas ao estoque e mantendo cupom) e o carrinho anônimo é descartado.
- Limite por linha = `min(estoque da edição, 10)`; adicionar acima devolve `409 AVAILABILITY_CONFLICT` e a UI mostra a mensagem. A página de detalhe já considera o que está no carrinho.
- Resumo (subtotal, desconto, taxa de rede, total) vem **sempre** da cotação da API (`GET /cart/quote`); o cliente não soma valores. Linhas esgotadas/insuficientes bloqueiam “Finalizar compra”.
- Após a compra confirmada, o servidor remove do carrinho **apenas** os itens/quantidades comprados.

## 6. Checkout, cotação e idempotência

1. **Detalhes** (colecionador, rede, carteira — conexão simulada via API) → **Revisão** (`?step=review`, protegida contra refresh com dados inválidos).
2. Ao entrar na revisão, guardamos a cotação revisada (`fingerprint`). Se a cotação atual divergir (evento em tempo real ou refetch), aparece um aviso, o aceite é desmarcado e **o botão fica desabilitado** até o usuário “aceitar os novos valores” e confirmar de novo.
3. O pedido é enviado com `quoteFingerprint`; o servidor recalcula preço/estoque/cupom/taxa. Divergência → `409 QUOTE_CHANGED` (com a nova cotação, aplicada ao cache) ou `409 AVAILABILITY_CONFLICT`.
4. **Idempotência**: a chave (UUID) é guardada por usuário junto do conteúdo canônico do pedido; reenvios do mesmo conteúdo reutilizam a chave (mesmo após refresh); o servidor devolve o mesmo pedido (`Idempotent-Replayed`). Chave reutilizada com conteúdo diferente → `409`. Cliques repetidos são bloqueados por trava síncrona + botão em `loading`.
5. Pedido nasce `pending` e é resolvido (`confirmed`/`declined`) pelo servidor simulado; a UI muda por `order.updated`. Se o socket cair, a página consulta a REST a cada 3 s (fallback) e reconcilia ao reconectar. Ao abrir `/checkout` com um pedido pendente, o usuário é levado ao pedido em vez de criar outro. A confirmação só aparece para `confirmed`.

## 7. Tempo real e reconciliação REST × Socket.IO

- **Transporte**: `socket.io-client` com `transports: ['websocket']`, falando com o MSW por `ws.link(<origem>)` + `@mswjs/socket.io-binding`. O MSW remove o prefixo `/socket.io/` da URL ao casar handlers, por isso o link é por origem (o HMR do Vite foi movido para a porta 24678 para não ser interceptado).
- **Limitações do binding (e como foram contornadas em `src/mocks/realtime.ts`)**: não expõe o `auth` do handshake (lemos o pacote `40{…}` do cliente); não envia ping do servidor (enviamos pings Engine.IO `2` a cada 10 s, senão o cliente derruba por timeout em ~30 s); não tem rooms/broadcast (mantemos um registro de conexões e entregamos por usuário); só WebSocket (sem long-polling). `socket.io-client` precisa ser avaliado **depois** do patch de `WebSocket` do MSW, por isso é importado sob demanda no `RealtimeProvider` e fica num chunk separado dos parsers.
- **Eventos** (`nft.updated`, `order.updated`) carregam `id`, `resource`, `version`, `occurredAt`; `order.updated` carrega `userId`. O processador (`src/realtime/processor.ts`): valida com zod; deduplica por `id`; descarta `version` ≤ conhecida (compara com o cache REST); ignora eventos de outro usuário; nunca regride estados terminais; só dispara efeitos (toast, aviso no carrinho, invalidação) quando o evento é aplicado.
- **Reconexão**: ao reconectar, `invalidateQueries` (somente consultas ativas) em `['nfts']` e `['u', scope]` — a REST é a fonte da verdade, cobrindo eventos perdidos.
- **Ciclo de vida**: uma conexão por sessão; no logout/troca de usuário o provider remove todos os listeners, desconecta e recria o socket com o novo token. `window.__realtime` (só em builds com controles) expõe contagem de sockets/listeners para os testes.
- **Acessibilidade**: mudanças em tempo real são anunciadas em uma região `role="status"` e por toast; o carrinho exibe um aviso persistente com o que mudou.

## 8. MSW: cenários, persistência e reset

- Cenários são **configuração** (`src/mocks/scenarios.ts`): latência (determinística), falhas por rota (`times`, antes/depois do handler), resolução de pedidos, pagamento, conexão de carteira. Contadores de falhas “uma vez” persistem no banco (sobrevivem a refresh; zeram no reset).
- Banco em memória + `localStorage` (`jg.mock.db`, com versão de schema). `reset` restaura a semente integralmente. Resolução “preguiçosa” de pedidos (ao consultar, se o horário já passou) cobre timers perdidos em refresh.
- Fixtures: 60 NFTs gerados de forma determinística (`scripts/generate-assets.mjs`) + overrides para casos de teste (esgotado, estoque 1/3, preço com muitas casas, etc.), 2 usuários, carteiras, pedidos semente.

## 9. Interface e acessibilidade

- shadcn/ui: componentes copiados para `src/components/ui/` sobre Radix (Dialog/Sheet, Dropdown, Select, Checkbox, Radio, Switch, Avatar), adaptados aos tokens do projeto.
- Skeletons com shimmer (`.skeleton`) com as **mesmas dimensões** do conteúdo (catálogo, detalhe, resumo do carrinho, perfil, carteiras, pedido); `prefers-reduced-motion` remove a animação.
- Teclado e foco: link “Ir para o conteúdo”, foco visível global, foco movido para `<main>` a cada troca de rota, diálogos/drawers com foco preso e devolvido ao elemento que os abriu (inclusive os abertos por estado), Esc fecha.
- Formulários: `<label>` associado, `aria-invalid`, erro ligado por `aria-describedby` com `role="alert"` e ícone + texto (não só cor); erros da API são mapeados por campo.
- Feedback de mutations/tempo real em região live; imagens com `alt` descritivo (gerado junto da arte); contraste AA nos tokens.
- Verificado com axe (WCAG 2.0/2.1 A/AA) em todas as telas nos testes E2E e com Lighthouse (Accessibility 100).

## 10. Desvios do Figma e substituições de assets

- **O arquivo do Figma não pôde ser acessado** durante a implementação (o ambiente bloqueia `figma.com`). A identidade visual foi reconstruída a partir do enunciado e de uma **imagem de referência** fornecida (tema escuro quente, acento cobre, tipografia monoespaçada, hero com destaque, sidebar de categorias com contagens, cards com imagem em painel). Espaçamentos, proporções e composição das telas podem divergir do arquivo original; os tokens estão concentrados em `src/index.css` (`@theme`) para facilitar o ajuste fino quando o arquivo estiver disponível.
- **Artes**: não havia assets do arquivo; as imagens dos NFTs e avatares são **SVGs gerados proceduralmente** (`npm run generate:assets`), versionados em `public/`. Cada NFT tem 3 imagens (galeria) com `alt` descritivo.
- Fonte: JetBrains Mono (variável, `@fontsource-variable`), servida localmente.
- Telas sem frame (perfil, carteiras, confirmação, login/cadastro) seguem o mesmo padrão visual e são responsivas.
- Links/ações fora do escopo (Criadores, Aprenda, suporte, explorador de blocos) **foram omitidos** em vez de simular sucesso; o hash da transação é copiável e identificado como simulado.

## 11. Limitações conhecidas

- A “blockchain”, carteiras e pagamentos são simulações; tokens de sessão são opacos e não há refresh token.
- O banco simulado vive em `localStorage` (≈ 5 MB; avatares são reduzidos a 256 px antes do upload). Duas abas compartilham o mesmo banco, mas os timers de resolução de pedidos pertencem à aba que criou o pedido (a resolução preguiçosa cobre o resto).
- O servidor Socket.IO simulado só aceita WebSocket e um namespace; não há rooms reais.
- Desempenho: a camada MSW (~100 KB gzip) faz parte do build de demonstração por exigência do desafio e pesa no carregamento em mobile (ver §12).
