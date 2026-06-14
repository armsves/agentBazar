#!/usr/bin/env tsx
/**
 * Autonomous agent self-registration — signs a manifest and POSTs to /api/agents/register.
 *
 * Env:
 *   AGENT_SIGNER_KEY or PRIVATE_KEY — wallet that signs registration
 *   AGENT_REGISTER_URL — default http://localhost:3000/api/agents/register
 *   AGENT_ID, AGENT_NAME, AGENT_ENS_NAME — override defaults
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { privateKeyToAccount } from "viem/accounts";

import { OPTIMISM_CHAIN_ID } from "../../src/optimism";
import { buildRegistrationMessage } from "../lib/agents/registry/verify-registration";

function loadPrivateKey(): `0x${string}` {
  let pk =
    process.env.AGENT_SIGNER_KEY?.trim() || process.env.PRIVATE_KEY?.trim();
  if (!pk) {
    const envPath = resolve(process.cwd(), "../.env");
    if (existsSync(envPath)) {
      const match = readFileSync(envPath, "utf8").match(/^PRIVATE_KEY=(.+)$/m);
      if (match?.[1]?.trim()) pk = match[1].trim().replace(/^["']|["']$/g, "");
    }
  }
  if (!pk) throw new Error("Set AGENT_SIGNER_KEY or PRIVATE_KEY");
  if (!pk.startsWith("0x")) pk = `0x${pk}`;
  return pk as `0x${string}`;
}

async function main() {
  const account = privateKeyToAccount(loadPrivateKey());
  const baseUrl =
    process.env.AGENT_REGISTER_URL?.trim() ||
    "http://localhost:3000/api/agents/register";

  const agentId = process.env.AGENT_ID?.trim() || "demo-lp-agent";
  const ensName =
    process.env.AGENT_ENS_NAME?.trim() ||
    (process.env.ENS_AGENT_PARENT
      ? `${agentId}.${process.env.ENS_AGENT_PARENT.trim()}`
      : undefined);

  const timestamp = Date.now();
  const message = buildRegistrationMessage({ agentId, ensName, timestamp });
  const signature = await account.signMessage({ message });

  const manifest = {
    id: agentId,
    name: process.env.AGENT_NAME?.trim() || "Demo LP Agent",
    description:
      process.env.AGENT_DESCRIPTION?.trim() ||
      "Autonomously registered specialist agent for USDC/USDT LP deposits.",
    longDescription:
      process.env.AGENT_LONG_DESCRIPTION?.trim() ||
      "Self-registered via Agent Bazar autonomous registration API with wallet signature attestation.",
    kind: "specialist" as const,
    capabilities: ["uniswap-v3-lp"] as const,
    version: "v3" as const,
    chainId: OPTIMISM_CHAIN_ID,
    tags: ["self-registered", "demo"],
    ensName,
  };

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      manifest,
      timestamp,
      signature,
      signer: account.address,
      ensName,
    }),
  });

  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
  if (!response.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
