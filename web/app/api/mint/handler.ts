import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { agentIdForVersion } from "@/lib/agents/registry";
import { executeAgentAction } from "@/lib/agents/execute";
import {
  type AuthenticatedUser,
  userOwnsAddress,
} from "@/lib/dynamic/dynamic-auth";
import { depositMetadata } from "@/lib/composer/runMint";
import { MintRequestSchema } from "./schema";

/**
 * Mint/deposit handler — routes through agent execute with guardrails.
 * Requires Dynamic JWT, delegation share, and installed agent grant.
 */
export async function handleMintRequest(
  request: NextRequest,
  user: AuthenticatedUser,
): Promise<NextResponse> {
  const body = await request.json();
  const validationResult = MintRequestSchema.safeParse(body);

  if (!validationResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request body",
        details: validationResult.error.issues,
      },
      { status: 400 },
    );
  }

  const { address, chain, version, usdcAmount, usdtAmount, dryRun } =
    validationResult.data;

  if (!userOwnsAddress(user, address)) {
    return NextResponse.json(
      {
        success: false,
        error: "You are not authorized to mint for this address",
      },
      { status: 403 },
    );
  }

  const agentId = agentIdForVersion(version);

  try {
    const result = await executeAgentAction({
      userId: user.sub,
      agentId,
      input: {
        address,
        chain,
        action: "deposit",
        usdcAmount,
        usdtAmount,
        dryRun: dryRun ?? false,
      },
    });

    if (result.dryRun && result.action === "deposit") {
      const { preview } = result;
      const { compile } = preview;
      return NextResponse.json(
        {
          success: true,
          dryRun: true,
          version,
          agentId,
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
        },
        { status: 200 },
      );
    }

    if (!result.dryRun) {
      const { result: executed } = result;
      return NextResponse.json(
        {
          success: true,
          dryRun: false,
          version,
          agentId,
          userProxy: executed.userProxy,
          approvalHashes: executed.approvalHashes,
          composeHash: executed.composeHash,
          liquidity: executed.liquidity,
          explorerUrl: `https://optimistic.etherscan.io/tx/${executed.composeHash}`,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { success: false, error: "Unexpected execute result" },
      { status: 500 },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Mint failed";

    const status = errorMessage.includes("No grant")
      ? 403
      : errorMessage.includes("No delegation")
        ? 404
        : 500;

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status },
    );
  }
}
