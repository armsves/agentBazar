import type { Address } from "@lifi/composer-sdk";

import type { AgentExecuteInput } from "@/lib/agents/types";
import {
  buildAndCompileDeposit,
  buildAndCompileWithdraw,
  type BuildDepositResult,
  type BuildWithdrawResult,
} from "@/lib/composer/runMint";

export const COMPOSER_MANAGER_AGENT_IDS = new Set([
  "composer-v3-lp",
  "composer-v4-lp",
]);

export function isComposerManagerAgent(agentId: string): boolean {
  return COMPOSER_MANAGER_AGENT_IDS.has(agentId);
}

export async function runDepositFlow(params: {
  owner: Address;
  version: "v3" | "v4";
  agentId: string;
  input: AgentExecuteInput;
}): Promise<BuildDepositResult> {
  return buildAndCompileDeposit({
    owner: params.owner,
    version: params.version,
    usdcAmount: params.input.usdcAmount,
    usdtAmount: params.input.usdtAmount,
    mintNftToProxy: isComposerManagerAgent(params.agentId),
    skipPreflight: params.input.dryRun === true,
  });
}

export async function runWithdrawFlow(params: {
  owner: Address;
  version: "v3" | "v4";
  input: AgentExecuteInput;
}): Promise<BuildWithdrawResult> {
  if (!params.input.tokenId) {
    throw new Error("tokenId is required for withdraw");
  }

  return buildAndCompileWithdraw({
    owner: params.owner,
    version: params.version,
    tokenId: params.input.tokenId,
    liquidity: params.input.liquidity,
  });
}
