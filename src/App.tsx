import { useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from './components/WalletButton'
import { SwapCard } from './components/SwapCard'
import { MarketsCard } from './components/MarketsCard'
import { PortfolioView } from './components/PortfolioView'

type Tab = 'portfolio' | 'markets' | 'swap'

const TABS: { id: Tab; label: string }[] = [
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'markets', label: 'Markets' },
  { id: 'swap', label: 'Swap' },
]

function ConnectPrompt({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-900/50 p-10 text-center">
      <p className="text-sm text-neutral-400">{message}</p>
    </div>
  )
}

function App() {
  const { publicKey, connected } = useWallet()
  const { connection } = useConnection()
  const [tab, setTab] = useState<Tab>('portfolio')
  const [marketPick, setMarketPick] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-900">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <img src="/favicon-doughboard.png" alt="" className="w-7 h-7 rounded-lg" />
            <span className="text-lg font-bold tracking-tight">Doughboard</span>
          </div>
          <WalletButton />
        </div>
      </header>

      <nav className="border-b border-neutral-900 sticky top-0 bg-neutral-950/95 backdrop-blur z-10">
        <div className="max-w-2xl mx-auto flex px-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-amber-400 text-neutral-100'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {tab === 'portfolio' &&
          (connected && publicKey ? (
            <PortfolioView connection={connection} publicKey={publicKey} />
          ) : (
            <ConnectPrompt message="Connect a wallet (Nightly supported) to see your portfolio." />
          ))}

        {tab === 'markets' && (
          <MarketsCard
            onPick={(mint) => {
              setMarketPick(mint)
              setTab('swap')
            }}
          />
        )}

        {tab === 'swap' &&
          (connected ? (
            <SwapCard key={marketPick ?? 'default'} initialOutputMint={marketPick ?? ''} />
          ) : (
            <ConnectPrompt message="Connect a wallet (Nightly supported) to swap." />
          ))}
      </main>
    </div>
  )
}

export default App
