import type { Agent } from "@/lib/agents/types";
import { OPTIMISM_CHAIN_ID } from "../../../src/optimism";

export const AGENT_REGISTRY: Agent[] = [
  {
    id: "uniswap-v3-lp",
    name: "Uniswap V3 LP Depositor",
    description:
      "Deposits USDC into a full-range USDC/USDT concentrated liquidity position on Uniswap v3 (Optimism).",
    longDescription:
      "This agent uses LiFi Composer to swap half your USDC to USDT on-chain, then mints a full-range LP position in the canonical 0.01% USDC/USDT pool. All transactions are signed via your Dynamic embedded wallet delegation — no private keys on the server.",
    capabilities: ["uniswap-v3-lp"],
    version: "v3",
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
    chainId: OPTIMISM_CHAIN_ID,
    tags: ["defi", "uniswap", "liquidity", "optimism", "v4"],
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
