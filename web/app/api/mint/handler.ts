import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Address } from "@lifi/composer-sdk";

import {
  type AuthenticatedUser,
  userOwnsAddress,
} from "@/lib/dynamic/dynamic-auth";
import { getDelegationByAddress } from "@/lib/dynamic/delegation";
import {
  buildAndCompileDeposit,
  depositMetadata,
  runDelegatedDeposit,
} from "@/lib/composer/runMint";
import { MintRequestSchema } from "./schema";

/**
 * Mint/deposit handler — requires Dynamic JWT + an active delegation share.
 * All transaction signing uses the user's delegated MPC share (no EVM private keys).
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

  const delegation = await getDelegationByAddress(address, chain);
  if (!delegation) {
    return NextResponse.json(
      {
        success: false,
        error: `No delegation found for ${address} on ${chain}. Approve delegation in the Dynamic UI first.`,
      },
      { status: 404 },
    );
  }

  try {
    const owner = address as Address;

    if (dryRun) {
      const built = await buildAndCompileDeposit({
        owner,
        version,
        usdcAmount,
        usdtAmount,
      });

      const { compile } = built;
      return NextResponse.json(
        {
          success: true,
          dryRun: true,
          version,
          ...depositMetadata,
          usdcAmount: built.usdcAmount,
          usdtAmount: built.usdtAmount,
          totalUsdcDeposit: built.totalUsdcDeposit,
          liquidity: built.liquidity,
          userProxy: compile.userProxy ?? built.userProxy,
          approvalsRequired: compile.approvals?.length ?? 0,
          transaction: {
            to: compile.transactionRequest.to,
            value: compile.transactionRequest.value,
            gasLimit: compile.transactionRequest.gasLimit,
          },
        },
        { status: 200 },
      );
    }

    const result = await runDelegatedDeposit({
      owner,
      delegation,
      version,
      usdcAmount,
      usdtAmount,
    });

    return NextResponse.json(
      {
        success: true,
        dryRun: false,
        version,
        userProxy: result.userProxy,
        approvalHashes: result.approvalHashes,
        composeHash: result.composeHash,
        liquidity: result.liquidity,
        explorerUrl: `https://optimistic.etherscan.io/tx/${result.composeHash}`,
      },
      { status: 200 },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Mint failed";

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}
