import { useEffect, useRef, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { WalletReadyState } from '@solana/wallet-adapter-base'
import { shortAddr, fmtAmount } from '../lib/format'
import { COOK_DECIMALS, addressUrl } from '../lib/chain'

/** Connect menu over the Wallet Standard: every installed wallet shows up, Nightly first. */
export function WalletButton() {
  const { wallets, select, connect, disconnect, publicKey, connecting, wallet } = useWallet()
  const { connection } = useConnection()
  const [open, setOpen] = useState(false)
  const [balance, setBalance] = useState<bigint | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (!publicKey) {
      setBalance(null)
      return
    }
    let stop = false
    const load = () =>
      connection
        .getBalance(publicKey)
        .then((b) => !stop && setBalance(BigInt(b)))
        .catch(() => {})
    load()
    const id = setInterval(load, 15_000)
    return () => {
      stop = true
      clearInterval(id)
    }
  }, [publicKey, connection])

  const installed = wallets
    .filter((w) => w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable)
    .sort((a, b) => (a.adapter.name === 'Nightly' ? -1 : b.adapter.name === 'Nightly' ? 1 : 0))

  if (publicKey) {
    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="glass flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition hover:border-amber-400/60 hover:shadow-[0_0_16px_rgba(245,158,11,.18)]"
        >
          {wallet?.adapter.icon && <img src={wallet.adapter.icon} alt="" width={18} height={18} className="rounded" />}
          <span className="font-mono text-amber-100">{shortAddr(publicKey.toBase58())}</span>
          {balance !== null && <span className="text-dough-muted font-mono tabular-nums">{fmtAmount(balance, COOK_DECIMALS, true)} COOK</span>}
        </button>
        {open && (
          <div className="glass absolute right-0 mt-2 w-52 rounded-xl p-1.5 text-sm shadow-2xl shadow-black/60">
            <button
              className="w-full rounded-lg px-3 py-2 text-left transition hover:bg-amber-400/10 hover:text-amber-200"
              onClick={() => {
                navigator.clipboard.writeText(publicKey.toBase58())
                setOpen(false)
              }}
            >
              Copy address
            </button>
            <button
              className="w-full rounded-lg px-3 py-2 text-left transition hover:bg-amber-400/10 hover:text-amber-200"
              onClick={() => window.open(addressUrl(publicKey.toBase58()), '_blank')}
            >
              View on Cookiescan
            </button>
            <button
              className="w-full rounded-lg px-3 py-2 text-left text-red-400 transition hover:bg-red-400/10"
              onClick={() => {
                disconnect()
                setOpen(false)
              }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button
        disabled={connecting}
        onClick={() => setOpen((o) => !o)}
        className="rounded-xl border border-amber-400/70 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-300 shadow-[0_0_22px_rgba(245,158,11,.22)] transition hover:bg-amber-400/20 hover:shadow-[0_0_30px_rgba(245,158,11,.35)] disabled:opacity-60"
      >
        {connecting ? 'Connecting…' : 'Connect wallet'}
      </button>
      {open && (
        <div className="glass absolute right-0 mt-2 w-56 rounded-xl p-1.5 text-sm shadow-2xl shadow-black/60">
          {installed.length === 0 && (
            <button
              className="w-full rounded-lg px-3 py-2 text-left transition hover:bg-amber-400/10 hover:text-amber-200"
              onClick={() => window.open('https://nightly.app', '_blank')}
            >
              No wallet found — install Nightly
            </button>
          )}
          {installed.map((w) => (
            <button
              key={w.adapter.name}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-amber-400/10 hover:text-amber-200"
              onClick={async () => {
                setOpen(false)
                select(w.adapter.name)
                setTimeout(() => connect().catch(() => {}), 0)
              }}
            >
              <img src={w.adapter.icon} alt="" width={16} height={16} />
              {w.adapter.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
