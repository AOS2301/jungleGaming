import { http } from 'msw'
import { getDb } from '../db'
import { parseListParams, queryNfts } from '../domain'
import { getScenario } from '../scenarios'
import { json, notFound, resolver } from '../http'

export const nftHandlers = [
  http.get(
    '*/api/nfts/featured',
    resolver(() => {
      const items = getScenario().catalog === 'empty' ? [] : getDb().nfts.filter((n) => n.featured)
      return json({ items })
    }),
  ),
  http.get(
    '*/api/nfts/:id',
    resolver(({ params }) => {
      const nft = getScenario().catalog === 'empty' ? undefined : getDb().nfts.find((n) => n.id === params.id)
      return nft ? json(nft) : notFound('NFT')
    }),
  ),
  http.get(
    '*/api/nfts',
    resolver(({ request }) => json(queryNfts(parseListParams(new URL(request.url))))),
  ),
]
