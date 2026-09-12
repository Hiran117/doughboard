# 🍪 Cookie Portfolio & Swap Dashboard

A web dApp for Cookie Chain (Solana-compatible SVM) that lets users connect a
wallet, view their live portfolio, execute swaps, and track transaction
activity — all in one dashboard.

Built for the "Build a cApp on Cookie Chain" challenge.

## Features

- **Wallet connect** — supports Nightly and any Solana Wallet Standard wallet
- **Live balance / portfolio** — SOL + SPL token balances
- **Swap execution** — trade tokens via Cookieswap
- **Transaction feedback** — pending/confirmed/failed states with
  CookieScan links
- **Analytics** — price/volume via Cookie DAS API

## Tech stack

- React + TypeScript + Vite
- Tailwind CSS v4
- @solana/web3.js + @solana/wallet-adapter-react (SVM-compatible, works with
  Cookie Chain's RPC)

## Getting started

```bash
npm install
cp .env.example .env   # adjust RPC/API URLs if needed
npm run dev
```

## Environment variables

| Variable                | Default                        | Purpose                  |
|--------------------------|---------------------------------|---------------------------|
| `VITE_COOKIE_RPC_URL`    | https://rpc.cookiescan.io      | Cookie Chain RPC endpoint |
| `VITE_COOKIE_DAS_API`    | https://api.cookiescan.io      | Cookie DAS API for token/portfolio data |

## Project status

- [x] Environment scaffolded (Vite + React + TS + Tailwind)
- [x] Wallet connect (Nightly + Wallet Standard) wired to Cookie Chain RPC
- [x] Live SOL balance display
- [ ] SPL token portfolio via Cookie DAS API
- [ ] Swap execution via Cookieswap
- [ ] Transaction status UI + CookieScan links
- [ ] Analytics charts

## License

MIT — open source per challenge requirements.
