import { NextResponse } from "next/server";

import { executeAgentAction } from "@/lib/agents/execute";
import { getAgentByIdMerged } from "@/lib/agents/registry/merge";
import { depositMetadata } from "@/lib/composer/runMint";
import { userOwnsAddress, withAuth } from "@/lib/dynamic/dynamic-auth";
import { ExecuteAgentSchema } from "../../schema";

type AgentParams = { agentId: string };

/** POST /api/agents/[agentId]/execute — dry-run or execute with guardrails */
export const POST = withAuth<AgentParams>(
  async (req, { user, params }) => {
    const { agentId } = params;
    const agent = await getAgentByIdMerged(agentId, { discoverEns: true });

    if (!agent || agent.kind === "orchestrator") {
      return NextResponse.json(
        {
          success: false,
          error: agent
            ? "Use /api/chat for the Concierge orchestrator"
            : `Agent not found: ${agentId}`,
        },
        { status: agent ? 400 : 404 },
      );
    }

    if (agent.kind === "advisor") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Advisor agents provide recommendations via /api/chat — no on-chain execution.",
        },
        { status: 400 },
      );
    }

    const body = await req.json();
    const parsed = ExecuteAgentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          details: parsed.error.issues,
        },
        { status: 400 },
      );
    }

    const {
      address,
      chain,
      action,
      usdcAmount,
      usdtAmount,
      tokenId,
      liquidity,
      dryRun,
    } = parsed.data;

    if (action === "withdraw" && !tokenId) {
      return NextResponse.json(
        { success: false, error: "tokenId is required for withdraw" },
        { status: 400 },
      );
    }

    if (!userOwnsAddress(user, address)) {
      return NextResponse.json(
        { success: false, error: "You are not authorized for this wallet" },
        { status: 403 },
      );
    }

    try {
      const result = await executeAgentAction({
        userId: user.sub,
        agentId,
        input: {
          address,
          chain,
          action,
          usdcAmount,
          usdtAmount,
          tokenId,
          liquidity,
          dryRun,
        },
      });

      if (result.dryRun && result.action === "withdraw") {
        const { preview } = result;
        const { compile } = preview;
        return NextResponse.json({
          success: true,
          dryRun: true,
          action: "withdraw",
          agentId,
          version: agent.version,
          tokenId: preview.tokenId,
          liquidity: preview.liquidity,
          userProxy: compile.userProxy ?? preview.userProxy,
          approvalsRequired: compile.approvals?.length ?? 0,
          guardrails: result.grant,
          transaction: {
            to: compile.transactionRequest.to,
            value: compile.transactionRequest.value,
            gasLimit: compile.transactionRequest.gasLimit,
          },
        });
      }

      if (result.dryRun && result.action === "deposit") {
        const { preview } = result;
        const { compile } = preview;
        return NextResponse.json({
          success: true,
          dryRun: true,
          action: "deposit",
          agentId,
          version: agent.version,
          ...depositMetadata,
          usdcAmount: preview.usdcAmount,
          usdtAmount: preview.usdtAmount,
          totalUsdcDeposit: preview.totalUsdcDeposit,
          liquidity: preview.liquidity,
          userProxy: compile.userProxy ?? preview.userProxy,
          approvalsRequired: compile.approvals?.length ?? 0,
          guardrails: result.grant,
          transaction: {
            to: compile.transactionRequest.to,
            value: compile.transactionRequest.value,
            gasLimit: compile.transactionRequest.gasLimit,
          },
        });
      }

      if (!result.dryRun) {
        const { result: executed } = result;
        return NextResponse.json({
          success: true,
          dryRun: false,
          action: result.action,
          agentId,
          version: agent.version,
          userProxy: executed.userProxy,
          approvalHashes: executed.approvalHashes,
          composeHash: executed.composeHash,
          liquidity: executed.liquidity,
          explorerUrl: `https://optimistic.etherscan.io/tx/${executed.composeHash}`,
        });
      }

      return NextResponse.json(
        { success: false, error: "Unexpected dry-run result" },
        { status: 500 },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Execution failed";
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  },
);
