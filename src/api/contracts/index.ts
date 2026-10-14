/**
 * Contratos REST e de eventos — fonte única de verdade (schemas zod; os tipos TypeScript vêm deles).
 * Usados pelo cliente HTTP, pelos handlers do MSW e pelo cliente Socket.IO.
 * Valores em ETH sempre trafegam como string decimal; quantidades são inteiras.
 */
export * from './common'
export * from './errors'
export * from './auth'
export * from './nfts'
export * from './favorites'
export * from './cart'
export * from './wallets'
export * from './orders'
export * from './profile'
export * from './events'
