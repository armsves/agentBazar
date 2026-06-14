import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { installGrant, revokeGrant } from "@/lib/agents/grants/storage";
import { getAgentById } from "@/lib/agents/registry";
import {
  userOwnsAddress,
  withAuth,
} from "@/lib/dynamic/dynamic-auth";
import { InstallGrantSchema } from "../../schema";

type AgentParams = { agentId: string };

/** POST /api/agents/[agentId]/install — grant agent access with spend caps */
export const POST = withAuth<AgentParams>(
  async (req, { user, params }) => {
    const { agentId } = params;
    const agent = getAgentById(agentId);

    if (!agent) {
      return NextResponse.json(
        { success: false, error: `Agent not found: ${agentId}` },
        { status: 404 },
      );
    }

    const body = await req.json();
    const parsed = InstallGrantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          details: parsed.error.issues,
        },
        { status: 400 },
      );
    }

    const { address, chain, maxUsdcPerTx, maxUsdcDaily } = parsed.data;

    if (!userOwnsAddress(user, address)) {
      return NextResponse.json(
        { success: false, error: "You are not authorized for this wallet" },
        { status: 403 },
      );
    }

    const grant = await installGrant({
      userId: user.sub,
      agentId,
      walletAddress: address,
      chain,
      maxUsdcPerTx,
      maxUsdcDaily,
    });

    return NextResponse.json({
      success: true,
      agent,
      grant,
      message: `${agent.name} installed with spend guardrails.`,
    });
  },
);

/** DELETE /api/agents/[agentId]/install — revoke agent grant */
export const DELETE = withAuth<AgentParams>(
  async (_req, { user, params }) => {
    const { agentId } = params;
    const revoked = await revokeGrant(user.sub, agentId);

    return NextResponse.json({
      success: true,
      revoked,
      message: revoked ? "Agent grant revoked" : "No active grant found",
    });
  },
);
