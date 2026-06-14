import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { listAllAgents } from "@/lib/agents/registry/merge";
import { agentEnsName, type AgentEnsConfig } from "@/lib/ens/agent-records";
import { listUserGrants } from "@/lib/agents/grants/storage";
import { getAgentReputations } from "@/lib/agents/reputation/storage";
import {
  type AuthenticatedUser,
  withAuth,
} from "@/lib/dynamic/dynamic-auth";

/** GET /api/agents — marketplace catalog with user's install status */
export const GET = withAuth(
  async (_req: NextRequest, { user }: { user: AuthenticatedUser }) => {
    const agents = await listAllAgents({ discoverEns: true });
    const grants = await listUserGrants(user.sub);
    const installedIds = new Set(grants.map((g) => g.agentId));
    const reputations = await getAgentReputations(agents.map((agent) => agent.id));

    const ensParent = process.env.ENS_AGENT_PARENT?.trim();
    const ensConfig: AgentEnsConfig | null = ensParent
      ? {
          parentName: ensParent,
          appBaseUrl:
            process.env.NEXT_PUBLIC_APP_URL?.trim() ||
            "https://agent-bazar-eight.vercel.app",
        }
      : null;

    return NextResponse.json({
      success: true,
      ensParent: ensParent ?? null,
      agents: agents.map((agent) => ({
        ...agent,
        ensName: agent.ensName ?? (ensConfig ? agentEnsName(agent, ensConfig.parentName) : null),
        installed: installedIds.has(agent.id),
        grant: grants.find((g) => g.agentId === agent.id) ?? null,
        reputation: reputations[agent.id] ?? null,
      })),
    });
  },
);
