import type { PublicKey } from '@solana/web3.js'
import type { Connection } from '@solana/web3.js'
import { usePortfolio } from '../lib/portfolio'
import { fmtAmount, fmtUsd, shortAddr } from '../lib/format'
import { addressUrl } from '../lib/chain'

export function PortfolioView({ connection, publicKey }: { connection: Connection; publicKey: PublicKey }) {
  const { rows, totalUsd, loading, error } = usePortfolio(connection, publicKey)

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-sm text-neutral-500">Total portfolio value</div>
          <div className="text-3xl font-semibold tracking-tight">
            {totalUsd !== undefined ? fmtUsd(totalUsd) : loading ? '…' : '—'}
          </div>
        </div>
        <a
          href={addressUrl(publicKey.toBase58())}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-neutral-500 hover:text-neutral-300 font-mono"
        >
          {shortAddr(publicKey.toBase58())} ↗
        </a>
      </div>

      {loading && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-8 text-center text-sm text-neutral-500">
          Loading balances…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-400">
          Couldn't load portfolio: {error}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-900/50 p-8 text-center">
          <p className="text-sm text-neutral-400">No token balances yet.</p>
          <p className="text-xs text-neutral-600 mt-1">Bridge COOK from Solana to get started.</p>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
          {rows.map((r, i) => (
            <div
              key={r.mint}
              className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-neutral-800' : ''}`}
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
                  <div className="w-8 h-8 rounded-full bg-neutral-800 shrink-0 flex items-center justify-center text-xs text-neutral-500">
                    {r.symbol.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.symbol}</div>
                  <div className="text-xs text-neutral-500 truncate">{fmtAmount(r.amount, r.decimals, true)}</div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-medium">{r.valueUsd !== undefined ? fmtUsd(r.valueUsd) : '—'}</div>
                <div className="text-xs text-neutral-500">{fmtUsd(r.priceUsd)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
