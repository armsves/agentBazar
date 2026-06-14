import type { Address } from "@lifi/composer-sdk";

import { logExecution } from "@/lib/agents/executions/storage";
import {
  getGrant,
  recordDailySpend,
  withAllowedVersion,
  persistGrant,
} from "@/lib/agents/grants/storage";
import { getAgentByIdMerged } from "@/lib/agents/registry/merge";
import type { AgentExecuteInput } from "@/lib/agents/types";
import {
  buildAndCompileDeposit,
  executeCompiledDeposit,
  type BuildDepositResult,
  type ExecuteDepositResult,
} from "@/lib/composer/runMint";
import { getDelegationByAddress } from "@/lib/dynamic/delegation/storage";
import { normalizeChain } from "@/lib/dynamic/delegation/chain";
import { assertGuardrails } from "@/lib/guardrails/engine";

export type AgentExecuteResult =
  | {
      dryRun: true;
      preview: BuildDepositResult;
      agentId: string;
      grant: { maxUsdcPerTx: string; maxUsdcDaily: string };
    }
  | {
      dryRun: false;
      result: ExecuteDepositResult & { liquidity?: string };
      agentId: string;
    };

export async function executeAgentAction(params: {
  userId: string;
  agentId: string;
  input: AgentExecuteInput;
}): Promise<AgentExecuteResult> {
  const agent = await getAgentByIdMerged(params.agentId);
  if (!agent) {
    throw new Error(`Unknown agent: ${params.agentId}`);
  }

  const chain = normalizeChain(params.input.chain);
  const address = params.input.address.toLowerCase() as Address;
  const dryRun = params.input.dryRun ?? false;
  const version = agent.version;

  let grant = await getGrant(params.userId, params.agentId);
  if (!grant) {
    throw new Error(
      `No grant for agent "${agent.name}". Install the agent from the marketplace first.`,
    );
  }

  if (grant.walletAddress !== address) {
    throw new Error(
      `Grant wallet ${grant.walletAddress} does not match ${address}`,
    );
  }

  if (grant.chain !== chain) {
    throw new Error(`Grant chain ${grant.chain} does not match ${chain}`);
  }

  grant = withAllowedVersion(grant, version);
  if (!grant.allowedVersions.includes(version)) {
    await persistGrant(grant);
  }

  const delegation = await getDelegationByAddress(address, chain);
  if (!delegation) {
    throw new Error(
      `No delegation found for ${address} on ${chain}. Delegate your wallet first.`,
    );
  }

  const built = await buildAndCompileDeposit({
    owner: address,
    version,
    usdcAmount: params.input.usdcAmount,
    usdtAmount: params.input.usdtAmount,
  });

  const totalUsdc = BigInt(built.totalUsdcDeposit);
  assertGuardrails(grant, version, totalUsdc, built.compile, address);

  if (dryRun) {
    return {
      dryRun: true,
      preview: built,
      agentId: params.agentId,
      grant: {
        maxUsdcPerTx: grant.maxUsdcPerTx,
        maxUsdcDaily: grant.maxUsdcDaily,
      },
    };
  }

  try {
    const result = await executeCompiledDeposit(
      address,
      delegation,
      built.compile,
    );

    await recordDailySpend(grant, totalUsdc);

    await logExecution({
      userId: params.userId,
      agentId: params.agentId,
      walletAddress: address,
      version,
      usdcAmount: built.usdcAmount,
      usdtAmount: built.usdtAmount,
      dryRun: false,
      status: "success",
      composeHash: result.composeHash,
    });

    return {
      dryRun: false,
      result: { ...result, liquidity: built.liquidity },
      agentId: params.agentId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await logExecution({
      userId: params.userId,
      agentId: params.agentId,
      walletAddress: address,
      version,
      usdcAmount: built.usdcAmount,
      usdtAmount: built.usdtAmount,
      dryRun: false,
      status: "failed",
      error: message,
    });

    throw error;
  }
}
