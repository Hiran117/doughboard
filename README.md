# 🍪 Doughboard

Your dough, tracked and traded on Cookie Chain. A wallet-connected dashboard for
viewing your live portfolio and swapping tokens through the Cookiebox
aggregator — built for the ["Create an App on Cookie Chain"](https://superteam.fun/earn/listing/create-an-app-on-cookie-chain-app/)
bounty on Superteam Earn.

## Features

- **Wallet connect** — Nightly and any Solana Wallet Standard wallet, auto-detected
- **Live portfolio** — native COOK + every SPL/Token-2022 balance, priced via the
  Cookiescan token registry, with a running USD total. View any wallet read-only
  by pasting an address or via a `?a=<address>` shareable link — no wallet
  connection required to look
- **Swap** — live quotes, price impact, minimum received, and route breakdown via
  the Cookiebox aggregator (`agg.cookiebox.app`), which routes across all
  Cookie Chain DEX liquidity
- **Transaction feedback** — full stage tracking (quoting → building → signing →
  submitting → confirming), pre-sign simulation, human-readable errors, and a
  Cookiescan link on completion

## Tech stack

React + TypeScript + Vite + Tailwind CSS v4 + `@solana/web3.js` +
`@solana/wallet-adapter-react` (no `wallet-adapter-react-ui` or
`wallet-adapter-wallets` — a hand-rolled wallet button keeps the dependency
tree lean; see `src/components/WalletButton.tsx`).

## Getting started

```bash
npm install
cp .env.example .env   # adjust RPC/API URLs if needed
npm run dev
```

You'll need [Nightly](https://nightly.app/) installed and some COOK bridged
over from Solana via [hyperlane.cookiescan.io](https://hyperlane.cookiescan.io)
to test swaps — quotes and the portfolio view work with zero balance.

## Environment variables

| Variable                | Default                        | Purpose                  |
|--------------------------|---------------------------------|---------------------------|
| `VITE_COOKIE_RPC_URL`    | https://rpc.cookiescan.io      | Cookie Chain RPC endpoint |
| `VITE_COOKIE_DAS_API`    | https://api.cookiescan.io      | Cookie DAS API |

## Project structure

```
src/
  lib/
    chain.ts       # RPC/DAS/registry/explorer constants
    format.ts       # amount/address/USD formatting
    tokens.ts        # Cookiescan token registry (prices, metadata)
    portfolio.ts      # live wallet balance + valuation hook
    txs.ts             # generic tx send/confirm with the Nightly-timeout guard
    swap.ts             # Cookiebox aggregator client + swap flow
  components/
    WalletButton.tsx     # custom connect UI (Wallet Standard, Nightly-first)
    SwapCard.tsx           # token picker, live quote, swap execution
  providers/
    WalletContextProvider.tsx
```

## Bounty submission checklist

- [x] Wallet connect, address display, tx execution/confirmation, error handling
- [x] Portfolio / activity view
- [ ] Analytics / charts
- [ ] Deployed + publicly accessible
- [x] Public GitHub repo with real commit history
- [x] README with setup instructions
- [ ] Submit via the Superteam Earn listing (repo alone does not count)
- [ ] Fork `cookiechain/superteam-hackathon-submissions`, add logo + `apps.json` entry, open PR
- [ ] X (Twitter) demo thread, linking the Cookie Chain Bridge
- [ ] Post the thread in the Cookie Chain Telegram

**Deadline:** September 28, 2026.

## License

MIT
