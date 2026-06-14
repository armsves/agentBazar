import type { ComposeCompileSuccessData } from "@lifi/compose-spec";

import type { UserAgentGrant } from "@/lib/agents/types";
import {
  LIFI_COMPOSER_PROXY_FACTORY,
  PERMIT2,
  USDC,
  USDT,
  UNISWAP_V3_POSITION_MANAGER,
  UNISWAP_V3_SWAP_ROUTER,
  UNISWAP_V4_POOL_MANAGER,
  UNISWAP_V4_POSITION_MANAGER,
  UNISWAP_V4_STATE_VIEW,
} from "../../../src/optimism";

export type GuardrailViolation = {
  code:
    | "VERSION_NOT_ALLOWED"
    | "SPEND_CAP_PER_TX"
    | "SPEND_CAP_DAILY"
    | "CONTRACT_NOT_ALLOWED"
    | "CHAIN_NOT_ALLOWED";
  message: string;
};

const ALLOWED_V3 = new Set(
  [
    USDC,
    USDT,
    PERMIT2,
    LIFI_COMPOSER_PROXY_FACTORY,
    UNISWAP_V3_SWAP_ROUTER,
    UNISWAP_V3_POSITION_MANAGER,
  ].map((a) => a.toLowerCase()),
);

const ALLOWED_V4 = new Set(
  [
    USDC,
    USDT,
    PERMIT2,
    LIFI_COMPOSER_PROXY_FACTORY,
    // v4 deposit still swaps USDC→USDT via the v3 SwapRouter02 before minting
    UNISWAP_V3_SWAP_ROUTER,
    UNISWAP_V4_POSITION_MANAGER,
    UNISWAP_V4_POOL_MANAGER,
    UNISWAP_V4_STATE_VIEW,
  ].map((a) => a.toLowerCase()),
);

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function validateGrantSpend(
  grant: UserAgentGrant,
  version: "v3" | "v4",
  usdcAmount: bigint,
): GuardrailViolation | null {
  if (!grant.allowedVersions.includes(version)) {
    return {
      code: "VERSION_NOT_ALLOWED",
      message: `Agent grant does not allow Uniswap ${version}. Re-install or update grant.`,
    };
  }

  const maxPerTx = BigInt(grant.maxUsdcPerTx);
  if (usdcAmount > maxPerTx) {
    return {
      code: "SPEND_CAP_PER_TX",
      message: `USDC amount ${usdcAmount} exceeds per-tx cap ${maxPerTx} (6 decimals).`,
    };
  }

  const today = todayUtc();
  const dailySpent =
    grant.dailySpentDate === today ? BigInt(grant.dailySpentUsdc) : 0n;
  const maxDaily = BigInt(grant.maxUsdcDaily);

  if (dailySpent + usdcAmount > maxDaily) {
    return {
      code: "SPEND_CAP_DAILY",
      message: `Would exceed daily USDC cap: spent ${dailySpent} + ${usdcAmount} > ${maxDaily}.`,
    };
  }

  return null;
}

function collectTxTargets(
  compiled: ComposeCompileSuccessData & { status: "success" },
  owner: string,
): string[] {
  const targets: string[] = [];

  if (compiled.transactionRequest?.to) {
    targets.push(String(compiled.transactionRequest.to).toLowerCase());
  }

  for (const approval of compiled.approvals ?? []) {
    if (approval.transactionRequest?.to) {
      targets.push(String(approval.transactionRequest.to).toLowerCase());
    }
  }

  if (compiled.userProxy) {
    targets.push(compiled.userProxy.toLowerCase());
  }

  targets.push(owner.toLowerCase());
  return targets;
}

export function validateCompiledContracts(
  compiled: ComposeCompileSuccessData & { status: "success" },
  version: "v3" | "v4",
  owner: string,
): GuardrailViolation | null {
  const allowlist = version === "v4" ? ALLOWED_V4 : ALLOWED_V3;
  const targets = collectTxTargets(compiled, owner);

  const ownerLower = owner.toLowerCase();
  const userProxyLower = compiled.userProxy?.toLowerCase();

  for (const target of targets) {
    if (target === ownerLower) continue;
    if (userProxyLower && target === userProxyLower) continue;
    if (!allowlist.has(target)) {
      return {
        code: "CONTRACT_NOT_ALLOWED",
        message: `Transaction targets disallowed contract: ${target}`,
      };
    }
  }

  return null;
}

export function assertGuardrails(
  grant: UserAgentGrant,
  version: "v3" | "v4",
  usdcAmount: bigint,
  compiled: ComposeCompileSuccessData & { status: "success" },
  owner: string,
  action: "deposit" | "withdraw" = "deposit",
): void {
  if (action === "withdraw") {
    const contractViolation = validateCompiledContracts(compiled, version, owner);
    if (contractViolation) {
      throw new Error(`Guardrail: ${contractViolation.message}`);
    }
    return;
  }

  const spendViolation = validateGrantSpend(grant, version, usdcAmount);
  if (spendViolation) {
    throw new Error(`Guardrail: ${spendViolation.message}`);
  }

  const contractViolation = validateCompiledContracts(compiled, version, owner);
  if (contractViolation) {
    throw new Error(`Guardrail: ${contractViolation.message}`);
  }
}
