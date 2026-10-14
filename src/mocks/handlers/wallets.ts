import { http } from 'msw'
import { connectWalletSchema, walletFormSchema, type Wallet } from '@/api/contracts'
import { commit, getDb, nextId, nowIso, type DbWallet } from '../db'
import { getScenario } from '../scenarios'
import { apiError, authenticate, json, notFound, parseBody, resolver } from '../http'
import { delay } from 'msw'

const serialize = (w: DbWallet): Wallet => ({
  id: w.id,
  slot: w.slot,
  label: w.label,
  address: w.address,
  provider: w.provider,
  preferredNetwork: w.preferredNetwork,
  connection: w.connection,
})

export const walletHandlers = [
  http.get(
    '*/api/wallets',
    resolver(({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const items = getDb()
        .wallets.filter((w) => w.userId === auth.user.id)
        .sort((a, b) => a.slot.localeCompare(b.slot))
        .map(serialize)
      return json({ items })
    }),
  ),

  http.post(
    '*/api/wallets',
    resolver(async ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const parsed = await parseBody(request, walletFormSchema)
      if ('response' in parsed) return parsed.response
      const d = getDb()
      const form = parsed.data
      if (d.wallets.some((w) => w.userId === auth.user.id && w.slot === form.slot)) {
        return apiError(409, 'WALLET_SLOT_TAKEN', 'Você já possui uma carteira neste slot.', { fields: { slot: 'Slot já utilizado' } })
      }
      if (d.wallets.some((w) => w.address.toLowerCase() === form.address.toLowerCase())) {
        return apiError(409, 'WALLET_ADDRESS_IN_USE', 'Este endereço já está cadastrado.', { fields: { address: 'Este endereço já está cadastrado' } })
      }
      const wallet: DbWallet = { id: nextId('wal'), userId: auth.user.id, ...form, connection: null }
      d.wallets.push(wallet)
      commit()
      return json(serialize(wallet), 201)
    }),
  ),

  http.put(
    '*/api/wallets/:id',
    resolver(async ({ request, params }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const d = getDb()
      const wallet = d.wallets.find((w) => w.id === params.id)
      if (!wallet) return notFound('Carteira')
      if (wallet.userId !== auth.user.id) return apiError(403, 'FORBIDDEN', 'Esta carteira pertence a outro usuário.')
      const parsed = await parseBody(request, walletFormSchema)
      if ('response' in parsed) return parsed.response
      const form = parsed.data
      if (form.slot !== wallet.slot) return apiError(422, 'VALIDATION_FAILED', 'O slot da carteira não pode ser alterado.', { fields: { slot: 'O slot não pode ser alterado' } })
      if (d.wallets.some((w) => w.id !== wallet.id && w.address.toLowerCase() === form.address.toLowerCase())) {
        return apiError(409, 'WALLET_ADDRESS_IN_USE', 'Este endereço já está cadastrado.', { fields: { address: 'Este endereço já está cadastrado' } })
      }
      if (wallet.address.toLowerCase() !== form.address.toLowerCase()) wallet.connection = null
      Object.assign(wallet, form)
      commit()
      return json(serialize(wallet))
    }),
  ),

  http.post(
    '*/api/wallets/:id/connect',
    resolver(async ({ request, params }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const wallet = getDb().wallets.find((w) => w.id === params.id)
      if (!wallet) return notFound('Carteira')
      if (wallet.userId !== auth.user.id) return apiError(403, 'FORBIDDEN', 'Esta carteira pertence a outro usuário.')
      const parsed = await parseBody(request, connectWalletSchema)
      if ('response' in parsed) return parsed.response
      await delay(getScenario().latency.maxMs > 0 ? 500 : 0) // "aprovação" na extensão
      if (getScenario().walletConnection === 'reject') {
        return apiError(403, 'WALLET_CONNECTION_REJECTED', 'A conexão foi recusada na carteira. Tente novamente.')
      }
      wallet.connection = { network: parsed.data.network, connectedAt: nowIso() }
      commit()
      return json(serialize(wallet))
    }),
  ),

  http.post(
    '*/api/wallets/:id/disconnect',
    resolver(({ request, params }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const wallet = getDb().wallets.find((w) => w.id === params.id)
      if (!wallet) return notFound('Carteira')
      if (wallet.userId !== auth.user.id) return apiError(403, 'FORBIDDEN', 'Esta carteira pertence a outro usuário.')
      wallet.connection = null
      commit()
      return json(serialize(wallet))
    }),
  ),
]
