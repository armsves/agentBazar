/**
 * Local smoke test for marketplace agents before deploy.
 * Run: cd web && npx tsx scripts/verify-agents-local.ts
 */
import type { Address } from "@lifi/composer-sdk";

import { AGENT_REGISTRY } from "@/lib/agents/registry";
import { runDepositFlow } from "@/lib/agents/lp-actions";
import type { UserAgentGrant } from "@/lib/agents/types";
import { assertGuardrails } from "@/lib/guardrails/engine";
import { fetchEarnVaults, suggestPortfolioBalance } from "@/lib/earn/vaults";

const OWNER = "0x08260cf1ac569220d871e92f881153fd6bc01895" as Address;

const LP_DEPOSIT_AGENTS = [
  "uniswap-v3-lp",
  "uniswap-v4-lp",
  "composer-v3-lp",
  "composer-v4-lp",
  "lifidynamicens-lp",
] as const;

function makeGrant(agentId: string, version: "v3" | "v4"): UserAgentGrant {
  const today = new Date().toISOString().slice(0, 10);
  return {
    agentId,
    userId: "verify-local",
    walletAddress: OWNER,
    chain: "EVM",
    allowedVersions: [version],
    maxUsdcPerTx: "10000000",
    maxUsdcDaily: "50000000",
    dailySpentUsdc: "0",
    dailySpentDate: today,
    installedAt: new Date().toISOString(),
  };
}

function toAtomicHalf(totalUsdc: number): { usdc: string; usdt: string } {
  const half = Math.round((totalUsdc / 2) * 1_000_000);
  return { usdc: String(half), usdt: String(half) };
}

async function verifyLpDeposit(agentId: string, totalUsdc: number): Promise<void> {
  const agent = AGENT_REGISTRY.find((a) => a.id === agentId);
  if (!agent) throw new Error(`Unknown agent ${agentId}`);

  const { usdc, usdt } = toAtomicHalf(totalUsdc);
  const built = await runDepositFlow({
    owner: OWNER,
    version: agent.version,
    agentId,
    input: {
      address: OWNER,
      chain: "EVM",
      action: "deposit",
      usdcAmount: usdc,
      usdtAmount: usdt,
      dryRun: true,
    },
  });

  if (built.compile.status !== "success") {
    throw new Error(`Compile failed for ${agentId}`);
  }

  const grant = makeGrant(agentId, agent.version);
  assertGuardrails(
    grant,
    agent.version,
    BigInt(built.totalUsdcDeposit),
    built.compile,
    OWNER,
    "deposit",
  );

  const totalHuman = Number(built.totalUsdcDeposit) / 1e6;
  console.log(
    `  ✓ ${agentId} (${agent.version}) — compile OK, guardrails OK, total=${totalHuman} USDC, proxy=${built.userProxy ?? "n/a"}`,
  );
}

async function verifyEarnBalancer(): Promise<void> {
  const vaults = await fetchEarnVaults({ sortBy: "apy", limit: 5 });
  if (vaults.length === 0) {
    throw new Error("fetchEarnVaults returned no vaults");
  }

  const suggestion = suggestPortfolioBalance({
    totalUsdc: 100,
    riskProfile: "balanced",
    vaults,
  });

  if (!suggestion.allocations?.length) {
    throw new Error("suggestPortfolioBalance returned no allocations");
  }

  console.log(
    `  ✓ lifi-earn-balancer — ${vaults.length} vaults, ${suggestion.allocations.length} allocation rows`,
  );
}

async function verifyRegistry(): Promise<void> {
  const ids = AGENT_REGISTRY.map((a) => a.id);
  const expected = [
    "agent-bazar-concierge",
    "uniswap-v3-lp",
    "uniswap-v4-lp",
    "composer-v3-lp",
    "composer-v4-lp",
    "lifi-earn-balancer",
    "lifidynamicens-lp",
  ];
  for (const id of expected) {
    if (!ids.includes(id)) {
      throw new Error(`Missing registry agent: ${id}`);
    }
  }
  console.log(`  ✓ registry — ${ids.length} agents registered`);
}

async function main(): Promise<void> {
  process.env.LIFI_API_KEY =
    process.env.LIFI_API_KEY ??
    (() => {
      try {
        const fs = require("node:fs");
        const path = require("node:path");
        const envPath = path.join(process.cwd(), ".env");
        const line = fs
          .readFileSync(envPath, "utf8")
          .split("\n")
          .find((l: string) => l.startsWith("LIFI_API_KEY="));
        return line?.slice("LIFI_API_KEY=".length).trim();
      } catch {
        return undefined;
      }
    })();

  if (!process.env.LIFI_API_KEY) {
    throw new Error("LIFI_API_KEY missing — set in web/.env");
  }

  process.env.RPC_URL = process.env.RPC_URL ?? "https://mainnet.optimism.io";
  process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID = "verify";
  process.env.DYNAMIC_API_TOKEN = "verify";
  process.env.DYNAMIC_WEBHOOK_SECRET = "verify";
  process.env.DYNAMIC_DELEGATION_PRIVATE_KEY = "verify";

  console.log("Agent Bazar local verification\n");

  console.log("Registry:");
  await verifyRegistry();

  console.log("\nLP deposit dry-runs (1 USDC each):");
  for (const agentId of LP_DEPOSIT_AGENTS) {
    await verifyLpDeposit(agentId, 1);
  }

  console.log("\nLP deposit dry-runs (2 USDC — v4 cap regression):");
  await verifyLpDeposit("uniswap-v4-lp", 2);
  await verifyLpDeposit("uniswap-v3-lp", 2);

  console.log("\nAdvisor:");
  await verifyEarnBalancer();

  console.log("\nAll checks passed.");
}

main().catch((err) => {
  console.error("\n✗ Verification failed:");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
