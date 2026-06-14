import type { Address } from "@lifi/composer-sdk";

import { logExecution } from "@/lib/agents/executions/storage";
import {
  getGrant,
  recordDailySpend,
  withAllowedVersion,
  persistGrant,
} from "@/lib/agents/grants/storage";
import { runDepositFlow, runWithdrawFlow } from "@/lib/agents/lp-actions";
import { getAgentByIdMerged } from "@/lib/agents/registry/merge";
import type { AgentExecuteInput, AgentLpAction } from "@/lib/agents/types";
import {
  executeCompiledDeposit,
  type BuildDepositResult,
  type BuildWithdrawResult,
  type ExecuteDepositResult,
} from "@/lib/composer/runMint";
import { getDelegationByAddress } from "@/lib/dynamic/delegation/storage";
import { normalizeChain } from "@/lib/dynamic/delegation/chain";
import { assertGuardrails } from "@/lib/guardrails/engine";

export type AgentExecuteResult =
  | {
      dryRun: true;
      action: "deposit";
      preview: BuildDepositResult;
      agentId: string;
      grant: { maxUsdcPerTx: string; maxUsdcDaily: string };
    }
  | {
      dryRun: true;
      action: "withdraw";
      preview: BuildWithdrawResult;
      agentId: string;
      grant: { maxUsdcPerTx: string; maxUsdcDaily: string };
    }
  | {
      dryRun: false;
      action: AgentLpAction;
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
  const action: AgentLpAction = params.input.action ?? "deposit";

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

  if (action === "withdraw") {
    const built = await runWithdrawFlow({
      owner: address,
      version,
      input: params.input,
    });

    assertGuardrails(grant, version, 0n, built.compile, address, "withdraw");

    if (dryRun) {
      return {
        dryRun: true,
        action: "withdraw",
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

      await logExecution({
        userId: params.userId,
        agentId: params.agentId,
        walletAddress: address,
        version,
        usdcAmount: "0",
        usdtAmount: "0",
        dryRun: false,
        status: "success",
        composeHash: result.composeHash,
      });

      return {
        dryRun: false,
        action: "withdraw",
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
        usdcAmount: "0",
        usdtAmount: "0",
        dryRun: false,
        status: "failed",
        error: message,
      });
      throw error;
    }
  }

  const built = await runDepositFlow({
    owner: address,
    version,
    agentId: params.agentId,
    input: params.input,
  });

  const totalUsdc = BigInt(built.totalUsdcDeposit);
  assertGuardrails(grant, version, totalUsdc, built.compile, address, "deposit");

  if (dryRun) {
    return {
      dryRun: true,
      action: "deposit",
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
      action: "deposit",
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
