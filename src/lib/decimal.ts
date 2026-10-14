/**
 * Aritmética decimal exata para valores em ETH.
 *
 * Valores trafegam como strings decimais ("0.0125") e nunca como `number`.
 * Internamente usamos BigInt com 18 casas (wei), a mesma precisão da rede.
 */
const SCALE = 18
const FACTOR = 10n ** BigInt(SCALE)

export const ETH_DECIMAL_RE = /^\d+(\.\d{1,18})?$/

export function isEthString(value: unknown): value is string {
  return typeof value === 'string' && ETH_DECIMAL_RE.test(value)
}

/** "1.5" -> 1500000000000000000n */
export function toWei(value: string): bigint {
  if (!isEthString(value)) throw new Error(`Valor decimal inválido: ${JSON.stringify(value)}`)
  const [whole = '0', frac = ''] = value.split('.')
  return BigInt(whole) * FACTOR + BigInt(frac.padEnd(SCALE, '0'))
}

/** 1500000000000000000n -> "1.5" (sem zeros à direita) */
export function fromWei(wei: bigint): string {
  const negative = wei < 0n
  const abs = negative ? -wei : wei
  const whole = abs / FACTOR
  const frac = (abs % FACTOR).toString().padStart(SCALE, '0').replace(/0+$/, '')
  return `${negative ? '-' : ''}${whole}${frac ? `.${frac}` : ''}`
}

export const ethAdd = (a: string, b: string): string => fromWei(toWei(a) + toWei(b))
export const ethSub = (a: string, b: string): string => fromWei(toWei(a) - toWei(b))
/** Multiplica por uma quantidade inteira. */
export function ethMulInt(a: string, qty: number): string {
  if (!Number.isInteger(qty) || qty < 0) throw new Error('Quantidade deve ser inteira e não negativa')
  return fromWei(toWei(a) * BigInt(qty))
}
/** Percentual com até 2 casas ("10", "7.5"); trunca na 18ª casa decimal. */
export function ethPercent(a: string, percent: string): string {
  const [whole = '0', frac = ''] = percent.split('.')
  const basisPoints = BigInt(whole) * 100n + BigInt(frac.padEnd(2, '0').slice(0, 2))
  return fromWei((toWei(a) * basisPoints) / 10000n)
}
export const ethCompare = (a: string, b: string): number => {
  const x = toWei(a)
  const y = toWei(b)
  return x < y ? -1 : x > y ? 1 : 0
}
export const ethMin = (a: string, b: string): string => (ethCompare(a, b) <= 0 ? a : b)
export const ethIsZero = (a: string): boolean => toWei(a) === 0n

/**
 * Formata para exibição preservando toda a precisão: mínimo de 2 casas,
 * separador decimal pt-BR e agrupamento de milhares. Ex.: "1.4" -> "1,40".
 */
export function formatEth(value: string, minFraction = 2): string {
  const normalized = fromWei(toWei(value))
  const [whole = '0', frac = ''] = normalized.split('.')
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const fraction = frac.padEnd(minFraction, '0')
  return fraction ? `${groupedWhole},${fraction}` : groupedWhole
}

/** Formato com símbolo para leitores de tela e UI: "1,40 ETH". */
export const formatEthWithUnit = (value: string): string => `${formatEth(value)} ETH`
