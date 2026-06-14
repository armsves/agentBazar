import { NextResponse } from "next/server";

import { getAgentReputation } from "@/lib/agents/reputation/storage";
import { getAgentByIdMerged } from "@/lib/agents/registry/merge";

type AgentParams = { params: Promise<{ agentId: string }> };

/** GET /api/agents/[agentId]/reputation — public reputation summary */
export async function GET(_req: Request, { params }: AgentParams) {
  const { agentId } = await params;
  const agent = await getAgentByIdMerged(agentId, { discoverEns: true });

  if (!agent) {
    return NextResponse.json(
      { success: false, error: `Agent not found: ${agentId}` },
      { status: 404 },
    );
  }

  const reputation = await getAgentReputation(agentId);

  return NextResponse.json({
    success: true,
    reputation,
  });
}
