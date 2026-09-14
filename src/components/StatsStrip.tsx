import { useEffect, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { COOK_DECIMALS } from '../lib/chain'
import { fmtAmount } from '../lib/format'

/** Compact live stats chips under the header: COOK balance, network, RPC status. */
export function StatsStrip() {
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const [balance, setBalance] = useState<bigint | null>(null)
  const [rpcLive, setRpcLive] = useState<boolean | null>(null)

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

  useEffect(() => {
    let stop = false
    const check = () =>
      connection
        .getVersion()
        .then(() => !stop && setRpcLive(true))
        .catch(() => !stop && setRpcLive(false))
    check()
    const id = setInterval(check, 30_000)
    return () => {
      stop = true
      clearInterval(id)
    }
  }, [connection])

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 flex flex-wrap gap-2">
      <div className="glass rounded-full px-3.5 py-1.5 text-xs flex items-center gap-2">
        <span className="text-dough-muted">Balance</span>
        <span className="font-mono tabular-nums text-dough-text">
          {balance !== null ? `${fmtAmount(balance, COOK_DECIMALS, true)} COOK` : '—'}
        </span>
      </div>
      <div className="glass rounded-full px-3.5 py-1.5 text-xs flex items-center gap-2">
        <span className="text-dough-muted">Network</span>
        <span className="text-dough-text">Cookie Chain</span>
      </div>
      <div className="glass rounded-full px-3.5 py-1.5 text-xs flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${rpcLive === false ? 'bg-red-400' : 'bg-emerald-400 pulse-dot'}`}
        />
        <span className={rpcLive === false ? 'text-red-400' : 'text-dough-text'}>
          {rpcLive === null ? 'RPC checking…' : rpcLive ? 'RPC live' : 'RPC down'}
        </span>
      </div>
    </div>
  )
}