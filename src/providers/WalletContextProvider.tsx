import { useMemo } from 'react'
import type { FC, ReactNode } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { RPC_URL } from '../lib/chain'

// Nightly (and Phantom/Backpack/etc.) implement the Solana Wallet Standard, so
// wallet-adapter-react auto-detects them via window registration. No manual
// adapter list, and no @solana/wallet-adapter-react-ui — we render our own
// WalletButton to keep the dependency tree lean.

export const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const endpoint = useMemo(() => RPC_URL, [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  )
}
