import { useEffect, useMemo, useState } from 'react'
import { loadRegistry, type TokenInfo } from '../lib/tokens'
import { fmtUsd } from '../lib/format'

type SortKey = 'marketCap' | 'liquidity' | 'change24h'

function fmtCompactUsd(v: number | undefined): string {
  if (v === undefined || Number.isNaN(v)) return '—'
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`
  return fmtUsd(v)
}

/** A Robinhood-style browsable token list: price, 24h change, market cap, liquidity — sourced
 * entirely from the registry we already load for the portfolio and swap. Click a row to open it
 * as the receive side of the swap below. */
export function MarketsCard({ onPick }: { onPick: (mint: string) => void }) {
  const [tokens, setTokens] = useState<TokenInfo[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('marketCap')
  const [query, setQuery] = useState('')

  useEffect(() => {
    loadRegistry()
      .then((m) => setTokens([...m.values()].filter((t) => t.symbol)))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  const rows = useMemo(() => {
    if (!tokens) return []
    const q = query.trim().toLowerCase()
    const filtered = q
      ? tokens.filter((t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
      : tokens
    return [...filtered].sort((a, b) => (b[sortKey] ?? -Infinity) - (a[sortKey] ?? -Infinity)).slice(0, 25)
  }, [tokens, sortKey, query])

  return (
    <section className="rounded-xl border border-neutral-800 p-6 bg-neutral-900 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-semibold">Markets</h2>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search token…"
            className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm w-40"
          />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="bg-neutral-800 border border-neutral-700 rounded text-xs px-2 py-1.5"
          >
            <option value="marketCap">Sort: Market cap</option>
            <option value="liquidity">Sort: Liquidity</option>
            <option value="change24h">Sort: 24h change</option>
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">Couldn't load markets: {error}</p>}
      {!tokens && !error && <p className="text-sm text-neutral-500">Loading markets…</p>}
      {tokens && rows.length === 0 && <p className="text-sm text-neutral-500">No tokens match.</p>}

      {rows.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500 border-b border-neutral-800">
              <th className="py-2 font-normal">Token</th>
              <th className="py-2 font-normal text-right">Price</th>
              <th className="py-2 font-normal text-right">24h</th>
              <th className="py-2 font-normal text-right">Market cap</th>
              <th className="py-2 font-normal text-right hidden sm:table-cell">Liquidity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr
                key={t.mint}
                onClick={() => onPick(t.mint)}
                className="border-b border-neutral-900 cursor-pointer hover:bg-neutral-800/60"
              >
                <td className="py-2.5 flex items-center gap-2">
                  {t.logo && (
                    <img
                      src={t.logo}
                      alt=""
                      className="w-5 h-5 rounded-full"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  )}
                  <div>
                    <div className="font-medium">{t.symbol}</div>
                    <div className="text-xs text-neutral-500 truncate max-w-40">{t.name}</div>
                  </div>
                </td>
                <td className="py-2.5 text-right">{fmtUsd(t.priceUsd)}</td>
                <td className={`py-2.5 text-right ${t.change24h === undefined ? 'text-neutral-500' : t.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {t.change24h === undefined ? '—' : `${t.change24h >= 0 ? '+' : ''}${t.change24h.toFixed(1)}%`}
                </td>
                <td className="py-2.5 text-right text-neutral-300">{fmtCompactUsd(t.marketCap)}</td>
                <td className="py-2.5 text-right text-neutral-300 hidden sm:table-cell">{fmtCompactUsd(t.liquidity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="text-xs text-neutral-600">Tap a row to swap into that token.</p>
    </section>
  )
}