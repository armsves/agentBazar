import type { Agent } from "@/lib/agents/types";
import { OPTIMISM_CHAIN_ID } from "../../../src/optimism";

export const AGENT_REGISTRY: Agent[] = [
  {
    id: "agent-bazar-concierge",
    name: "Agent Bazar Concierge",
    description:
      "Primary LLM orchestrator. Understands natural language, routes to specialist agents, simulates and executes with guardrails.",
    longDescription:
      "Powered by GPT-4o-mini (OpenAI or Vercel AI Gateway). Uses tool-calling to list agents, check delegation, install grants, dry-run LiFi Composer flows, and execute on-chain via Dynamic delegated signing. Talk to it at /chat.",
    kind: "orchestrator",
    capabilities: ["uniswap-v3-lp", "uniswap-v4-lp"],
    version: "v3",
    chainId: OPTIMISM_CHAIN_ID,
    tags: ["ai", "orchestrator", "llm", "concierge"],
  },
  {
    id: "uniswap-v3-lp",
    name: "Uniswap V3 LP Depositor",
    description:
      "Deposits USDC into a full-range USDC/USDT concentrated liquidity position on Uniswap v3 (Optimism).",
    longDescription:
      "This agent uses LiFi Composer to swap half your USDC to USDT on-chain, then mints a full-range LP position in the canonical 0.01% USDC/USDT pool. All transactions are signed via your Dynamic embedded wallet delegation — no private keys on the server.",
    capabilities: ["uniswap-v3-lp"],
    version: "v3",
    kind: "specialist",
    chainId: OPTIMISM_CHAIN_ID,
    tags: ["defi", "uniswap", "liquidity", "optimism"],
  },
  {
    id: "uniswap-v4-lp",
    name: "Uniswap V4 LP Depositor",
    description:
      "Deposits USDC into a full-range USDC/USDT position on Uniswap v4 (Optimism) via Permit2.",
    longDescription:
      "This agent mirrors the v3 flow but targets Uniswap v4's PositionManager with Permit2 approvals. Requires the v4 USDC/USDT pool to exist on Optimism. Signed via your delegated embedded wallet with spend guardrails.",
    capabilities: ["uniswap-v4-lp"],
    version: "v4",
    kind: "specialist",
    chainId: OPTIMISM_CHAIN_ID,
    tags: ["defi", "uniswap", "liquidity", "optimism", "v4"],
  },
  {
    id: "composer-v3-lp",
    name: "Composer Uniswap V3 LP Manager",
    description:
      "Deposit and withdraw USDC/USDT liquidity on Uniswap v3 via LiFi Composer on Optimism.",
    longDescription:
      "Full-cycle v3 LP agent: deposits USDC (swap leg + USDT leg), mints a full-range position NFT on the LiFi user proxy, and withdraws via decreaseLiquidity + collect Composer flows. All txs signed via Dynamic delegated MPC with spend guardrails.",
    capabilities: ["uniswap-v3-lp"],
    version: "v3",
    kind: "specialist",
    chainId: OPTIMISM_CHAIN_ID,
    tags: ["composer", "uniswap", "v3", "deposit", "withdraw"],
  },
  {
    id: "composer-v4-lp",
    name: "Composer Uniswap V4 LP Manager",
    description:
      "Deposit and withdraw USDC/USDT liquidity on Uniswap v4 via LiFi Composer and Permit2.",
    longDescription:
      "Full-cycle v4 LP agent: deposits via modifyLiquidities mint, withdraws by burning the position NFT through Composer. Uses Permit2 approvals and Dynamic delegated signing with marketplace guardrails.",
    capabilities: ["uniswap-v4-lp"],
    version: "v4",
    kind: "specialist",
    chainId: OPTIMISM_CHAIN_ID,
    tags: ["composer", "uniswap", "v4", "deposit", "withdraw"],
  },
  {
    id: "lifi-earn-balancer",
    name: "LiFi Earn Portfolio Balancer",
    description:
      "Suggests how to balance USDC across top LiFi Earn vaults on Optimism by risk profile.",
    longDescription:
      "Advisor agent powered by the LiFi Earn API. Fetches live vault APY/TVL on Optimism, filters flagged outliers for conservative profiles, and proposes percentage allocations across Yearn, Morpho, and other earn vaults. Recommend-only — use Composer LP agents or LiFi Earn to execute deposits.",
    kind: "advisor",
    capabilities: ["earn-portfolio"],
    version: "v3",
    chainId: OPTIMISM_CHAIN_ID,
    tags: ["lifi", "earn", "portfolio", "advisor", "optimism"],
  },
  {
    id: "lifidynamicens-lp",
    name: "LiFi Dynamic ENS LP",
    description:
      "Autonomous LP specialist using LiFi Composer + Dynamic MPC delegation on Optimism.",
    longDescription:
      "Built for Agent Bazar. Swaps half USDC to USDT, mints a full-range Uniswap v3 USDC/USDT position, signed via the user's delegated embedded wallet with spend guardrails.",
    capabilities: ["uniswap-v3-lp"],
    version: "v3",
    kind: "specialist",
    chainId: OPTIMISM_CHAIN_ID,
    tags: ["lifidynamicens", "lifi", "uniswap", "self-registered"],
  },
];

export function getAgentById(agentId: string): Agent | undefined {
  return AGENT_REGISTRY.find((agent) => agent.id === agentId);
}

export function listAgents(): Agent[] {
  return AGENT_REGISTRY;
}

export function agentIdForVersion(version: "v3" | "v4"): string {
  return version === "v4" ? "uniswap-v4-lp" : "uniswap-v3-lp";
}
