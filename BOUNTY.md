# StackVote — Bounty Submission Kit

## X post draft

> **Remember to attach a screenshot or short demo video before posting!**
> Fill in the placeholders with the real URLs after deployment.

---

Just built **StackVote** — a fully on-chain voting dApp on @sfdstacks 🗳️

- Create polls with two options
- Vote with your Leather/Xverse wallet (one vote per address, enforced on-chain)
- Live results straight from the Clarity contract — no mocks

Built with Scaffold Stacks: Clarity 6 contract, auto-generated TypeScript hooks, Next.js frontend, one-command testnet deploy.

🔗 Demo: \<YOUR_VERCEL_URL\>
💻 Code: \<YOUR_GITHUB_REPO\>
📜 Contract: \<YOUR_EXPLORER_LINK\>

#Stacks #Bitcoin #Clarity

---

## Experience report template

> Fill in the bracketed sections with your actual experience. Do not claim anything that did not happen.

### What worked well in Scaffold Stacks

- [e.g. `stacksdapp new` produced a complete, coherent monorepo in seconds — contract, frontend, hooks, debug UI, git hooks, agent skill]
- [e.g. `stacksdapp generate` kept TypeScript bindings perfectly in sync with the Clarity ABI after every contract edit]
- [e.g. The Debug Contracts panel made it easy to smoke-test hooks before building custom UI]
- [e.g. Simnet tests via `stacksdapp test` ran with no Docker and caught my duplicate-vote bug immediately]

### Problems encountered and how they were resolved

- [e.g. Clarity rejected a non-ASCII em-dash in a comment → replaced with ASCII]
- [e.g. `has-voted` initially returned a raw bool, breaking `asserts!` after I wrapped it in `(ok ...)` → unwrapped with `unwrap!` at the call site]
- [e.g. `stacksdapp new` failed on the initial git commit (no git identity) → re-ran with `--no-git`]
- [e.g. Frontend typecheck failed on image imports until `next build` generated `next-env.d.ts`]

### CLI and agent-skill usefulness

- [e.g. The bundled agent skill (`.cursor/skills/scaffold-stacks/SKILL.md`) was the primary reference — command decision tree, hook usage, and the "never edit generated files" rule prevented mistakes]
- [e.g. `stacksdapp doctor` caught the missing Clarinet install upfront]
- [e.g. `--dry-run` validated the deploy plan and fee estimate before broadcasting]

### Contract testing and deployment experience

- [e.g. 8 simnet tests covered creation, voting, counts, duplicates, and invalid inputs — all passing]
- [e.g. Deployment to testnet required a funded deployer mnemonic; `stacksdapp deploy --network testnet --yes` submitted the tx and wrote `deployments.json`]
- [e.g. Verified the contract on the Hiro explorer at \<explorer link\> — txid \<real txid\>]

### Actual time spent building

- Scaffold + tooling setup: [e.g. ~30 min, mostly `cargo install stacksdapp`]
- Contract + tests: [e.g. ~45 min]
- Frontend: [e.g. ~60 min]
- Verify + build + docs: [e.g. ~30 min]
- **Total:** [e.g. ~3 hours]
