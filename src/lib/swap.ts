// Candy Shop aggregator (swap.cookiescan.io/api) — routes across all Cookie Chain DEX liquidity.
// Reference flow adapted from the official cookie-mcp implementation (github.com/cookiechain/cookie-mcp,
// src/core/candyshop.ts + trade.ts), swapped from a local Keypair to browser wallet signing.
// Flow: quote -> buildSwapTx -> wallet signs -> submitSignedTx -> confirmTx (poll if not immediate).
import { VersionedTransaction, Transaction, type Connection } from '@solana/web3.js'

export const CANDY_SHOP_API_URL = '/api/candyshop'
// Direct upstream, kept for reference — blocked by CORS from the browser (no
// Access-Control-Allow-Origin on swap.cookiescan.io), which is why we proxy through
// our own /api/candyshop serverless function instead.
// const CANDY_SHOP_UPSTREAM = 'https://swap.cookiescan.io/api'
export const DEFAULT_SLIPPAGE_BPS = 500 // 5% — matches cookie-mcp's tuned default for this chain's liquidity

export interface RouteSegment {
  dex: string
  poolAddress: string
  inAmount: string
  outAmount: string
  priceImpactPct: number
  feeBps?: number
  programName?: string
}

export interface MultiRoute {
  segments: RouteSegment[]
  totalInAmount: string
  totalOutAmount: string
  combinedPriceImpactPct: number
  minOutAmount: string
  grossOutAmount?: string
  protocolFeeAmount?: string
  protocolFeeBps?: number
  route: string[]
  isSplit: boolean
  isMultiHop: boolean
  lowLiquidity?: boolean
}

interface QuoteResult {
  multiRoute: MultiRoute
}
interface SwapTxResult {
  transactionBase64: string
}
interface SubmitTxResult {
  signature: string
  confirmed: boolean
}
interface ConfirmTxResult {
  confirmed: boolean
  error?: string
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Candy Shop ${res.status}: ${body.slice(0, 200) || res.statusText}`)
  }
  return res.json() as Promise<T>
}

/** amount is the raw integer input amount (already scaled by input token decimals). */
export async function quoteMultiRoute(
  inputMint: string,
  outputMint: string,
  amount: string,
  slippageBps: number = DEFAULT_SLIPPAGE_BPS,
): Promise<MultiRoute> {
  const q = new URLSearchParams({ inputMint, outputMint, amount, slippageBps: String(slippageBps) })
  const r = await fetchJson<QuoteResult>(`${CANDY_SHOP_API_URL}/quote/multi-route?${q}`)
  return r.multiRoute
}

export async function buildSwapTx(multiRoute: MultiRoute, userPublicKey: string): Promise<string> {
  const r = await fetchJson<SwapTxResult>(`${CANDY_SHOP_API_URL}/swap-tx/multi-route`, {
    method: 'POST',
    body: JSON.stringify({ multiRoute, userPublicKey }),
  })
  return r.transactionBase64
}

export async function submitSignedTx(signedTransactionBase64: string): Promise<SubmitTxResult> {
  return fetchJson<SubmitTxResult>(`${CANDY_SHOP_API_URL}/submit-tx`, {
    method: 'POST',
    body: JSON.stringify({ signedTransactionBase64 }),
  })
}

export async function confirmTx(signature: string, poolAddresses: string[]): Promise<ConfirmTxResult> {
  const pools = poolAddresses.length ? `?pools=${poolAddresses.map(encodeURIComponent).join(',')}` : ''
  return fetchJson<ConfirmTxResult>(`${CANDY_SHOP_API_URL}/confirm-tx/${signature}${pools}`)
}

export function routePoolAddresses(r: MultiRoute): string[] {
  return [...new Set(r.segments.map((s) => s.poolAddress).filter(Boolean))]
}

function deserializeTx(base64: string): VersionedTransaction | Transaction {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  try {
    return VersionedTransaction.deserialize(bytes)
  } catch {
    return Transaction.from(bytes)
  }
}

export interface SwapSigner {
  publicKey: { toBase58(): string }
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>
}

export type SwapStage = 'quoting' | 'building' | 'signing' | 'submitting' | 'confirming' | 'confirmed' | 'failed'

export interface SwapResult {
  signature: string
  confirmed: boolean
  route: MultiRoute
}

export interface RunSwapOptions {
  connection: Connection
  signer: SwapSigner
  inputMint: string
  outputMint: string
  amountRaw: string
  slippageBps?: number
  onStage?: (stage: SwapStage) => void
}

/** Quote -> build -> simulate -> sign -> submit -> confirm, against the Candy Shop aggregator. */
export async function runSwap({
  connection,
  signer,
  inputMint,
  outputMint,
  amountRaw,
  slippageBps = DEFAULT_SLIPPAGE_BPS,
  onStage,
}: RunSwapOptions): Promise<SwapResult> {
  const set = (s: SwapStage) => onStage?.(s)

  set('quoting')
  const route = await quoteMultiRoute(inputMint, outputMint, amountRaw, slippageBps)

  set('building')
  const txBase64 = await buildSwapTx(route, signer.publicKey.toBase58())
  const tx = deserializeTx(txBase64)

  // Best-effort simulation so obvious failures (insufficient funds, stale route) surface before
  // asking for a signature, rather than after — mirrors cookie-mcp's own pre-sign check.
  try {
    const sim =
      tx instanceof VersionedTransaction
        ? await connection.simulateTransaction(tx, { replaceRecentBlockhash: true, sigVerify: false, commitment: 'confirmed' })
        : await connection.simulateTransaction(tx)
    if (sim.value.err) {
      const tail = sim.value.logs?.slice(-3).join(' | ')
      throw new Error(`Swap simulation failed${tail ? `: ${tail}` : ''} — the route may be stale, try again.`)
    }
  } catch (e) {
    set('failed')
    throw e instanceof Error ? e : new Error(String(e))
  }

  set('signing')
  const signed = await signer.signTransaction(tx)
  const signedBase64 = btoa(String.fromCharCode(...signed.serialize()))

  set('submitting')
  const submitted = await submitSignedTx(signedBase64)
  let confirmed = submitted.confirmed

  if (!confirmed) {
    set('confirming')
    try {
      confirmed = (await confirmTx(submitted.signature, routePoolAddresses(route))).confirmed
    } catch {
      // leave as reported by submit — signature is still valid, just unconfirmed by our poll
    }
  }

  set(confirmed ? 'confirmed' : 'failed')
  return { signature: submitted.signature, confirmed, route }
}
