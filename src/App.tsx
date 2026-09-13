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
    <div className="glass rounded-2xl border-dashed p-10 text-center">
      <p className="text-sm text-dough-muted">{message}</p>
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
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-dough-border/50">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <img
              src="/favicon-doughboard.png"
              alt=""
              className="w-8 h-8 rounded-xl ring-1 ring-dough-border shadow-[0_0_18px_rgba(245,158,11,.25)]"
            />
            <span className="text-lg font-bold tracking-tight">Doughboard</span>
          </div>
          <WalletButton />
        </div>
      </header>

      <nav className="sticky top-0 z-10 border-b border-dough-border/30 bg-dough-950/70 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="glass flex gap-1 rounded-full p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  tab === t.id
                    ? 'bg-amber-400 text-dough-950 shadow-[0_0_20px_rgba(245,158,11,.35)]'
                    : 'text-dough-muted hover:bg-amber-400/10 hover:text-amber-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-2xl w-full mx-auto px-4 py-6 flex-1">
        {tab === 'portfolio' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                value={viewInput}
                onChange={(e) => setViewInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleView()}
                placeholder="Paste any wallet address to view its portfolio…"
                className="glass flex-1 rounded-xl px-4 py-2.5 text-sm font-mono outline-none transition focus:border-amber-400/60 focus:shadow-[0_0_18px_rgba(245,158,11,.15)] min-w-0"
              />
              <button
                onClick={handleView}
                disabled={!isPubkey(viewInput.trim())}
                className="shrink-0 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-dough-950 shadow-[0_0_20px_rgba(245,158,11,.25)] transition hover:bg-amber-300 disabled:opacity-40 disabled:shadow-none"
              >
                View
              </button>
              {connected && !isOwnWallet && (
                <button
                  onClick={handleViewOwn}
                  className="glass shrink-0 rounded-xl px-4 py-2.5 text-sm text-amber-200 transition hover:border-amber-400/60 hover:shadow-[0_0_18px_rgba(245,158,11,.15)]"
                >
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

      <footer className="border-t border-dough-border/40">
        <div className="max-w-2xl mx-auto px-4 py-6 flex items-center justify-between text-xs text-dough-muted">
          <span className="font-semibold text-amber-300/80">Doughboard</span>
          <div className="flex gap-5">
            <a
              href="https://cookiescan.io"
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-amber-200"
            >
              Cookiescan ↗
            </a>
            <a
              href="https://hyperlane.cookiescan.io"
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-amber-200"
            >
              Bridge ↗
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
