import type { Agent } from "@/lib/agents/types";
import {
  agentEndpointKey,
  agentRegistrationKey,
  ENSIP26_AGENT_CONTEXT_KEY,
  ERC8004_REGISTRY_ERC7930,
} from "@/lib/ens/ensip";

export type AgentEnsConfig = {
  /** Parent name you own, e.g. agentbazar.eth */
  parentName: string;
  /** Public app base URL */
  appBaseUrl: string;
  /** Optional MCP base (defaults to appBaseUrl/api/mcp) */
  mcpBaseUrl?: string;
  /** ERC-7930 registry id for ENSIP-25 keys (defaults to ERC-8004 mainnet) */
  registryErc7930?: string;
};

function subdomain(agent: Agent): string {
  if (agent.id === "agent-bazar-concierge") return "concierge";
  if (agent.id === "uniswap-v3-lp") return "v3-lp";
  if (agent.id === "uniswap-v4-lp") return "v4-lp";
  if (agent.id === "lifidynamicens-lp") return "lifidynamicens-lp";
  return agent.id.replace(/[^a-z0-9-]/g, "-");
}

export function agentEnsName(agent: Agent, parentName: string): string {
  return `${subdomain(agent)}.${parentName}`;
}

export function buildAgentContext(agent: Agent, config: AgentEnsConfig): string {
  const ensName = agentEnsName(agent, config.parentName);
  const base = config.appBaseUrl.replace(/\/$/, "");

  return `# ${agent.name}

${agent.longDescription}

## Identity
- ENS: ${ensName}
- Agent ID: \`${agent.id}\`
- Kind: ${agent.kind}
- Chain: Optimism (${agent.chainId})

## Capabilities
${agent.capabilities.map((c) => `- ${c}`).join("\n")}

## How to interact
- Web UI: ${base}/agents/${agent.id}
${agent.kind === "orchestrator" ? `- Chat: ${base}/chat` : `- Execute API: POST ${base}/api/agents/${agent.id}/execute`}
- Marketplace: ${base}/agents

## Guardrails
Delegated Dynamic wallet signing with per-tx and daily USDC spend caps plus on-chain contract allowlists.

## Registry
Listed in Agent Bazar marketplace. ENSIP-25 verification via \`agent-registration\` text record.`;
}

export type EnsTextRecord = {
  type: "text";
  key: string;
  value: string;
};

export function buildAgentEnsRecords(
  agent: Agent,
  config: AgentEnsConfig,
): EnsTextRecord[] {
  const base = config.appBaseUrl.replace(/\/$/, "");
  const registry = config.registryErc7930 ?? ERC8004_REGISTRY_ERC7930;
  const mcp = (config.mcpBaseUrl ?? `${base}/api/mcp`).replace(/\/$/, "");

  const records: EnsTextRecord[] = [
    {
      type: "text",
      key: ENSIP26_AGENT_CONTEXT_KEY,
      value: buildAgentContext(agent, config),
    },
    {
      type: "text",
      key: agentEndpointKey("web"),
      value: agent.kind === "orchestrator" ? `${base}/chat` : `${base}/agents/${agent.id}`,
    },
    {
      type: "text",
      key: agentEndpointKey("mcp"),
      value: `${mcp}/${agent.id}`,
    },
    {
      type: "text",
      key: agentRegistrationKey(registry, agent.id),
      value: "1",
    },
  ];

  return records;
}

export function buildAllAgentEnsBatches(config: AgentEnsConfig, agents: Agent[]) {
  return agents.map((agent) => ({
    agentId: agent.id,
    ensName: agentEnsName(agent, config.parentName),
    records: buildAgentEnsRecords(agent, config),
  }));
}
