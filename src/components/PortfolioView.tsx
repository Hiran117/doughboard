import type { PublicKey } from '@solana/web3.js'
import type { Connection } from '@solana/web3.js'
import { usePortfolio } from '../lib/portfolio'
import { fmtAmount, fmtUsd, shortAddr } from '../lib/format'
import { addressUrl } from '../lib/chain'

export function PortfolioView({ connection, publicKey }: { connection: Connection; publicKey: PublicKey }) {
  const { rows, totalUsd, loading, error } = usePortfolio(connection, publicKey)

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl px-5 py-4 flex items-end justify-between shadow-[0_0_40px_rgba(245,158,11,.06)]">
        <div>
          <div className="text-xs uppercase tracking-wider text-dough-muted">Total portfolio value</div>
          <div className="text-3xl font-semibold tracking-tight mt-1">
            {totalUsd !== undefined ? fmtUsd(totalUsd) : loading ? '…' : '—'}
          </div>
        </div>
        <a
          href={addressUrl(publicKey.toBase58())}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-dough-muted hover:text-amber-300 font-mono transition"
        >
          {shortAddr(publicKey.toBase58())} ↗
        </a>
      </div>

      {loading && (
        <div className="glass rounded-2xl p-8 text-center text-sm text-dough-muted">Loading balances…</div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          Couldn't load portfolio: {error}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="glass rounded-2xl border-dashed p-8 text-center">
          <p className="text-sm text-dough-muted">No token balances yet.</p>
          <p className="text-xs text-dough-muted/60 mt-1">Bridge COOK from Solana to get started.</p>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(245,158,11,.06)]">
          {rows.map((r, i) => (
            <div
              key={r.mint}
              className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-dough-border/50' : ''}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {r.logo ? (
                  <img
                    src={r.logo}
                    alt=""
                    className="w-8 h-8 rounded-full shrink-0"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-amber-400/10 shrink-0 flex items-center justify-center text-xs text-amber-300/70">
                    {r.symbol.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.symbol}</div>
                  <div className="text-xs text-dough-muted truncate">{fmtAmount(r.amount, r.decimals, true)}</div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-medium">{r.valueUsd !== undefined ? fmtUsd(r.valueUsd) : '—'}</div>
                <div className="text-xs text-dough-muted">{fmtUsd(r.priceUsd)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}