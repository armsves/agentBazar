import { NextResponse } from "next/server";

import { listAgents } from "@/lib/agents/registry";
import {
  buildAllAgentEnsBatches,
  type AgentEnsConfig,
} from "@/lib/ens/agent-records";

function getEnsConfig(): AgentEnsConfig | null {
  const parentName = process.env.ENS_AGENT_PARENT?.trim();
  const appBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim()
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

  if (!parentName) return null;

  return {
    parentName,
    appBaseUrl,
    mcpBaseUrl: process.env.ENS_MCP_BASE_URL?.trim(),
    registryErc7930: process.env.ENS_REGISTRY_ERC7930?.trim(),
  };
}

/** GET /api/ens/setup — ENSIP-25/26 record payloads for ens-cli batch */
export async function GET() {
  const config = getEnsConfig();
  if (!config) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Set ENS_AGENT_PARENT in env (e.g. agentbazar.eth) to generate ENS records.",
      },
      { status: 400 },
    );
  }

  const batches = buildAllAgentEnsBatches(config, listAgents());

  return NextResponse.json({
    success: true,
    config,
    ensip: {
      context: "ENSIP-26 agent-context + agent-endpoint[web|mcp]",
      registration: "ENSIP-25 agent-registration[registry][agentId]",
    },
    agents: batches,
    ensCliCommands: batches.map(
      ({ ensName, records }) =>
        `ens set batch ${ensName} --data '${JSON.stringify(records)}' --json`,
    ),
    docs: [
      "https://docs.ens.domains/ensip/25/",
      "https://docs.ens.domains/ensip/26/",
      "https://github.com/gskril/ens-cli",
    ],
  });
}
