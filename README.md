# ArcJobs

A freelance marketplace where the smart contract is the entire platform.

Clients post jobs. USDC locks in escrow. Freelancers submit work. Clients approve. Payment releases in under 500ms on Arc testnet.

No database. No platform fee. No company holding your money.

Built on ERC-8183, Circle and Arc's open standard for the agentic economy, which shipped March 31, 2026. ArcJobs is one of the first full-stack applications built on it.

- **Live:** https://arcjobs-frontend.vercel.app
- **Contract:** `0x63cEc4e9AeA0F94E149C9df598c54DdB2C5128c7`
- **Network:** Arc Testnet (Chain ID 1319718)
- **Explorer:** https://testnet.arcscan.app/address/0x63cEc4e9AeA0F94E149C9df598c54DdB2C5128c7

---

## How it works

A job moves through five states: Open → Funded → Submitted → Completed (or Rejected). Each transition is a transaction on Arc. The contract enforces who can call what — only the client funds, only the provider submits, only the evaluator completes.

When a job completes, the ERC-8183 contract releases USDC directly to the provider's wallet. No withdrawal step. No waiting period.

```
0: Open → 1: Funded → 2: Submitted → 3: Completed
                                    ↘ 4: Rejected
             ↘ 5: Expired
```

---

## Why Arc

USDC is the gas token on Arc, so you pay transaction fees in the same asset you're settling work in. No ETH balance to maintain. No mental math on fee denomination.

Malachite consensus gives deterministic finality. The money either moved or it didn't — you know in milliseconds, not minutes. For a payments product, that's the whole game.

---

## Running locally

### Contracts

```bash
cd arcjobs
cp .env.example .env   # fill in your RPC URL and private keys
forge build
forge test
```

Requires [Foundry](https://getfoundry.sh/).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Requires Node 18+. Open http://localhost:3000.

**MetaMask setup for Arc Testnet:**

| Field | Value |
|---|---|
| Network name | Arc Testnet |
| RPC URL | https://rpc.testnet.arc.network |
| Chain ID | 1319718 |
| Currency symbol | USDC |

---

## Contract addresses

| | Address |
|---|---|
| Proxy | `0x63cEc4e9AeA0F94E149C9df598c54DdB2C5128c7` |
| Implementation | `0x86D7c626AfF210c2f60970a0eb4Dc3ddbEF03CE5` |
| USDC (testnet) | `0x3600000000000000000000000000000000000000` |

---

## Key files

```
frontend/
├── app/
│   ├── page.tsx          — landing + app view, nav, wallet connect
│   ├── layout.tsx        — root layout with Providers
│   └── providers.tsx     — WagmiProvider + QueryClientProvider
├── components/
│   ├── JobBoard.tsx      — reads all jobs, renders cards and modals
│   └── PostJob.tsx       — form to post new jobs onchain
└── lib/
    ├── contract.ts       — ABI, addresses, Arc chain config
    └── wagmi.ts          — wagmi config
```

---

## ERC-8183

ERC-8183 is the AgenticCommerce standard built by Circle and Arc. It defines Jobs as escrowed, verifiable, onchain work between parties. ArcJobs is one of the first full-stack applications built on it.

Read the standard: https://arc.network

---

Built by [@Temmygabriel](https://github.com/Temmygabriel) — April 2026.
