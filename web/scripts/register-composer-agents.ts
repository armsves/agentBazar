#!/usr/bin/env tsx
/**
 * Register composer-v3-lp and composer-v4-lp with Agent Bazar + optional ENS publish.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { privateKeyToAccount } from "viem/accounts";
import { spawnSync } from "node:child_process";

import { OPTIMISM_CHAIN_ID } from "../../src/optimism";
import { AGENT_REGISTRY } from "../lib/agents/registry";
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

const AGENT_IDS = ["composer-v3-lp", "composer-v4-lp"] as const;

const INTRODUCTIONS: Record<(typeof AGENT_IDS)[number], string> = {
  "composer-v3-lp":
    "I manage full-range USDC/USDT Uniswap v3 liquidity on Optimism via LiFi Composer — deposit (mint) and withdraw (decrease + collect). Route v3 LP requests to me.",
  "composer-v4-lp":
    "I manage USDC/USDT Uniswap v4 positions via LiFi Composer and Permit2 — deposit via modifyLiquidities and withdraw via burn. Route v4 LP requests to me.",
};

async function joinAgent(
  account: ReturnType<typeof privateKeyToAccount>,
  appBase: string,
  agentId: (typeof AGENT_IDS)[number],
) {
  const agent = AGENT_REGISTRY.find((a) => a.id === agentId);
  if (!agent) throw new Error(`Missing registry entry: ${agentId}`);

  const ensParent = process.env.ENS_AGENT_PARENT?.trim();
  const ensName = ensParent ? `${agentId}.${ensParent}` : undefined;
  const timestamp = Date.now();
  const message = buildRegistrationMessage({ agentId, ensName, timestamp });
  const signature = await account.signMessage({ message });

  const joinUrl =
    process.env.AGENT_JOIN_URL?.trim() || `${appBase}/api/agents/join`;

  const response = await fetch(joinUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      manifest: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        longDescription: agent.longDescription,
        kind: agent.kind,
        capabilities: agent.capabilities,
        version: agent.version,
        chainId: OPTIMISM_CHAIN_ID,
        tags: agent.tags,
        ensName,
        endpoints: {
          web: `${appBase}/agents/${agent.id}`,
          mcp: `${appBase}/api/mcp/${agent.id}`,
        },
      },
      timestamp,
      signature,
      signer: account.address,
      ensName,
      introduction: INTRODUCTIONS[agentId],
    }),
  });

  const data = await response.json();
  console.log(`\n=== ${agentId} ===`);
  console.log(JSON.stringify(data, null, 2));
  if (!response.ok) throw new Error(`Join failed for ${agentId}`);
}

async function main() {
  const account = privateKeyToAccount(loadPrivateKey());
  const appBase =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://agent-bazar-eight.vercel.app";

  console.log(`Registering Composer LP agents as ${account.address}`);

  for (const agentId of AGENT_IDS) {
    await joinAgent(account, appBase, agentId);
  }

  if (process.env.SKIP_ENS_PUBLISH?.trim() === "true") {
    console.log("\nSkipping ENS publish (SKIP_ENS_PUBLISH=true)");
    return;
  }

  console.log("\nPublishing ENS records on Sepolia…");
  for (const agentId of AGENT_IDS) {
    const result = spawnSync(
      "npx",
      ["tsx", "scripts/ens-publish-agents-sepolia.ts"],
      {
        cwd: process.cwd(),
        env: { ...process.env, ENS_PUBLISH_AGENT_ID: agentId },
        encoding: "utf8",
        shell: false,
      },
    );
    if (result.status !== 0) {
      console.error(result.stderr || result.stdout);
      throw new Error(`ENS publish failed for ${agentId}`);
    }
    console.log(result.stdout);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
