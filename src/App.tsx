import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from './components/WalletButton'
import { SwapCard } from './components/SwapCard'
import { usePortfolio } from './lib/portfolio'
import { fmtAmount, fmtUsd, shortAddr } from './lib/format'
import { addressUrl } from './lib/chain'
import { useState } from 'react'
import { MarketsCard } from './components/MarketsCard'

function App() {
  const { publicKey, connected } = useWallet()
  const { connection } = useConnection()
  const { rows, totalUsd, loading, error } = usePortfolio(connection, publicKey)
  const [marketPick, setMarketPick] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6">
      <header className="flex items-center justify-between max-w-5xl mx-auto mb-10">
<h1 className="text-2xl font-bold tracking-tight">🍪 Doughboard</h1>
        <WalletButton />
      </header>

      <main className="max-w-5xl mx-auto space-y-6">
        {!connected && (
          <section className="rounded-xl border border-neutral-800 p-6 bg-neutral-900">
            <p className="text-neutral-400 text-sm">
              Connect a wallet (Nightly supported) to view your portfolio, swap, and track activity on Cookie Chain.
            </p>
          </section>
        )}

        {connected && publicKey && (
          <section className="rounded-xl border border-neutral-800 p-6 bg-neutral-900">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Portfolio</h2>
                <a
                  href={addressUrl(publicKey.toBase58())}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-neutral-500 hover:text-neutral-300 font-mono"
                >
                  {shortAddr(publicKey.toBase58())} ↗
                </a>
              </div>
              {totalUsd !== undefined && (
                <div className="text-right">
                  <div className="text-xs text-neutral-500">Total value</div>
                  <div className="text-xl font-semibold">{fmtUsd(totalUsd)}</div>
                </div>
              )}
            </div>

            {loading && <p className="text-sm text-neutral-500">Loading balances…</p>}
            {error && <p className="text-sm text-red-400">Couldn't load portfolio: {error}</p>}

            {!loading && !error && rows.length === 0 && (
              <p className="text-sm text-neutral-500">No token balances found on this wallet yet.</p>
            )}

            {!loading && rows.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-neutral-500 border-b border-neutral-800">
                    <th className="py-2 font-normal">Token</th>
                    <th className="py-2 font-normal text-right">Balance</th>
                    <th className="py-2 font-normal text-right">Price</th>
                    <th className="py-2 font-normal text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.mint} className="border-b border-neutral-900">
                      <td className="py-2.5 flex items-center gap-2">
                        {r.logo && <img src={r.logo} alt="" className="w-5 h-5 rounded-full" />}
                        <div>
                          <div className="font-medium">{r.symbol}</div>
                          <div className="text-xs text-neutral-500">{r.name}</div>
                        </div>
                      </td>
                      <td className="py-2.5 text-right">{fmtAmount(r.amount, r.decimals, true)}</td>
                      <td className="py-2.5 text-right text-neutral-400">{fmtUsd(r.priceUsd)}</td>
                      <td className="py-2.5 text-right">{r.valueUsd !== undefined ? fmtUsd(r.valueUsd) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

<MarketsCard onPick={setMarketPick} />

{connected && <SwapCard key={marketPick ?? 'default'} initialOutputMint={marketPick ?? ''} />}
      </main>
    </div>
  )
}

export default App
