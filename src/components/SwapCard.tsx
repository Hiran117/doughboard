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
          className="bg-neutral-900 border border-neutral-800 rounded-lg text-xs px-2 py-1.5"
        >
          <option value={50}>0.5% slippage</option>
          <option value={100}>1% slippage</option>
          <option value={500}>5% slippage</option>
        </select>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 divide-y divide-neutral-800">
        <div className="p-4 space-y-1.5">
          <label className="block text-xs text-neutral-500">You pay</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="flex-1 bg-transparent text-2xl font-medium outline-none min-w-0"
            />
            <select
              value={inputMint}
              onChange={(e) => setInputMint(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm shrink-0"
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
          <label className="block text-xs text-neutral-500">You receive</label>
          <div className="flex gap-2">
            <div className="flex-1 text-2xl font-medium text-neutral-300 min-w-0 truncate">
              {quoting ? '…' : expectedOut ?? '0.0'}
            </div>
            <select
              value={outputMint}
              onChange={(e) => setOutputMint(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm shrink-0"
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
        <div className="text-xs text-neutral-500 space-y-1.5 px-1">
          <div className="flex justify-between">
            <span>Price impact</span>
            <span className={route.priceImpactPct > 3 ? 'text-amber-400' : ''}>{route.priceImpactPct.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Minimum received</span>
            <span>
              {minOut} {outputToken?.symbol}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Route</span>
            <span>{[...new Set(route.segments.map((s) => s.venue))].join(' → ') || '—'}</span>
          </div>
        </div>
      )}

      {quoteError && <p className="text-xs text-red-400 px-1">{quoteError}</p>}

      {!publicKey ? (
        <p className="text-sm text-neutral-500 text-center py-2">Connect a wallet to swap.</p>
      ) : (
        <button
          disabled={!route || quoting || stage !== null}
          onClick={handleSwap}
          className="w-full rounded-xl bg-amber-400 text-neutral-950 font-semibold py-3 text-sm hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {stage ? STAGE_LABEL[stage] ?? 'Working…' : 'Swap'}
        </button>
      )}

      {result && (
        <div className="text-sm rounded-lg p-3 bg-emerald-950 text-emerald-300">
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
