import {
  PublicKey,
  Transaction,
  TransactionExpiredBlockheightExceededError,
  type Connection,
} from '@solana/web3.js'

export type TxStatus = 'idle' | 'signing' | 'sending' | 'confirming' | 'confirmed' | 'failed' | 'expired'

export interface Signer {
  publicKey: PublicKey
  signTransaction<T extends Transaction>(tx: T): Promise<T>
}

/** Turn an RPC/program error into one line a person can act on. */
export function explainError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  const logs = (e as { logs?: string[] })?.logs?.join(' ') ?? ''
  const blob = `${msg} ${logs}`
  if (/insufficient lamports|insufficient funds for rent/i.test(blob)) return 'Not enough COOK to pay fees and account rent.'
  if (/insufficient funds|custom program error: 0x1\b/i.test(blob)) return 'Not enough of the token in your wallet.'
  if (/User rejected|rejected the request|declined/i.test(blob)) return 'You declined the signature in the wallet.'
  if (/Blockhash not found|block height exceeded/i.test(blob)) return 'The transaction expired before it landed. Retry it.'
  return msg.length > 160 ? msg.slice(0, 157) + '…' : msg
}

// Nightly (and most wallets) simulate against whatever network they're currently pointed at
// before signing. If it's set to Solana mainnet instead of Cookie Chain, a Cookie Chain tx
// "fails" there silently and the wallet never answers — so we stop waiting and say why.
const SIGN_TIMEOUT_MS = 120_000
export const WRONG_NETWORK_HINT =
  'The wallet did not return a signature. Make sure it is on Cookie Chain: in Nightly, open the network switcher and pick Cookie, then try again.'

function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(message)), ms)
    p.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e) => (clearTimeout(t), reject(e)),
    )
  })
}

export interface SendOptions {
  connection: Connection
  signer: Signer
  transaction: Transaction
  onStatus?: (status: TxStatus) => void
}

export interface SendResult {
  status: TxStatus
  signature?: string
  error?: string
}

/** Sign, send, and confirm one transaction, reporting each stage via onStatus. */
export async function sendAndConfirm({ connection, signer, transaction, onStatus }: SendOptions): Promise<SendResult> {
  const set = (s: TxStatus) => onStatus?.(s)
  try {
    set('signing')
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
    transaction.recentBlockhash = blockhash
    transaction.feePayer = signer.publicKey

    const signed = await withTimeout(signer.signTransaction(transaction), SIGN_TIMEOUT_MS, WRONG_NETWORK_HINT)

    set('sending')
    const signature = await connection.sendRawTransaction(signed.serialize(), { maxRetries: 3 })

    set('confirming')
    const res = await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed')
    if (res.value.err) throw new Error(`On-chain error: ${JSON.stringify(res.value.err)}`)

    set('confirmed')
    return { status: 'confirmed', signature }
  } catch (e) {
    const status: TxStatus = e instanceof TransactionExpiredBlockheightExceededError ? 'expired' : 'failed'
    set(status)
    return { status, error: explainError(e) }
  }
}
