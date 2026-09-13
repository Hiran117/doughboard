import { useEffect, useState } from 'react'
import { PublicKey, type Connection } from '@solana/web3.js'
import { COOK, COOK_DECIMALS, COOK_MINT, TOKEN_2022_PROGRAM, TOKEN_PROGRAM } from './chain'
import { loadRegistry, type TokenInfo } from './tokens'

export interface PortfolioRow {
  mint: string
  symbol: string
  name: string
  logo?: string
  decimals: number
  amount: bigint
  priceUsd?: number
  valueUsd?: number
  isNative: boolean
}

interface ParsedTokenAccount {
  account: {
    data: {
      parsed: {
        info: {
          mint: string
          tokenAmount: { amount: string; decimals: number }
        }
      }
    }
  }
}

async function fetchSplBalances(connection: Connection, owner: PublicKey) {
  const [legacy, token2022] = await Promise.all([
    connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM }),
    connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_2022_PROGRAM }),
  ])
  const rows = [...legacy.value, ...token2022.value] as unknown as ParsedTokenAccount[]
  const byMint = new Map<string, { amount: bigint; decimals: number }>()
  for (const r of rows) {
    const info = r.account.data.parsed.info
    const amt = BigInt(info.tokenAmount.amount)
    if (amt === 0n) continue
    const existing = byMint.get(info.mint)
    byMint.set(info.mint, { amount: (existing?.amount ?? 0n) + amt, decimals: info.tokenAmount.decimals })
  }
  return byMint
}

/** Bigint -> approximate human number, precision-safe: dividing out the decimals via BigInt
 * first keeps the whole-token count (rather than the raw base-unit count) as what gets cast
 * to Number — the raw count routinely exceeds Number.MAX_SAFE_INTEGER once decimals are
 * applied, even for ordinary holdings; the whole-token count essentially never does. */
function toApproxNumber(amount: bigint, decimals: number): number {
  const divisor = 10n ** BigInt(decimals)
  const whole = amount / divisor
  const frac = amount % divisor
  return Number(whole) + Number(frac) / Number(divisor)
}

function toRow(mint: string, amount: bigint, decimals: number, registry: Map<string, TokenInfo>, isNative: boolean): PortfolioRow {
  const meta = registry.get(mint)
  const priceUsd = meta?.priceUsd
  const humanAmount = toApproxNumber(amount, decimals)
  return {
    mint,
    symbol: meta?.symbol || (isNative ? COOK : `${mint.slice(0, 4)}…`),
    name: meta?.name || 'Unknown token',
    logo: meta?.logo,
    decimals,
    amount,
    priceUsd,
    valueUsd: priceUsd !== undefined ? humanAmount * priceUsd : undefined,
    isNative,
  }
}

export interface PortfolioState {
  rows: PortfolioRow[]
  totalUsd: number | undefined
  loading: boolean
  error: string | null
}

/** Live wallet portfolio: native COOK balance + every SPL/Token-2022 holding, priced via the registry. */
export function usePortfolio(connection: Connection, owner: PublicKey | null): PortfolioState {
  const [state, setState] = useState<PortfolioState>({ rows: [], totalUsd: undefined, loading: false, error: null })

  useEffect(() => {
    if (!owner) {
      setState({ rows: [], totalUsd: undefined, loading: false, error: null })
      return
    }
    let stop = false
    setState((s) => ({ ...s, loading: true, error: null }))

    Promise.all([connection.getBalance(owner), fetchSplBalances(connection, owner), loadRegistry()])
      .then(([lamports, splMap, registry]) => {
        if (stop) return
        const rows: PortfolioRow[] = []
        if (lamports > 0) rows.push(toRow(COOK_MINT, BigInt(lamports), COOK_DECIMALS, registry, true))
        for (const [mint, { amount, decimals }] of splMap) {
          rows.push(toRow(mint, amount, decimals, registry, false))
        }
        rows.sort((a, b) => (b.valueUsd ?? -1) - (a.valueUsd ?? -1))
        const known = rows.filter((r) => r.valueUsd !== undefined)
        const totalUsd = known.length ? known.reduce((sum, r) => sum + (r.valueUsd ?? 0), 0) : undefined
        setState({ rows, totalUsd, loading: false, error: null })
      })
      .catch((e) => {
        if (!stop) setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : String(e) }))
      })

    return () => {
      stop = true
    }
  }, [connection, owner])

  return state
}
