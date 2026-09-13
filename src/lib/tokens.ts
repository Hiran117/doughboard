import { COOK, COOK_DECIMALS, COOK_MINT, REGISTRY_URL } from './chain'

export interface TokenInfo {
  mint: string
  symbol: string
  name: string
  decimals: number
  logo?: string
  holderCount?: number
  verified?: boolean
  priceUsd?: number
  marketCap?: number
  liquidity?: number
  change24h?: number
}

interface RegistryRow {
  mint: string
  symbol?: string
  name?: string
  decimals?: number
  logoUri?: string
  holderCount?: number
  verified?: boolean
  hidden?: boolean
  price?: string | null
  marketCap?: string | null
  liquidity?: string | null
  change24h?: string | number | null
}

const num = (v: unknown): number | undefined =>
  v === null || v === undefined || v === '' ? undefined : Number.isFinite(Number(v)) ? Number(v) : undefined

const CID_RE = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z0-9]+)(\/.*)?$/

function resolveLogo(uri: string | undefined): string | undefined {
  if (!uri) return undefined
  if (uri.startsWith('http://') || uri.startsWith('https://')) return uri
  if (uri.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${uri.slice('ipfs://'.length)}`
  if (CID_RE.test(uri)) return `https://ipfs.io/ipfs/${uri}`
  return undefined
}

let cache: Promise<Map<string, TokenInfo>> | null = null

/** The Cookiescan token registry: metadata + live price/market data, one fetch per session. */
export function loadRegistry(): Promise<Map<string, TokenInfo>> {
  if (!cache) {
    cache = fetch(REGISTRY_URL)
      .then((r) => (r.ok ? (r.json() as Promise<RegistryRow[]>) : Promise.reject(new Error(`registry ${r.status}`))))
      .then((rows) => {
        const m = new Map<string, TokenInfo>()
        for (const r of rows) {
          if (!r.mint || r.hidden) continue
          m.set(r.mint, {
            mint: r.mint,
            symbol: r.symbol ?? '',
            name: r.name ?? '',
            decimals: r.decimals ?? 9,
            logo: resolveLogo(r.logoUri),
            holderCount: r.holderCount,
            verified: r.verified,
            priceUsd: num(r.price),
            marketCap: num(r.marketCap),
            liquidity: num(r.liquidity),
            change24h: num(r.change24h),
          })
        }
        // registry lists native COOK as wrapped under the native mint id; keep price, fix display name
        const wcook = m.get(COOK_MINT)
        m.set(COOK_MINT, {
          mint: COOK_MINT,
          symbol: COOK,
          name: 'Cookie Chain native token',
          decimals: COOK_DECIMALS,
          priceUsd: wcook?.priceUsd,
          holderCount: wcook?.holderCount,
          logo: wcook?.logo,
        })
        return m
      })
      .catch((e) => {
        cache = null
        throw e
      })
  }
  return cache
}