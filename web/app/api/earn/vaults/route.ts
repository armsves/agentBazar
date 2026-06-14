import { NextResponse } from "next/server";

import { fetchEarnVaults } from "@/lib/earn/vaults";
import { OPTIMISM_CHAIN_ID } from "../../../../../src/optimism";

/** GET /api/earn/vaults — LiFi Earn vaults on Optimism (server-side API key) */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chainId = Number(searchParams.get("chainId") ?? OPTIMISM_CHAIN_ID);
  const sortBy = (searchParams.get("sortBy") ?? "apy") as "apy" | "tvl";
  const limit = Number(searchParams.get("limit") ?? 5);

  try {
    const vaults = await fetchEarnVaults({ chainId, sortBy, limit });
    return NextResponse.json({
      success: true,
      chainId,
      sortBy,
      count: vaults.length,
      vaults: vaults.map((vault) => ({
        name: vault.name,
        slug: vault.slug,
        address: vault.address,
        protocol: vault.protocol.name,
        apyTotal: vault.analytics.apy.total,
        apy30d: vault.analytics.apy30d,
        tvlUsd: vault.analytics.tvl.usd,
        tags: vault.tags,
        verificationStatus: vault.verificationStatus,
        underlying: vault.underlyingTokens.map((t) => t.symbol),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Earn API failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
