import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { listAllAgents } from "@/lib/agents/registry/merge";
import { agentEnsName, type AgentEnsConfig } from "@/lib/ens/agent-records";

/** GET /api/agents/catalog — public marketplace catalog (no auth) */
export async function GET(_req: NextRequest) {
  const agents = await listAllAgents({ discoverEns: true });

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
      ensName:
        agent.ensName ??
        (ensConfig ? agentEnsName(agent, ensConfig.parentName) : null),
      installed: false,
      grant: null,
    })),
  });
}
