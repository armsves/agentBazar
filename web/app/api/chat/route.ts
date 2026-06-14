import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createAgentUIStreamResponse, type UIMessage } from "ai";
import { z } from "zod";

import { createMarketplaceOrchestrator } from "@/lib/agents/orchestrator/agent";
import { hasLlmConfigured } from "@/lib/agents/orchestrator/model";
import { getAgentByIdMerged } from "@/lib/agents/registry/merge";
import {
  type AuthenticatedUser,
  userOwnsAddress,
  verifyDynamicJWT,
} from "@/lib/dynamic/dynamic-auth";

const ChatBodySchema = z.object({
  messages: z.array(z.custom<UIMessage>()),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  chain: z.string().default("EVM"),
  agentId: z.string().min(2).optional(),
});

/**
 * POST /api/chat — Agent Bazar Concierge (LLM orchestrator with tools).
 * Streams responses and can call marketplace agents via tool loop.
 */
export async function POST(req: NextRequest): Promise<Response> {
  if (!hasLlmConfigured()) {
    return NextResponse.json(
      {
        error:
          "No LLM configured. Set OPENAI_API_KEY or AI_GATEWAY_API_KEY in environment.",
      },
      { status: 503 },
    );
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const user = await verifyDynamicJWT(token);
  if (!user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = ChatBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { messages, walletAddress, chain, agentId } = parsed.data;

  if (walletAddress && !userOwnsAddress(user, walletAddress)) {
    return NextResponse.json(
      { error: "Not authorized for this wallet" },
      { status: 403 },
    );
  }

  const address =
    walletAddress ??
    user.verified_credentials.find((c) => c.address)?.address;

  if (!address) {
    return NextResponse.json(
      {
        error:
          "Connect a wallet first. The concierge needs your embedded wallet address to check delegation and run agents.",
      },
      { status: 400 },
    );
  }

  const focusAgent = agentId
    ? await getAgentByIdMerged(agentId, { discoverEns: true })
    : undefined;

  if (agentId && !focusAgent) {
    return NextResponse.json(
      { error: `Unknown agent: ${agentId}` },
      { status: 404 },
    );
  }

  const orchestrator = await createMarketplaceOrchestrator(
    {
      userId: user.sub,
      walletAddress: address,
      chain,
    },
    focusAgent,
  );

  return createAgentUIStreamResponse({
    agent: orchestrator,
    uiMessages: messages,
  });
}
