// Cookiebox DEX aggregator (agg.cookiebox.app) — routes across every Cookie Chain DEX venue.
// Switched from the Candy Shop aggregator (swap.cookiescan.io) after confirming the latter
// blocks direct browser calls (no Access-Control-Allow-Origin header). Cookiebox's API is
// called directly from the browser in other live Cookie Chain apps with no proxy involved,
// which is the strongest signal available that it's CORS-open — confirmed by our own testing
// once this shipped.
import { VersionedTransaction, type Connection } from '@solana/web3.js'
import { explainError, withTimeout, WRONG_NETWORK_HINT, type TxStatus } from './txs'

export const AGG_API = 'https://agg.cookiebox.app'
export const DEFAULT_SLIPPAGE_BPS = 500 // 5% — matches every other Cookie Chain app we found tuned for this

export interface RouteSegment {
  pool: string
  venue: string
  inputMint: string
  outputMint: string
  inAmount: string
  outAmount: string
  percentage: number
  hopIndex: number
}

export interface Route {
  inAmount: string
  outAmount: string
  feePct: number
  feeAmount: string
  netOutAmount: string
  minOutAmount: string
  priceImpactPct: number
  path: string[]
  isSplit: boolean
  isMultiHop: boolean
  segments: RouteSegment[]
}

interface SwapTxResponse {
  transactionBase64: string
  blockhash: string
  lastValidBlockHeight: number
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    let msg = `Cookiebox ${res.status}`
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) msg = body.error
    } catch {
      /* body wasn't JSON, keep the generic message */
    }
    throw new Error(res.status === 404 ? 'No route found for this pair.' : msg)
  }
  return res.json() as Promise<T>
}

/** amount is the raw integer input amount (already scaled by input token decimals). */
export async function fetchQuote(
  inputMint: string,
  outputMint: string,
  amount: string,
  slippageBps: number = DEFAULT_SLIPPAGE_BPS,
  owner?: string,
): Promise<Route> {
  const q = new URLSearchParams({ inputMint, outputMint, amount, slippageBps: String(slippageBps) })
  if (owner) q.set('owner', owner)
  const r = await fetchJson<{ route: Route }>(`${AGG_API}/quote?${q}`)
  return r.route
}

async function fetchSwapTx(params: {
  inputMint: string
  outputMint: string
  amount: string
  slippageBps: number
  owner: string
}): Promise<SwapTxResponse> {
  return fetchJson<SwapTxResponse>(`${AGG_API}/swap-tx`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  })
}

export interface SwapSigner {
  publicKey: { toBase58(): string }
  signTransaction<T extends VersionedTransaction>(tx: T): Promise<T>
}

export interface SwapResult {
  signature: string
  route: Route
}

export interface RunSwapOptions {
  connection: Connection
  signer: SwapSigner
  inputMint: string
  outputMint: string
  amountRaw: string
  slippageBps?: number
  onStage?: (stage: TxStatus | 'building') => void
}

const SIGN_TIMEOUT_MS = 120_000

/** Quote -> build (server returns the blockhash it built against) -> simulate -> sign -> send -> confirm. */
export async function runSwap({
  connection,
  signer,
  inputMint,
  outputMint,
  amountRaw,
  slippageBps = DEFAULT_SLIPPAGE_BPS,
  onStage,
}: RunSwapOptions): Promise<SwapResult> {
  const set = (s: TxStatus | 'building') => onStage?.(s)
  const owner = signer.publicKey.toBase58()

  set('building')
  const route = await fetchQuote(inputMint, outputMint, amountRaw, slippageBps, owner)
  const built = await fetchSwapTx({ inputMint, outputMint, amount: amountRaw, slippageBps, owner })
  const tx = VersionedTransaction.deserialize(Uint8Array.from(atob(built.transactionBase64), (c) => c.charCodeAt(0)))

  try {
    const sim = await connection.simulateTransaction(tx, { replaceRecentBlockhash: true, sigVerify: false, commitment: 'confirmed' })
    if (sim.value.err) {
      const tail = sim.value.logs?.slice(-3).join(' | ')
      throw new Error(`Swap simulation failed${tail ? `: ${tail}` : ''} — the route may be stale, try again.`)
    }
  } catch (e) {
    set('failed')
    throw e instanceof Error ? e : new Error(String(e))
  }

  try {
    set('signing')
    const signed = await withTimeout(signer.signTransaction(tx), SIGN_TIMEOUT_MS, WRONG_NETWORK_HINT)

    set('sending')
    const signature = await connection.sendRawTransaction(signed.serialize(), { maxRetries: 3 })

    set('confirming')
    const res = await connection.confirmTransaction(
      { signature, blockhash: built.blockhash, lastValidBlockHeight: built.lastValidBlockHeight },
      'confirmed',
    )
    if (res.value.err) throw new Error(`On-chain error: ${JSON.stringify(res.value.err)}`)

    set('confirmed')
    return { signature, route }
  } catch (e) {
    set('failed')
    throw new Error(explainError(e))
  }
}
