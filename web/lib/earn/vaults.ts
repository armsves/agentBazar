import { env } from "@/env";
import { OPTIMISM_CHAIN_ID } from "../../../src/optimism";

const EARN_BASE_URL = "https://earn.li.fi/v1";

export type EarnVaultToken = {
  symbol: string;
  address: string;
  decimals: number;
  priceUsd?: string;
};

export type EarnVault = {
  name: string;
  slug: string;
  address: string;
  chainId: number;
  network: string;
  tags: string[];
  protocol: { id: string; name: string; url?: string };
  analytics: {
    apy: { base: number; total: number; reward: number };
    tvl: { usd: number };
    apy1d?: number;
    apy7d?: number;
    apy30d?: number;
  };
  underlyingTokens: EarnVaultToken[];
  verificationStatus: string;
  verificationStatusBreakdown?: Array<{ reason: string; result: string }>;
  isRedeemable: boolean;
  isTransactional: boolean;
};

export type EarnVaultsResponse = {
  data: EarnVault[];
  nextCursor?: string;
  total?: number;
};

export async function fetchEarnVaults(params?: {
  chainId?: number;
  sortBy?: "apy" | "tvl";
  limit?: number;
}): Promise<EarnVault[]> {
  const chainId = params?.chainId ?? OPTIMISM_CHAIN_ID;
  const sortBy = params?.sortBy ?? "apy";
  const limit = params?.limit ?? 5;

  const url = new URL(`${EARN_BASE_URL}/vaults`);
  url.searchParams.set("chainId", String(chainId));
  url.searchParams.set("sortBy", sortBy);
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url.toString(), {
    headers: {
      "x-lifi-api-key": env.LIFI_API_KEY,
      Accept: "application/json",
    },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LiFi Earn API error ${response.status}: ${text}`);
  }

  const json = (await response.json()) as EarnVaultsResponse;
  return json.data ?? [];
}

export type RiskProfile = "conservative" | "balanced" | "aggressive";

export type PortfolioAllocation = {
  vaultName: string;
  slug: string;
  protocol: string;
  address: string;
  apyTotal: number;
  apy30d: number;
  tvlUsd: number;
  percent: number;
  amountUsdc: number;
  tags: string[];
  flagged: boolean;
  rationale: string;
};

export type PortfolioSuggestion = {
  riskProfile: RiskProfile;
  totalUsdc: number;
  allocations: PortfolioAllocation[];
  warnings: string[];
  summary: string;
};

function isStablecoinVault(vault: EarnVault): boolean {
  return vault.tags.includes("stablecoin") || vault.tags.includes("single");
}

function scoreVault(vault: EarnVault, riskProfile: RiskProfile): number {
  const apy30d = vault.analytics.apy30d ?? vault.analytics.apy.total;
  const tvl = vault.analytics.tvl.usd;
  const flagged = vault.verificationStatus === "flagged";

  let score = apy30d * Math.log10(Math.max(tvl, 1_000));

  if (isStablecoinVault(vault)) score *= 1.35;
  if (flagged) score *= riskProfile === "aggressive" ? 0.85 : 0.35;
  if (vault.tags.includes("il-risk") && riskProfile === "conservative") {
    score *= 0.2;
  }

  return score;
}

function buildRationale(vault: EarnVault, percent: number): string {
  const apy = vault.analytics.apy.total;
  const apy30d = vault.analytics.apy30d ?? apy;
  const parts = [
    `${percent}% into ${vault.protocol.name} ${vault.name}`,
    `~${apy.toFixed(2)}% APY (${apy30d.toFixed(2)}% 30d)`,
    `$${Math.round(vault.analytics.tvl.usd).toLocaleString()} TVL`,
  ];
  if (vault.verificationStatus === "flagged") {
    parts.push("⚠ flagged outlier — size carefully");
  }
  if (vault.tags.includes("il-risk")) parts.push("impermanent-loss risk");
  if (isStablecoinVault(vault)) parts.push("stablecoin sleeve");
  return parts.join(" · ");
}

export function suggestPortfolioBalance(params: {
  totalUsdc: number;
  riskProfile: RiskProfile;
  vaults: EarnVault[];
}): PortfolioSuggestion {
  const { totalUsdc, riskProfile } = params;
  const warnings: string[] = [];

  let pool = [...params.vaults];
  if (riskProfile === "conservative") {
    pool = pool.filter((v) => v.verificationStatus !== "flagged");
  }

  const ranked = pool
    .map((vault) => ({ vault, score: scoreVault(vault, riskProfile) }))
    .sort((a, b) => b.score - a.score);

  const pickCount =
    riskProfile === "conservative" ? 2 : riskProfile === "balanced" ? 3 : 4;
  const picks = ranked.slice(0, Math.min(pickCount, ranked.length));

  if (!picks.length) {
    return {
      riskProfile,
      totalUsdc,
      allocations: [],
      warnings: ["No suitable vaults found for this risk profile."],
      summary: "Could not build a portfolio suggestion.",
    };
  }

  const weightTotal = picks.reduce((sum, item) => sum + item.score, 0);
  const rawPercents = picks.map((item) =>
    weightTotal > 0 ? (item.score / weightTotal) * 100 : 100 / picks.length,
  );

  const rounded = rawPercents.map((p) => Math.round(p));
  let drift = 100 - rounded.reduce((a, b) => a + b, 0);
  rounded[0] += drift;

  const allocations: PortfolioAllocation[] = picks.map((item, index) => {
    const percent = rounded[index];
    const vault = item.vault;
    const flagged = vault.verificationStatus === "flagged";

    if (flagged) {
      warnings.push(
        `${vault.name} is flagged (${vault.verificationStatusBreakdown?.[0]?.reason ?? "outlier"}) — treat as speculative.`,
      );
    }

    return {
      vaultName: vault.name,
      slug: vault.slug,
      protocol: vault.protocol.name,
      address: vault.address,
      apyTotal: vault.analytics.apy.total,
      apy30d: vault.analytics.apy30d ?? vault.analytics.apy.total,
      tvlUsd: vault.analytics.tvl.usd,
      percent,
      amountUsdc: Math.round((totalUsdc * percent) / 100),
      tags: vault.tags,
      flagged,
      rationale: buildRationale(vault, percent),
    };
  });

  const summary = `Suggested ${riskProfile} split of ${totalUsdc} USDC across ${allocations.length} Optimism earn vaults (LiFi Earn data).`;

  return { riskProfile, totalUsdc, allocations, warnings, summary };
}
