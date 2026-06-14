import { tool } from "ai";
import { z } from "zod";

import { executeAgentAction } from "@/lib/agents/execute";
import { createEarnPortfolioTools } from "@/lib/agents/orchestrator/earn-tools";
import { getGrant, installGrant, listUserGrants } from "@/lib/agents/grants/storage";
import { discoverAgentsFromEns } from "@/lib/agents/registry/discover-ens";
import { getAgentByIdMerged, listAllAgents } from "@/lib/agents/registry/merge";
import { getAgentPersona } from "@/lib/agents/agent-prompts";
import { getDelegationByAddress } from "@/lib/dynamic/delegation/storage";
import { normalizeChain } from "@/lib/dynamic/delegation/chain";
import type { Agent } from "@/lib/agents/types";
import {
  LIFI_COMPOSER_PROXY_FACTORY,
  UNISWAP_V3_POSITION_MANAGER,
  UNISWAP_V3_SWAP_ROUTER,
  UNISWAP_V3_USDC_USDT_POOL,
  USDC,
  USDT,
} from "../../../../src/optimism";

export type OrchestratorContext = {
  userId: string;
  walletAddress: string;
  chain: string;
};

function toAtomicUsdc(humanAmount: number): string {
  return String(Math.round(humanAmount * 1_000_000));
}

function marketplaceBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://agent-bazar-eight.vercel.app"
  ).replace(/\/$/, "");
}

function agentHireUrl(agentId: string): string {
  return `${marketplaceBaseUrl()}/agents/${agentId}`;
}

export function createOrchestratorTools(
  context: OrchestratorContext,
  focusAgent?: Agent,
) {
  const chain = normalizeChain(context.chain);
  const address = context.walletAddress.toLowerCase();
  const earnTools = createEarnPortfolioTools();
  const isConcierge =
    !focusAgent || focusAgent.id === "agent-bazar-concierge";
  const includeEarnTools =
    Boolean(focusAgent) &&
    !isConcierge &&
    (focusAgent!.kind === "advisor" ||
      focusAgent!.capabilities.includes("earn-portfolio"));

  return {
    list_marketplace_agents: tool({
      description: "List all agents available in the Agent Bazar marketplace.",
      inputSchema: z.object({}),
      execute: async () => {
        const grants = await listUserGrants(context.userId);
        const installed = new Set(grants.map((g) => g.agentId));

        return (await listAllAgents({ discoverEns: true })).map((agent) => ({
          id: agent.id,
          name: agent.name,
          description: agent.description,
          version: agent.version,
          source: agent.source,
          ensName: agent.ensName ?? null,
          installed: installed.has(agent.id),
        }));
      },
    }),

    list_installed_agents: tool({
      description: "List agents the user has installed with active grants and spend caps.",
      inputSchema: z.object({}),
      execute: async () => {
        const grants = await listUserGrants(context.userId);
        return Promise.all(
          grants.map(async (grant) => {
            const agent = await getAgentByIdMerged(grant.agentId);
            return {
              agentId: grant.agentId,
              name: agent?.name,
              maxUsdcPerTx: Number(grant.maxUsdcPerTx) / 1e6,
              maxUsdcDaily: Number(grant.maxUsdcDaily) / 1e6,
              dailySpentUsdc: Number(grant.dailySpentUsdc) / 1e6,
              walletAddress: grant.walletAddress,
            };
          }),
        );
      },
    }),

    recommend_agent_for_goal: tool({
      description:
        "Recommend which marketplace specialist the user should hire. Concierge must use this for portfolio, earn, and LP questions instead of answering as the specialist.",
      inputSchema: z.object({
        goal: z.enum([
          "portfolio_rebalance",
          "earn_vaults",
          "lp_deposit",
          "lp_withdraw",
          "lp_full_cycle",
          "explore_agents",
        ]),
        preferV4: z
          .boolean()
          .optional()
          .describe("Prefer Uniswap v4 agents when true"),
      }),
      execute: async ({ goal, preferV4 }) => {
        const agents = await listAllAgents({ discoverEns: true });
        const specialists = agents.filter((a) => a.kind !== "orchestrator");

        if (goal === "explore_agents") {
          return {
            talentPoolUrl: `${marketplaceBaseUrl()}/agents`,
            agents: specialists.map((agent) => ({
              id: agent.id,
              name: agent.name,
              description: agent.description,
              kind: agent.kind,
              hireUrl: agentHireUrl(agent.id),
            })),
          };
        }

        const goalToAgentId: Record<
          Exclude<typeof goal, "explore_agents">,
          string
        > = {
          portfolio_rebalance: "lifi-earn-balancer",
          earn_vaults: "lifi-earn-balancer",
          lp_deposit: preferV4 ? "uniswap-v4-lp" : "uniswap-v3-lp",
          lp_withdraw: preferV4 ? "composer-v4-lp" : "composer-v3-lp",
          lp_full_cycle: preferV4 ? "composer-v4-lp" : "composer-v3-lp",
        };

        const agentId = goalToAgentId[goal];
        const agent = specialists.find((a) => a.id === agentId);
        if (!agent) {
          return {
            success: false,
            error: `No agent found for goal: ${goal}`,
            talentPoolUrl: `${marketplaceBaseUrl()}/agents`,
          };
        }

        const persona = getAgentPersona(agent);
        return {
          success: true,
          goal,
          recommendedAgentId: agent.id,
          name: agent.name,
          description: agent.description,
          tagline: persona.whatYouDo.split(".")[0],
          hireUrl: agentHireUrl(agent.id),
          talentPoolUrl: `${marketplaceBaseUrl()}/agents`,
          message: `Hire **${agent.name}** for this — open ${agentHireUrl(agent.id)} to chat with them directly.`,
        };
      },
    }),

    check_delegation_status: tool({
      description:
        "Check if the user's wallet has an active Dynamic delegation share on the server.",
      inputSchema: z.object({}),
      execute: async () => {
        const delegation = await getDelegationByAddress(address, chain);
        return {
          walletAddress: address,
          chain,
          delegated: Boolean(delegation),
          message: delegation
            ? "Delegation active — server can sign transactions."
            : "No delegation found. User must approve delegation on the home page.",
        };
      },
    }),

    discover_ens_agents: tool({
      description:
        "Discover agents published on ENS (ENSIP-25/26) and sync them into the marketplace catalog.",
      inputSchema: z.object({}),
      execute: async () => {
        const parent = process.env.ENS_AGENT_PARENT?.trim();
        if (!parent) {
          return {
            success: false,
            error: "ENS_AGENT_PARENT is not configured on the server.",
          };
        }

        const discovered = await discoverAgentsFromEns({ parentName: parent });
        return {
          success: true,
          parent,
          count: discovered.length,
          agents: discovered.map((record) => ({
            id: record.agent.id,
            name: record.agent.name,
            ensName: record.ensName,
            endpoints: record.endpoints,
          })),
        };
      },
    }),

    install_agent: tool({
      description:
        "Install a marketplace agent for the user with spend guardrails. Requires user consent.",
      inputSchema: z.object({
        agentId: z.string().min(2).describe("Marketplace agent id"),
        maxUsdcPerTx: z
          .number()
          .positive()
          .optional()
          .describe("Max USDC per transaction in human units (default 10)"),
        maxUsdcDaily: z
          .number()
          .positive()
          .optional()
          .describe("Max USDC per day in human units (default 50)"),
        userConfirmed: z
          .boolean()
          .describe("True only if user explicitly asked to install this agent"),
      }),
      execute: async ({ agentId, maxUsdcPerTx, maxUsdcDaily, userConfirmed }) => {
        if (!userConfirmed) {
          return {
            success: false,
            error: "User must confirm installation before calling this tool.",
          };
        }

        const agent = await getAgentByIdMerged(agentId, { discoverEns: true });
        if (!agent) return { success: false, error: `Unknown agent: ${agentId}` };
        if (agent.kind === "orchestrator") {
          return {
            success: false,
            error: "Orchestrator agents are not installed via grants.",
          };
        }

        const grant = await installGrant({
          userId: context.userId,
          agentId,
          walletAddress: address,
          chain,
          maxUsdcPerTx: maxUsdcPerTx
            ? toAtomicUsdc(maxUsdcPerTx)
            : undefined,
          maxUsdcDaily: maxUsdcDaily
            ? toAtomicUsdc(maxUsdcDaily)
            : undefined,
        });

        return {
          success: true,
          agent: agent.name,
          maxUsdcPerTx: Number(grant.maxUsdcPerTx) / 1e6,
          maxUsdcDaily: Number(grant.maxUsdcDaily) / 1e6,
        };
      },
    }),

    simulate_deposit: tool({
      description:
        "Dry-run a specialist agent deposit: builds LiFi Composer flow, simulates on-chain, runs guardrails. No signing.",
      inputSchema: z.object({
        agentId: z.string().min(2).describe("Specialist marketplace agent id"),
        totalUsdc: z
          .number()
          .positive()
          .describe("Total USDC deposit in human units (split half swap / half USDT leg)"),
      }),
      execute: async ({ agentId, totalUsdc }) => {
        const half = totalUsdc / 2;
        const atomicHalf = toAtomicUsdc(half);

        try {
          const result = await executeAgentAction({
            userId: context.userId,
            agentId,
            input: {
              address,
              chain,
              action: "deposit",
              usdcAmount: atomicHalf,
              usdtAmount: atomicHalf,
              dryRun: true,
            },
          });

          if (!result.dryRun) {
            return { success: false, error: "Expected dry-run result" };
          }

          if (result.action !== "deposit") {
            return { success: false, error: "Expected deposit dry-run result" };
          }

          return {
            success: true,
            agentId,
            totalUsdcDeposit: Number(result.preview.totalUsdcDeposit) / 1e6,
            usdcLegAtomic: result.preview.usdcAmount,
            usdtLegAtomic: result.preview.usdtAmount,
            userProxy: result.preview.userProxy,
            approvalsRequired: result.preview.compile.approvals?.length ?? 0,
            guardrails: result.grant,
            contracts: {
              pool: UNISWAP_V3_USDC_USDT_POOL,
              usdc: USDC,
              usdt: USDT,
              swapRouter: UNISWAP_V3_SWAP_ROUTER,
              positionManager: UNISWAP_V3_POSITION_MANAGER,
              composerProxyFactory: LIFI_COMPOSER_PROXY_FACTORY,
            },
            decimalsNote:
              "USDC/USDT use 6 decimals. totalUsdc is split 50/50 into atomic legs (e.g. 1 USDC → 500000 + 500000).",
          };
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },
    }),

    execute_deposit: tool({
      description:
        "Execute a real on-chain deposit via delegated signing. ONLY after simulate_deposit succeeded AND user explicitly confirmed.",
      inputSchema: z.object({
        agentId: z.string().min(2).describe("Specialist marketplace agent id"),
        totalUsdc: z.number().positive(),
        userConfirmed: z
          .boolean()
          .describe("Must be true — user explicitly said to execute on-chain"),
      }),
      execute: async ({ agentId, totalUsdc, userConfirmed }) => {
        if (!userConfirmed) {
          return {
            success: false,
            error: "User must explicitly confirm execution before this tool runs.",
          };
        }

        const grant = await getGrant(context.userId, agentId);
        if (!grant) {
          return {
            success: false,
            error: `Agent ${agentId} not installed. Install it first.`,
          };
        }

        const half = totalUsdc / 2;
        const atomicHalf = toAtomicUsdc(half);

        const result = await executeAgentAction({
          userId: context.userId,
          agentId,
          input: {
            address,
            chain,
            action: "deposit",
            usdcAmount: atomicHalf,
            usdtAmount: atomicHalf,
            dryRun: false,
          },
        });

        if (result.dryRun) {
          return { success: false, error: "Expected execution result" };
        }

        return {
          success: true,
          action: "deposit",
          composeHash: result.result.composeHash,
          explorerUrl: `https://optimistic.etherscan.io/tx/${result.result.composeHash}`,
          approvalCount: result.result.approvalHashes.length,
          userProxy: result.result.userProxy,
        };
      },
    }),

    simulate_withdraw: tool({
      description:
        "Dry-run withdrawing LP from a Composer manager agent (composer-v3-lp or composer-v4-lp). Requires the position NFT tokenId.",
      inputSchema: z.object({
        agentId: z.enum(["composer-v3-lp", "composer-v4-lp"]),
        tokenId: z.string().regex(/^\d+$/).describe("Uniswap LP position NFT token id"),
      }),
      execute: async ({ agentId, tokenId }) => {
        try {
          const result = await executeAgentAction({
            userId: context.userId,
            agentId,
            input: {
              address,
              chain,
              action: "withdraw",
              tokenId,
              dryRun: true,
            },
          });

          if (!result.dryRun || result.action !== "withdraw") {
            return { success: false, error: "Expected withdraw dry-run result" };
          }

          return {
            success: true,
            agentId,
            tokenId: result.preview.tokenId,
            liquidity: result.preview.liquidity,
            userProxy: result.preview.userProxy,
            nftOwner: result.preview.nftOwner,
            needsNftApproval: result.preview.needsNftApproval,
            approvalsRequired: result.preview.compile.approvals?.length ?? 0,
          };
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },
    }),

    execute_withdraw: tool({
      description:
        "Execute a real on-chain LP withdraw via Composer. ONLY after simulate_withdraw AND user confirmed.",
      inputSchema: z.object({
        agentId: z.enum(["composer-v3-lp", "composer-v4-lp"]),
        tokenId: z.string().regex(/^\d+$/),
        userConfirmed: z.boolean(),
      }),
      execute: async ({ agentId, tokenId, userConfirmed }) => {
        if (!userConfirmed) {
          return {
            success: false,
            error: "User must explicitly confirm withdraw before this tool runs.",
          };
        }

        const grant = await getGrant(context.userId, agentId);
        if (!grant) {
          return {
            success: false,
            error: `Agent ${agentId} not installed. Install it first.`,
          };
        }

        const result = await executeAgentAction({
          userId: context.userId,
          agentId,
          input: {
            address,
            chain,
            action: "withdraw",
            tokenId,
            dryRun: false,
          },
        });

        if (result.dryRun) {
          return { success: false, error: "Expected execution result" };
        }

        return {
          success: true,
          action: "withdraw",
          composeHash: result.result.composeHash,
          explorerUrl: `https://optimistic.etherscan.io/tx/${result.result.composeHash}`,
          approvalCount: result.result.approvalHashes.length,
          userProxy: result.result.userProxy,
        };
      },
    }),

    ...(includeEarnTools ? earnTools : {}),
  };
}
