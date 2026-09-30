# StackVote

A simple, working on-chain voting dApp built with [Scaffold Stacks](https://scaffoldstacks.mintlify.app/). Create polls with two options, vote with your Stacks wallet, and see results update on-chain — secured by Bitcoin via the Stacks L2.

## Features

- **Create polls** — title + two options, stored on-chain with a unique incremental ID
- **Vote** — one vote per wallet address per poll, enforced by the contract
- **Live results** — vote counts and percentages fetched from the chain (no mock data)
- **Wallet integration** — Leather / Xverse via `@stacks/connect`
- **Transaction feedback** — pending / success / abort states with Hiro explorer links
- **Already-voted detection** — clear feedback and disabled buttons after voting
- **Responsive UI** — mobile-friendly dark theme built with Tailwind

## Tech stack

| Layer | Tech |
| - | - |
| Smart contract | Clarity 6 (epoch 4.0), Clarinet 3.24+ |
| Frontend | Next.js 15, React 18, Tailwind CSS |
| State | Jotai (wallet address), generated React hooks |
| Wallet | `@stacks/connect` v8 (Leather / Xverse) |
| Tooling | `stacksdapp` CLI (scaffold, check, generate, test, deploy) |

## Project layout

```
stackvote/
├── contracts/
│   ├── Clarinet.toml          # contract registry (clarity_version, epoch)
│   ├── contracts/voting.clar  # StackVote contract (EDIT HERE)
│   ├── settings/Testnet.toml  # deployer mnemonic (never commit real seeds)
│   └── tests/voting.test.ts   # Vitest + Clarinet SDK simnet tests
├── frontend/
│   ├── src/app/               # Next.js App Router pages
│   ├── src/components/        # UI (VotingApp.tsx is the main interface)
│   ├── src/generated/         # AUTO-GENERATED bindings — run `stacksdapp generate`
│   └── .env.local             # NEXT_PUBLIC_NETWORK=testnet
└── stacksdapp.toml            # project marker
```

## Quick start

```bash
# 1. Install prerequisites: Rust, Node.js 20+, Clarinet 3.23+
stacksdapp doctor

# 2. Type-check, generate bindings, test
stacksdapp check && stacksdapp generate && stacksdapp test

# 3. Run the frontend against testnet
stacksdapp dev --network testnet
# open http://localhost:3000, connect Leather/Xverse set to Testnet
```

## The contract

`contracts/contracts/voting.clar` exposes:

| Function | Type | Description |
| - | - | - |
| `create-poll (title) (option-a) (option-b)` | public | Creates a poll, returns its unique ID. Rejects empty title/options. |
| `vote (poll-id) (option)` | public | Casts a vote (option `1` or `2`). Rejects invalid poll IDs, invalid options, and duplicate votes. |
| `get-poll (poll-id)` | read-only | Full poll details (title, options, counts, creator). |
| `get-results (poll-id)` | read-only | Vote counts and total for a poll. |
| `has-voted (poll-id) (voter)` | read-only | Whether an address has voted on a poll. |
| `get-poll-count` | read-only | Total number of polls created. |

Error codes: `u100` invalid poll, `u101` empty title, `u102` empty option, `u103` invalid option, `u104` already voted.

## Testing

```bash
stacksdapp test
```

Contract tests run in a Clarinet simnet (no Docker needed) and cover: poll creation with unique IDs, on-chain detail storage, empty-title/option rejection, voting and per-option counts, duplicate-vote rejection, invalid poll ID / option rejection, `has-voted` for voters and non-voters, and `get-poll-count`.

## Deployment (Stacks testnet)

1. **Get testnet STX** from the [Hiro faucet](https://explorer.hiro.so/sandbox/faucet?chain=testnet).
2. **Add your deployer mnemonic** to `contracts/settings/Testnet.toml`:

   ```toml
   [accounts.deployer]
   mnemonic = "your 24 words here"
   ```

   > Never commit real mnemonics. The bundled pre-commit hook blocks seed phrases in git.

3. **Deploy:**

   ```bash
   stacksdapp deploy --network testnet --yes
   ```

   This writes the contract address to `frontend/src/generated/deployments.json`.

4. **Point the frontend at testnet** — set `NEXT_PUBLIC_NETWORK=testnet` in `frontend/.env.local`, then `stacksdapp dev --network testnet`.

## Publishing to Vercel

The frontend root is `frontend/` (the included `frontend/vercel.json` sets the Next.js framework).

1. Push this repo to GitHub.
2. In Vercel, **Add New Project** → import the repo.
3. Set **Root Directory** to `frontend`.
4. In **Environment Variables**, add:

   | Variable | Value | Required |
   | - | - | - |
   | `NEXT_PUBLIC_NETWORK` | `testnet` | Yes |
   | `NEXT_PUBLIC_STACKS_NODE_URL` | `https://api.testnet.hiro.so` | Optional |
   | `NEXT_PUBLIC_HIRO_API_KEY` | your key | Optional (higher rate limits) |

5. **Deploy**. The production build runs automatically (`npm run build`).

## Environment variables

| Variable | Where | Purpose |
| - | - | - |
| `NEXT_PUBLIC_NETWORK` | `frontend/.env.local` / Vercel | `devnet` \| `testnet` \| `mainnet` |
| `NEXT_PUBLIC_STACKS_NODE_URL` | `frontend/.env.local` / Vercel | Node RPC override |
| `NEXT_PUBLIC_HIRO_API_KEY` | `frontend/.env.local` / Vercel | Hiro API key for read calls |
| deployer `mnemonic` | `contracts/settings/Testnet.toml` | Testnet deployer (never commit) |

## Links

- **Live app:** _\<deployed Vercel URL\>_
- **Contract explorer:** _\<Hiro explorer link for the deployed voting contract\>_
- **GitHub:** _\<repository URL\>_
