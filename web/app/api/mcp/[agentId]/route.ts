import { NextResponse } from "next/server";

import { getAgentByIdMerged } from "@/lib/agents/registry/merge";

type RouteParams = { params: Promise<{ agentId: string }> };

/**
 * GET /api/mcp/[agentId] — MCP-style tool manifest (ENSIP-26 agent-endpoint[mcp]).
 * Lightweight discovery surface; full MCP transport can wrap this later.
 */
export async function GET(_req: Request, { params }: RouteParams) {
  const { agentId } = await params;
  const agent = await getAgentByIdMerged(agentId, { discoverEns: true });

  if (!agent) {
    return NextResponse.json({ error: `Unknown agent: ${agentId}` }, { status: 404 });
  }

  const baseTools =
    agent.kind === "orchestrator"
      ? [
          "list_marketplace_agents",
          "list_installed_agents",
          "check_delegation_status",
          "discover_ens_agents",
          "install_agent",
          "simulate_deposit",
          "execute_deposit",
          "simulate_withdraw",
          "execute_withdraw",
          "fetch_earn_vaults",
          "suggest_portfolio_balance",
        ]
      : agent.kind === "advisor"
        ? ["fetch_earn_vaults", "suggest_portfolio_balance"]
        : ["simulate_deposit", "execute_deposit"];

  return NextResponse.json({
    name: agent.name,
    agentId: agent.id,
    description: agent.description,
    protocol: "mcp-manifest",
    chatEndpoint: "/api/chat",
    executeEndpoint: `/api/agents/${agent.id}/execute`,
    tools: baseTools.map((name) => ({ name, transport: "http+json" })),
  });
}
