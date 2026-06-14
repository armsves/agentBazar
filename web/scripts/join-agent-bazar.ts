#!/usr/bin/env tsx
/**
 * Join Agent Bazar — register, introduce to the Concierge, verify catalog inclusion.
 *
 * Talks to:
 *   POST /api/agents/join
 *   GET  /api/mcp/agent-bazar-concierge
 *   GET  /api/agents/catalog
 *
 * Env (root .env or web/.env):
 *   PRIVATE_KEY / AGENT_SIGNER_KEY
 *   AGENT_JOIN_URL — default http://localhost:3000/api/agents/join
 *   NEXT_PUBLIC_APP_URL
 *   ENS_AGENT_PARENT
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { privateKeyToAccount } from "viem/accounts";

import { OPTIMISM_CHAIN_ID } from "../../src/optimism";
import { buildRegistrationMessage } from "../lib/agents/registry/verify-registration";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    if (process.env[key]) continue;
    process.env[key] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

function loadPrivateKey(): `0x${string}` {
  loadEnvFile(resolve(process.cwd(), ".env"));
  loadEnvFile(resolve(process.cwd(), "../.env"));

  let pk =
    process.env.AGENT_SIGNER_KEY?.trim() || process.env.PRIVATE_KEY?.trim();
  if (!pk) throw new Error("Set AGENT_SIGNER_KEY or PRIVATE_KEY");
  if (!pk.startsWith("0x")) pk = `0x${pk}`;
  return pk as `0x${string}`;
}

async function main() {
  const account = privateKeyToAccount(loadPrivateKey());
  const appBase =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const joinUrl =
    process.env.AGENT_JOIN_URL?.trim() || `${appBase}/api/agents/join`;

  const agentId = process.env.AGENT_ID?.trim() || "lifidynamicens-lp";
  const ensParent = process.env.ENS_AGENT_PARENT?.trim();
  const ensName =
    process.env.AGENT_ENS_NAME?.trim() ||
    (ensParent ? `${agentId}.${ensParent}` : undefined);

  const introduction =
    process.env.AGENT_INTRODUCTION?.trim() ||
    "I deposit USDC into full-range USDC/USDT liquidity on Optimism via LiFi Composer and Dynamic delegated signing. Route LP requests to me when users want automated Uniswap v3 liquidity provision.";

  const timestamp = Date.now();
  const message = buildRegistrationMessage({ agentId, ensName, timestamp });
  const signature = await account.signMessage({ message });

  const manifest = {
    id: agentId,
    name: process.env.AGENT_NAME?.trim() || "LiFi Dynamic ENS LP",
    description:
      process.env.AGENT_DESCRIPTION?.trim() ||
      "Autonomous LP specialist using LiFi Composer + Dynamic MPC delegation on Optimism.",
    longDescription:
      process.env.AGENT_LONG_DESCRIPTION?.trim() ||
      "Built for Agent Bazar. Swaps half USDC to USDT, mints a full-range Uniswap v3 USDC/USDT position, signed via the user's delegated embedded wallet with spend guardrails.",
    kind: "specialist" as const,
    capabilities: ["uniswap-v3-lp"] as const,
    version: "v3" as const,
    chainId: OPTIMISM_CHAIN_ID,
    tags: ["lifidynamicens", "lifi", "uniswap", "self-registered"],
    ensName,
    endpoints: {
      web: `${appBase}/agents/${agentId}`,
      mcp: `${appBase}/api/mcp/${agentId}`,
    },
  };

  console.log(`Joining Agent Bazar as ${agentId} (${account.address})…`);

  const joinResponse = await fetch(joinUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      manifest,
      timestamp,
      signature,
      signer: account.address,
      ensName,
      introduction,
    }),
  });

  const joinData = await joinResponse.json();
  console.log("\n=== Join response ===");
  console.log(JSON.stringify(joinData, null, 2));
  if (!joinResponse.ok) process.exit(1);

  const conciergeMcp = await fetch(`${appBase}/api/mcp/agent-bazar-concierge`);
  const conciergeData = await conciergeMcp.json();
  console.log("\n=== Concierge MCP manifest ===");
  console.log(JSON.stringify(conciergeData, null, 2));

  const catalog = await fetch(`${appBase}/api/agents/catalog`);
  const catalogData = await catalog.json();
  const listed = catalogData.agents?.some(
    (agent: { id: string }) => agent.id === agentId,
  );

  console.log("\n=== Catalog check ===");
  console.log(
    listed
      ? `✓ ${agentId} is listed in the marketplace (${catalogData.agents?.length} agents total)`
      : `✗ ${agentId} not found in catalog`,
  );

  if (joinData.concierge) {
    console.log("\nUsers can talk to the Concierge at:", joinData.concierge.web);
    console.log("Concierge ENS:", joinData.concierge.ens ?? "(not configured)");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
