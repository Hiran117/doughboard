import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Buffer } from 'buffer'
import './index.css'
import App from './App.tsx'
import { WalletContextProvider } from './providers/WalletContextProvider.tsx'

// polyfill Buffer for Solana web3.js in the browser
;(window as any).Buffer = Buffer

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WalletContextProvider>
      <App />
    </WalletContextProvider>
  </StrictMode>,
)
