import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getGrant } from "@/lib/agents/grants/storage";
import { getAgentReputation } from "@/lib/agents/reputation/storage";
import { getAgentByIdMerged } from "@/lib/agents/registry/merge";
import { withAuth } from "@/lib/dynamic/dynamic-auth";

type AgentParams = { agentId: string };

/** GET /api/agents/[agentId] — agent detail + grant for current user */
export const GET = withAuth<AgentParams>(
  async (_req, { user, params }) => {
    const { agentId } = params;
    const agent = await getAgentByIdMerged(agentId, { discoverEns: true });

    if (!agent) {
      return NextResponse.json(
        { success: false, error: `Agent not found: ${agentId}` },
        { status: 404 },
      );
    }

    const grant = await getGrant(user.sub, agentId);
    const reputation = await getAgentReputation(agentId);

    return NextResponse.json({
      success: true,
      agent,
      grant: grant ?? null,
      installed: Boolean(grant),
      reputation,
    });
  },
);
