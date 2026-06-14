import { tool } from "ai";
import { z } from "zod";

import { executeAgentAction } from "@/lib/agents/execute";
import { getGrant, installGrant, listUserGrants } from "@/lib/agents/grants/storage";
import { discoverAgentsFromEns } from "@/lib/agents/registry/discover-ens";
import { getAgentByIdMerged, listAllAgents } from "@/lib/agents/registry/merge";
import { getDelegationByAddress } from "@/lib/dynamic/delegation/storage";
import { normalizeChain } from "@/lib/dynamic/delegation/chain";

export type OrchestratorContext = {
  userId: string;
  walletAddress: string;
  chain: string;
};

function toAtomicUsdc(humanAmount: number): string {
  return String(Math.round(humanAmount * 1_000_000));
}

export function createOrchestratorTools(context: OrchestratorContext) {
  const chain = normalizeChain(context.chain);
  const address = context.walletAddress.toLowerCase();

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

        const result = await executeAgentAction({
          userId: context.userId,
          agentId,
          input: {
            address,
            chain,
            usdcAmount: atomicHalf,
            usdtAmount: atomicHalf,
            dryRun: true,
          },
        });

        if (!result.dryRun) {
          return { success: false, error: "Expected dry-run result" };
        }

        return {
          success: true,
          agentId,
          totalUsdcDeposit: Number(result.preview.totalUsdcDeposit) / 1e6,
          userProxy: result.preview.userProxy,
          approvalsRequired: result.preview.compile.approvals?.length ?? 0,
          guardrails: result.grant,
        };
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
          composeHash: result.result.composeHash,
          explorerUrl: `https://optimistic.etherscan.io/tx/${result.result.composeHash}`,
          approvalCount: result.result.approvalHashes.length,
          userProxy: result.result.userProxy,
        };
      },
    }),
  };
}
