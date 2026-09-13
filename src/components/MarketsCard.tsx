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
          className="glass rounded-xl px-4 py-2.5 text-sm outline-none transition focus:border-amber-400/60 focus:shadow-[0_0_18px_rgba(245,158,11,.15)] flex-1 min-w-0"
        />
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="glass rounded-full text-xs px-3 py-2.5 text-dough-muted outline-none transition hover:border-amber-400/50"
        >
          <option value="marketCap">Market cap</option>
          <option value="liquidity">Liquidity</option>
          <option value="change24h">24h change</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-400">Couldn't load markets: {error}</p>}
      {!tokens && !error && (
        <div className="glass rounded-2xl p-8 text-center text-sm text-dough-muted">Loading markets…</div>
      )}
      {tokens && rows.length === 0 && <p className="text-sm text-dough-muted">No tokens match.</p>}

      {rows.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(245,158,11,.06)]">
          {rows.map((t, i) => (
            <div
              key={t.mint}
              onClick={() => onPick(t.mint)}
              className={`flex items-center justify-between px-4 py-3 cursor-pointer transition hover:bg-amber-400/5 ${i > 0 ? 'border-t border-dough-border/50' : ''}`}
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
                  <div className="w-8 h-8 rounded-full bg-amber-400/10 shrink-0 flex items-center justify-center text-xs text-amber-300/70">
                    {t.symbol.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-medium truncate">{t.symbol}</div>
                  <div className="text-xs text-dough-muted truncate max-w-40">{t.name}</div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-medium">{fmtUsd(t.priceUsd)}</div>
                <div className={`text-xs ${t.change24h === undefined ? 'text-dough-muted' : t.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
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
