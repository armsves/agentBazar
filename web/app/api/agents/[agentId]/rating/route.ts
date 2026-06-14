import { NextResponse } from "next/server";

import { SubmitRatingSchema } from "@/app/api/agents/schema";
import {
  getUserAgentRating,
  submitAgentRating,
} from "@/lib/agents/reputation/storage";
import { getAgentByIdMerged } from "@/lib/agents/registry/merge";
import { withAuth } from "@/lib/dynamic/dynamic-auth";

type AgentParams = { agentId: string };

/** GET /api/agents/[agentId]/rating — current user's rating for this agent */
export const GET = withAuth<AgentParams>(async (_req, { user, params }) => {
  const { agentId } = params;
  const agent = await getAgentByIdMerged(agentId, { discoverEns: true });

  if (!agent) {
    return NextResponse.json(
      { success: false, error: `Agent not found: ${agentId}` },
      { status: 404 },
    );
  }

  const rating = await getUserAgentRating(user.sub, agentId);

  return NextResponse.json({
    success: true,
    rating,
  });
});

/** POST /api/agents/[agentId]/rating — submit or update a 1–5 star rating */
export const POST = withAuth<AgentParams>(async (req, { user, params }) => {
  const { agentId } = params;
  const agent = await getAgentByIdMerged(agentId, { discoverEns: true });

  if (!agent) {
    return NextResponse.json(
      { success: false, error: `Agent not found: ${agentId}` },
      { status: 404 },
    );
  }

  const body = await req.json();
  const parsed = SubmitRatingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid rating",
        details: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const { rating, reputation } = await submitAgentRating({
    userId: user.sub,
    agentId,
    stars: parsed.data.stars,
    comment: parsed.data.comment,
  });

  return NextResponse.json({
    success: true,
    rating,
    reputation,
  });
});
