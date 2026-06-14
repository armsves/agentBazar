import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getGrant } from "@/lib/agents/grants/storage";
import { getAgentById } from "@/lib/agents/registry";
import { withAuth } from "@/lib/dynamic/dynamic-auth";

type AgentParams = { agentId: string };

/** GET /api/agents/[agentId] — agent detail + grant for current user */
export const GET = withAuth<AgentParams>(
  async (_req, { user, params }) => {
    const { agentId } = params;
    const agent = getAgentById(agentId);

    if (!agent) {
      return NextResponse.json(
        { success: false, error: `Agent not found: ${agentId}` },
        { status: 404 },
      );
    }

    const grant = await getGrant(user.sub, agentId);

    return NextResponse.json({
      success: true,
      agent,
      grant: grant ?? null,
      installed: Boolean(grant),
    });
  },
);
