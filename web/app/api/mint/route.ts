import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { type AuthenticatedUser, withAuth } from "@/lib/dynamic/dynamic-auth";
import { handleMintRequest } from "./handler";

/**
 * POST /api/mint — build (dryRun) or execute a Uniswap v3/v4 LP deposit.
 * Requires Dynamic JWT + user-approved delegation share. No EVM private keys.
 */
export const POST = withAuth(
  async (req: NextRequest, { user }: { user: AuthenticatedUser }) => {
    try {
      return await handleMintRequest(req, user);
    } catch (error) {
      console.error("Mint error:", error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "Internal server error",
        },
        { status: 500 },
      );
    }
  },
);
