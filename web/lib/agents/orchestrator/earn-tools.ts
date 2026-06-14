import { tool } from "ai";
import { z } from "zod";

import {
  fetchEarnVaults,
  suggestPortfolioBalance,
  type RiskProfile,
} from "@/lib/earn/vaults";

export function createEarnPortfolioTools() {
  return {
    fetch_earn_vaults: tool({
      description:
        "Fetch top LiFi Earn vaults on Optimism sorted by APY or TVL. Use before portfolio suggestions.",
      inputSchema: z.object({
        sortBy: z.enum(["apy", "tvl"]).default("apy"),
        limit: z.number().int().min(1).max(10).default(5),
      }),
      execute: async ({ sortBy, limit }) => {
        const vaults = await fetchEarnVaults({ sortBy, limit });
        return {
          success: true,
          count: vaults.length,
          vaults: vaults.map((vault) => ({
            name: vault.name,
            protocol: vault.protocol.name,
            address: vault.address,
            apyTotal: vault.analytics.apy.total,
            apy30d: vault.analytics.apy30d,
            tvlUsd: vault.analytics.tvl.usd,
            tags: vault.tags,
            verificationStatus: vault.verificationStatus,
            underlying: vault.underlyingTokens.map((t) => t.symbol),
          })),
        };
      },
    }),

    suggest_portfolio_balance: tool({
      description:
        "Suggest how to balance USDC across LiFi Earn vaults on Optimism for a given risk profile.",
      inputSchema: z.object({
        totalUsdc: z
          .number()
          .positive()
          .describe("Total USDC to allocate across vaults (human units)"),
        riskProfile: z
          .enum(["conservative", "balanced", "aggressive"])
          .default("balanced"),
        sortBy: z.enum(["apy", "tvl"]).default("apy").optional(),
        vaultLimit: z.number().int().min(3).max(10).default(5).optional(),
      }),
      execute: async ({ totalUsdc, riskProfile, sortBy, vaultLimit }) => {
        const vaults = await fetchEarnVaults({
          sortBy: sortBy ?? "apy",
          limit: vaultLimit ?? 5,
        });

        const suggestion = suggestPortfolioBalance({
          totalUsdc,
          riskProfile: riskProfile as RiskProfile,
          vaults,
        });

        return {
          success: true,
          ...suggestion,
          nextSteps: [
            "Review flagged vault warnings before depositing.",
            "Use composer LP agents or LiFi Earn UI to execute deposits.",
            "Rebalance periodically as APY and TVL shift.",
          ],
        };
      },
    }),
  };
}
