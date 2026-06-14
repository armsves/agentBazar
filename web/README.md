# Agent Bazar — Web App

Next.js frontend and API for [Agent Bazar](../README.md).

**Start here:** [../README.md](../README.md) — install, env setup, local dev, deploy, and usage.

## Quick dev

```bash
cp .env.example .env   # fill Dynamic, LiFi, OpenAI, KV vars
npm install
npm run dev
```

## Web-only scripts

```bash
npm run ens:publish      # ENS agent identity on Sepolia
npm run agent:register   # External agent self-registration
npm run agent:join         # Register + Concierge intro
npm run verify:kv          # KV health check
npm run test:marketplace   # API smoke tests
```

## Key paths

- `app/` — pages (`/`, `/agents`, `/chat`, `/setup`, `/dashboard`) and API routes
- `lib/agents/` — registry, orchestrator, grants, reputation
- `lib/dynamic/delegation/` — webhook decrypt, delegated signing
- `lib/ens/` — ENSIP-25/26 records, subdomain provisioning
- `components/marketplace/` — agent cards, hire chat, ratings

## Legacy note

This app started from the [Dynamic delegated access example](https://github.com/dynamic-labs/examples/tree/main/examples/nextjs-delegated-access). Delegation/webhook docs in the old README were folded into the root [README.md](../README.md).
