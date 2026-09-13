import { useEffect, useMemo, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { WalletButton } from './components/WalletButton'
import { SwapCard } from './components/SwapCard'
import { MarketsCard } from './components/MarketsCard'
import { PortfolioView } from './components/PortfolioView'
import { isPubkey } from './lib/chain'

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

  // Any wallet is viewable read-only — via ?a=<address> in the URL, or typed in directly —
  // so a portfolio can be shared or inspected without the viewer connecting anything.
  const [viewInput, setViewInput] = useState('')
  const [viewAddress, setViewAddress] = useState<string | null>(null)

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('a')
    if (fromUrl && isPubkey(fromUrl)) {
      setViewInput(fromUrl)
      setViewAddress(fromUrl)
    }
  }, [])

  useEffect(() => {
    if (!viewAddress && connected && publicKey) setViewInput(publicKey.toBase58())
  }, [connected, publicKey, viewAddress])

  const displayedAddress = viewAddress ?? (connected ? publicKey?.toBase58() ?? null : null)
  const isOwnWallet = connected && publicKey && displayedAddress === publicKey.toBase58()
  const displayedPublicKey = useMemo(() => (displayedAddress ? new PublicKey(displayedAddress) : null), [displayedAddress])

  function handleView() {
    const trimmed = viewInput.trim()
    if (!isPubkey(trimmed)) return
    setViewAddress(trimmed)
    const url = new URL(window.location.href)
    url.searchParams.set('a', trimmed)
    window.history.replaceState({}, '', url)
  }

  function handleViewOwn() {
    if (!publicKey) return
    setViewAddress(null)
    setViewInput(publicKey.toBase58())
    const url = new URL(window.location.href)
    url.searchParams.delete('a')
    window.history.replaceState({}, '', url)
  }

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
        {tab === 'portfolio' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                value={viewInput}
                onChange={(e) => setViewInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleView()}
                placeholder="Paste any wallet address to view its portfolio…"
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm font-mono min-w-0"
              />
              <button
                onClick={handleView}
                disabled={!isPubkey(viewInput.trim())}
                className="shrink-0 rounded-lg bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700 disabled:opacity-40"
              >
                View
              </button>
              {connected && !isOwnWallet && (
                <button onClick={handleViewOwn} className="shrink-0 rounded-lg bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700">
                  My wallet
                </button>
              )}
            </div>

            {displayedPublicKey ? (
              <PortfolioView connection={connection} publicKey={displayedPublicKey} />
            ) : (
              <ConnectPrompt message="Connect a wallet, or paste any address above, to see a portfolio." />
            )}
          </div>
        )}

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
