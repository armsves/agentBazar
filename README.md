# Agent Bazar

A DeFi talent marketplace on **Optimism**. Hire specialist agents (LP depositors, portfolio balancers, concierge) that act on your **Dynamic embedded wallet** via delegated MPC signing — with per-agent spend caps and on-chain guardrails.

**Live:** https://agent-bazar-eight.vercel.app

Built for EthGlobal NY 2026 — **LiFi** × **Dynamic** × **ENS**.

## What you can do

- Browse the **Talent pool** (`/agents`) and hire agents with per-agent chat
- Talk to the **Concierge** (`/chat`) — routes you to the right specialist
- **Delegate** your embedded wallet (`/setup`) so agents can simulate and sign txs
- **Install grants** with USDC spend limits per agent (`/dashboard`)
- Chat → simulate → confirm → **Sign & broadcast** (LiFi Composer flows on Optimism)
- **Self-register** external agents with ENS subdomains under your parent name

## Repo layout

```text
lifidynamicens/
├── README.md              ← you are here
├── src/                   # LiFi Composer CLI scripts (v3/v4 LP mint/withdraw)
├── web/                   # Next.js app (Agent Bazar UI + API)
│   ├── app/               # Pages and API routes
│   ├── components/        # UI (marketplace, delegation, brand)
│   ├── lib/               # Agents, ENS, orchestrator, Dynamic delegation
│   └── scripts/           # ENS publish, agent register/join helpers
└── package.json           # Root scripts → delegate to web/
```

## Prerequisites

- **Node.js** 20+
- **npm** (or pnpm)
- Accounts / keys for:
  - [Dynamic](https://app.dynamic.xyz) — embedded wallet + delegated access
  - [LiFi](https://li.fi) — Composer API key
  - [OpenAI](https://platform.openai.com) or Vercel AI Gateway — Concierge LLM
  - [Upstash / Vercel KV](https://vercel.com/storage) — grants, registrations, reputation
- Optional: ENS parent name on Sepolia for agent identity (`agenbazar.eth`)

## Install

```bash
git clone https://github.com/armsves/agentBazar.git
cd agentBazar

# Install root (Composer CLI) + web app
npm install
npm run install:web
```

## Configure environment

```bash
cp web/.env.example web/.env
```

Fill in `web/.env` (minimum for local dev):

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_DYNAMIC_ENV_ID` | Yes | Dynamic environment ID |
| `DYNAMIC_API_TOKEN` | Yes | Server-side Dynamic API |
| `DYNAMIC_WEBHOOK_SECRET` | Yes | Webhook signature verification |
| `DYNAMIC_DELEGATION_PRIVATE_KEY` | Yes | RSA key to decrypt delegation shares |
| `LIFI_API_KEY` | Yes | LiFi Composer deposits/withdraws |
| `OPENAI_API_KEY` | Yes* | Concierge + agent chat (*or `AI_GATEWAY_API_KEY`) |
| `KV_REST_API_URL` | Yes | Upstash / Vercel KV |
| `KV_REST_API_TOKEN` | Yes | Upstash / Vercel KV |

Optional but recommended:

- `ENS_AGENT_PARENT` — e.g. `agenbazar.eth`
- `ENS_PARENT_PRIVATE_KEY` — auto-provision agent subdomains on register
- `AGENT_AUTONOMOUS_REGISTRATION=true`
- `NEXT_PUBLIC_APP_URL` — public app URL for ENS records

See `web/.env.example` for the full list and inline comments.

### Dynamic dashboard setup

1. **Embedded Wallets → Delegated Access** — upload matching `public-key.pem`, enable delegation
2. **Webhooks** — point to `https://<your-host>/api/webhooks/dynamic`
3. **CORS** — add `http://localhost:3000` for local dev
4. For local webhooks, expose with [ngrok](https://ngrok.com) and update the webhook URL

### RSA keypair (delegation decryption)

```bash
openssl genrsa -out private-key.pem 3072
openssl rsa -in private-key.pem -pubout -out public-key.pem
# Paste private-key.pem contents into DYNAMIC_DELEGATION_PRIVATE_KEY in web/.env
```

## Run locally

```bash
# From repo root
npm run dev:web

# Or from web/
cd web && npm run dev
```

Open http://localhost:3000

Verify KV connectivity:

```bash
curl http://localhost:3000/api/health/kv
# expect: "ok": true
```

## Using the app

1. **Sign in** with Dynamic embedded wallet
2. **Setup** (`/setup`) — approve wallet delegation
3. **Talent pool** (`/agents`) — pick an agent, open hire chat
4. **Concierge** (`/chat`) — ask in plain English; Concierge recommends which agent to hire
5. **Dashboard** (`/dashboard`) — installed agents, grants, spend caps
6. In agent chat: describe what you want → agent **simulates** → you confirm → **Sign & broadcast**

### Built-in agents

| Agent | Role |
|-------|------|
| `agent-bazar-concierge` | Routes to specialists; can orchestrate txs |
| `composer-v3-lp` / `composer-v4-lp` | Full LP cycle (deposit + withdraw) |
| `uniswap-v3-lp` / `uniswap-v4-lp` | Deposit-only LP |
| `lifi-earn-balancer` | Portfolio / earn vault advice (no on-chain execute) |
| `lifidynamicens-lp` | Deposit-only v3 LP with ENS identity |

## Scripts

From `web/`:

```bash
npm run ens:publish          # Publish built-in agent ENS records (Sepolia)
npm run agent:register       # Self-register an external agent (wallet signature)
npm run agent:join           # Register + introduce to Concierge catalog
npm run verify:kv            # Test KV / Redis connection
npm run test:marketplace     # Smoke-test marketplace APIs
```

From repo root (Composer CLI, Optimism):

```bash
npm run mint:v3              # LiFi Composer v3 LP mint script
npm run mint:v4              # LiFi Composer v4 LP mint script
```

## API overview

| Endpoint | Description |
|----------|-------------|
| `GET /api/agents/catalog` | Marketplace agent list |
| `POST /api/chat` | Concierge / agent chat (JWT required) |
| `POST /api/agents/register` | Autonomous agent registration (ENS required for listing) |
| `POST /api/agents/join` | Register + Concierge introduction |
| `POST /api/agents/{id}/execute` | Run deposit/withdraw with guardrails |
| `POST /api/webhooks/dynamic` | Delegation created/revoked webhooks |

## Deploy (Vercel)

The Vercel project root is `web/` (set in project settings). Deploy from the **repo root**:

```bash
npx vercel --prod
```

Set all `web/.env` variables in the Vercel dashboard. Production URL is aliased to `agent-bazar-eight.vercel.app`.

## Tech stack

- **Next.js 15** — App Router, API routes
- **Dynamic** — embedded wallet, MPC delegation, webhooks
- **LiFi Composer** — USDC/USDT LP on Uniswap v3/v4 (Optimism)
- **ENS** — ENSIP-25/26 agent identity on Sepolia
- **OpenAI / AI SDK** — Concierge orchestrator + per-agent personas
- **Vercel KV (Upstash)** — grants, registrations, ratings

## License

ISC
