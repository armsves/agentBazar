import { listAgentIntroductions } from "@/lib/agents/registry/introductions";
import { listAllAgents } from "@/lib/agents/registry/merge";
import { ORCHESTRATOR_INSTRUCTIONS } from "@/lib/agents/orchestrator/instructions";

export async function buildOrchestratorInstructions(): Promise<string> {
  const agents = await listAllAgents({ discoverEns: true });
  const introductions = await listAgentIntroductions();
  const introById = new Map(introductions.map((item) => [item.agentId, item]));

  const registered = agents.filter((agent) => agent.source === "registered");
  if (!registered.length && !introductions.length) {
    return ORCHESTRATOR_INSTRUCTIONS;
  }

  const lines = [
    ORCHESTRATOR_INSTRUCTIONS,
    "",
    "## Dynamically registered agents",
    "These agents self-registered or were discovered from ENS. Recommend them when relevant.",
  ];

  for (const agent of registered) {
    const intro = introById.get(agent.id);
    lines.push(
      `- **${agent.id}** — ${agent.name}: ${agent.description}`,
    );
    if (agent.ensName) lines.push(`  - ENS: ${agent.ensName}`);
    if (intro?.message) lines.push(`  - Agent says: ${intro.message}`);
  }

  for (const intro of introductions) {
    if (registered.some((agent) => agent.id === intro.agentId)) continue;
    lines.push(
      `- **${intro.agentId}** — introduced by ${intro.signer}: ${intro.message}`,
    );
  }

  lines.push(
    "",
    "When a user asks what agents are available, call list_marketplace_agents or recommend_agent_for_goal.",
    "When they ask for portfolio rebalance, earn vaults, or LP work, recommend the specialist and share hireUrl — do not answer as the specialist.",
  );

  return lines.join("\n");
}

export function conciergeEndpoints() {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://agent-bazar-eight.vercel.app";
  const normalized = base.replace(/\/$/, "");
  const ensParent = process.env.ENS_AGENT_PARENT?.trim();

  return {
    web: `${normalized}/chat`,
    mcp: `${normalized}/api/mcp/agent-bazar-concierge`,
    marketplace: `${normalized}/agents`,
    ens: ensParent ? `concierge.${ensParent}` : null,
  };
}
