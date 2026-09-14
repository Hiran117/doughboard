import { useEffect, useMemo, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { COOK, COOK_DECIMALS, COOK_MINT, txUrl } from '../lib/chain'
import { loadRegistry, type TokenInfo } from '../lib/tokens'
import { rawToUi, uiToRaw } from '../lib/format'
import { runSwap, fetchQuote, DEFAULT_SLIPPAGE_BPS, type Route } from '../lib/swap'
import type { TxStatus } from '../lib/txs'

type Stage = TxStatus | 'building'

const STAGE_LABEL: Partial<Record<Stage, string>> = {
  building: 'Getting quote…',
  signing: 'Waiting for signature…',
  sending: 'Sending…',
  confirming: 'Confirming…',
}

export function SwapCard({ initialOutputMint = '' }: { initialOutputMint?: string }) {
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()

  const [registry, setRegistry] = useState<Map<string, TokenInfo> | null>(null)
  const [inputMint, setInputMint] = useState(COOK_MINT)
  const [outputMint, setOutputMint] = useState(initialOutputMint)
  const [amount, setAmount] = useState('')
  const [slippageBps, setSlippageBps] = useState(DEFAULT_SLIPPAGE_BPS)

  const [route, setRoute] = useState<Route | null>(null)
  const [quoting, setQuoting] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)

  const [stage, setStage] = useState<Stage | null>(null)
  const [result, setResult] = useState<{ signature: string } | null>(null)
  const [swapError, setSwapError] = useState<string | null>(null)

  useEffect(() => {
    loadRegistry()
      .then(setRegistry)
      .catch(() => setRegistry(new Map()))
  }, [])

  const inputToken = registry?.get(inputMint)
  const outputToken = outputMint ? registry?.get(outputMint) : undefined
  const inputDecimals = inputToken?.decimals ?? COOK_DECIMALS
  const outDecimals = outputToken?.decimals ?? 9

  const tokenOptions = useMemo(() => (registry ? [...registry.values()].filter((t) => t.symbol) : []), [registry])

  // Debounced live quote whenever the inputs that affect price change.
  useEffect(() => {
    setRoute(null)
    setQuoteError(null)
    if (!outputMint || !amount || Number(amount) <= 0) return
    let stop = false
    setQuoting(true)
    const t = setTimeout(() => {
      let amountRaw: string
      try {
        amountRaw = uiToRaw(amount, inputDecimals)
      } catch (e) {
        if (!stop) {
          setQuoteError(e instanceof Error ? e.message : String(e))
          setQuoting(false)
        }
        return
      }
      fetchQuote(inputMint, outputMint, amountRaw, slippageBps, publicKey?.toBase58())
        .then((r) => !stop && setRoute(r))
        .catch((e) => !stop && setQuoteError(e instanceof Error ? e.message : String(e)))
        .finally(() => !stop && setQuoting(false))
    }, 400)
    return () => {
      stop = true
      clearTimeout(t)
    }
  }, [inputMint, outputMint, amount, slippageBps, inputDecimals, publicKey])

  async function handleSwap() {
    if (!publicKey || !signTransaction || !route) return
    setSwapError(null)
    setResult(null)
    try {
      const amountRaw = uiToRaw(amount, inputDecimals)
      const res = await runSwap({
        connection,
        signer: { publicKey, signTransaction },
        inputMint,
        outputMint,
        amountRaw,
        slippageBps,
        onStage: setStage,
      })
      setResult(res)
      setAmount('')
    } catch (e) {
      setSwapError(e instanceof Error ? e.message : String(e))
    } finally {
      setStage(null)
    }
  }

  const expectedOut = route ? rawToUi(route.netOutAmount, outDecimals) : null
  const minOut = route ? rawToUi(route.minOutAmount, outDecimals) : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <select
          value={slippageBps}
          onChange={(e) => setSlippageBps(Number(e.target.value))}
          className="glass rounded-full text-xs px-3 py-1.5 text-dough-muted outline-none transition hover:border-amber-400/50"
        >
          <option value={50}>0.5% slippage</option>
          <option value={100}>1% slippage</option>
          <option value={500}>5% slippage</option>
        </select>
      </div>

      <div className="glass rounded-2xl divide-y divide-dough-border/60 shadow-[0_0_40px_rgba(245,158,11,.06)]">
        <div className="p-4 space-y-1.5">
          <label className="block text-xs text-dough-muted">You pay</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="flex-1 bg-transparent text-2xl font-medium font-mono tabular-nums text-dough-text outline-none min-w-0"
            />
            <select
              value={inputMint}
              onChange={(e) => setInputMint(e.target.value)}
              className="rounded-xl border border-amber-400/40 bg-dough-surface px-3 py-1.5 text-sm text-amber-200 shrink-0 outline-none transition hover:border-amber-400/70"
            >
              <option value={COOK_MINT}>{COOK}</option>
              {tokenOptions
                .filter((t) => t.mint !== outputMint && t.mint !== COOK_MINT)
                .map((t) => (
                  <option key={t.mint} value={t.mint}>
                    {t.symbol}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="p-4 space-y-1.5">
          <label className="block text-xs text-dough-muted">You receive</label>
          <div className="flex gap-2">
            <div className="flex-1 text-2xl font-medium font-mono tabular-nums text-dough-muted min-w-0 truncate">
              {quoting ? '…' : expectedOut ?? '0.0'}
            </div>
            <select
              value={outputMint}
              onChange={(e) => setOutputMint(e.target.value)}
              className="rounded-xl border border-amber-400/40 bg-dough-surface px-3 py-1.5 text-sm text-amber-200 shrink-0 outline-none transition hover:border-amber-400/70"
            >
              <option value="">Select token</option>
              {tokenOptions
                .filter((t) => t.mint !== inputMint)
                .map((t) => (
                  <option key={t.mint} value={t.mint}>
                    {t.symbol}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {route && !quoting && (
        <div className="glass rounded-xl px-4 py-3 text-xs text-dough-muted space-y-1.5">
          <div className="flex justify-between">
            <span>Price impact</span>
            <span className={`font-mono tabular-nums ${route.priceImpactPct > 3 ? 'text-amber-400' : 'text-dough-text'}`}>
              {route.priceImpactPct.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span>Minimum received</span>
            <span className="text-dough-text font-mono tabular-nums">
              {minOut} {outputToken?.symbol}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Route</span>
            <span className="text-dough-text font-mono tabular-nums">{[...new Set(route.segments.map((s) => s.venue))].join(' → ') || '—'}</span>
          </div>
        </div>
      )}

      {quoteError && <p className="text-xs text-red-400 px-1">{quoteError}</p>}

      {!publicKey ? (
        <p className="text-sm text-dough-muted text-center py-2">Connect a wallet to swap.</p>
      ) : (
        <button
          disabled={!route || quoting || stage !== null}
          onClick={handleSwap}
          className="w-full rounded-2xl bg-linear-to-b from-amber-300 to-amber-500 text-dough-950 font-semibold py-3.5 text-sm shadow-[0_0_30px_rgba(245,158,11,.28)] transition hover:from-amber-200 hover:to-amber-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {stage ? STAGE_LABEL[stage] ?? 'Working…' : 'Swap'}
        </button>
      )}

      {result && (
        <div className="text-sm rounded-xl p-3 border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
          Swap confirmed.{' '}
          <a href={txUrl(result.signature)} target="_blank" rel="noreferrer" className="underline">
            View on Cookiescan ↗
          </a>
        </div>
      )}
      {swapError && <p className="text-sm text-red-400 px-1">{swapError}</p>}
    </div>
  )
}
