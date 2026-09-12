import { PublicKey } from '@solana/web3.js'

export const RPC_URL = 'https://rpc.cookiescan.io'
export const DAS_URL = 'https://api.cookiescan.io'
export const REGISTRY_URL = 'https://cookiescan.io/api/tokens'
export const EXPLORER = 'https://cookiescan.io'

/** Native COOK reuses Solana's native/wrapped-SOL mint id. 9 decimals. */
export const COOK_MINT = 'So11111111111111111111111111111111111111112'
export const COOK_DECIMALS = 9
export const COOK = 'COOK'

export const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
export const TOKEN_2022_PROGRAM = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')

export const txUrl = (sig: string) => `${EXPLORER}/tx/${sig}`
export const addressUrl = (addr: string) => `${EXPLORER}/address/${addr}`

export function isPubkey(s: string): boolean {
  try {
    new PublicKey(s.trim())
    return true
  } catch {
    return false
  }
}
