import { useEffect, useMemo, useState } from 'react'
import { loadRegistry, type TokenInfo } from '../lib/tokens'
import { fmtUsd } from '../lib/format'

type SortKey = 'marketCap' | 'liquidity' | 'change24h'

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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search token…"
          className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm flex-1 min-w-0"
        />
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="bg-neutral-900 border border-neutral-800 rounded-lg text-xs px-2 py-2"
        >
          <option value="marketCap">Market cap</option>
          <option value="liquidity">Liquidity</option>
          <option value="change24h">24h change</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-400">Couldn't load markets: {error}</p>}
      {!tokens && !error && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-8 text-center text-sm text-neutral-500">
          Loading markets…
        </div>
      )}
      {tokens && rows.length === 0 && <p className="text-sm text-neutral-500">No tokens match.</p>}

      {rows.length > 0 && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
          {rows.map((t, i) => (
            <div
              key={t.mint}
              onClick={() => onPick(t.mint)}
              className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-neutral-800/60 ${i > 0 ? 'border-t border-neutral-800' : ''}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {t.logo ? (
                  <img
                    src={t.logo}
                    alt=""
                    className="w-8 h-8 rounded-full shrink-0"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-neutral-800 shrink-0 flex items-center justify-center text-xs text-neutral-500">
                    {t.symbol.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-medium truncate">{t.symbol}</div>
                  <div className="text-xs text-neutral-500 truncate max-w-[10rem]">{t.name}</div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-medium">{fmtUsd(t.priceUsd)}</div>
                <div className={`text-xs ${t.change24h === undefined ? 'text-neutral-500' : t.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {t.change24h === undefined ? '—' : `${t.change24h >= 0 ? '+' : ''}${t.change24h.toFixed(1)}%`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
