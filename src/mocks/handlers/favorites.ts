import { http } from 'msw'
import { commit, getDb } from '../db'
import { authenticate, json, notFound, resolver } from '../http'

export const favoriteHandlers = [
  http.get(
    '*/api/favorites',
    resolver(({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      return json({ nftIds: getDb().favorites[auth.user.id] ?? [] })
    }),
  ),
  http.put(
    '*/api/favorites/:nftId',
    resolver(({ request, params }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const d = getDb()
      if (!d.nfts.some((n) => n.id === params.nftId)) return notFound('NFT')
      const list = (d.favorites[auth.user.id] ??= [])
      if (!list.includes(params.nftId!)) list.push(params.nftId!)
      commit()
      return json({ nftIds: list })
    }),
  ),
  http.delete(
    '*/api/favorites/:nftId',
    resolver(({ request, params }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const d = getDb()
      d.favorites[auth.user.id] = (d.favorites[auth.user.id] ?? []).filter((id) => id !== params.nftId)
      commit()
      return json({ nftIds: d.favorites[auth.user.id] })
    }),
  ),
]
