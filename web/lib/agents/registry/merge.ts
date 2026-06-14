import type { Agent } from "@/lib/agents/types";

import { AGENT_REGISTRY } from "@/lib/agents/registry";
import {
  getAgentRegistration,
  listAgentRegistrations,
  type AgentRegistrationRecord,
} from "./dynamic-storage";
import { discoverAgentsFromEns } from "./discover-ens";

export type CatalogAgent = Agent & {
  source: "builtin" | "registered";
  ensName?: string;
  endpoints?: { web?: string | null; mcp?: string | null };
  registeredAt?: string;
};

function toCatalogAgent(
  agent: Agent,
  record?: AgentRegistrationRecord,
  source: "builtin" | "registered" = "builtin",
): CatalogAgent {
  return {
    ...agent,
    source: record ? "registered" : source,
    ensName: record?.ensName,
    endpoints: record?.endpoints,
    registeredAt: record?.registeredAt,
  };
}

export async function listAllAgents(options?: {
  discoverEns?: boolean;
}): Promise<CatalogAgent[]> {
  if (options?.discoverEns !== false && process.env.ENS_AGENT_PARENT?.trim()) {
    await discoverAgentsFromEns();
  }

  const registrations = await listAgentRegistrations();
  const registrationById = new Map(
    registrations.map((record) => [record.agent.id, record]),
  );

  const merged = new Map<string, CatalogAgent>();

  for (const agent of AGENT_REGISTRY) {
    const record = registrationById.get(agent.id);
    merged.set(agent.id, toCatalogAgent(agent, record, "builtin"));
    registrationById.delete(agent.id);
  }

  for (const record of registrationById.values()) {
    merged.set(record.agent.id, toCatalogAgent(record.agent, record, "registered"));
  }

  return [...merged.values()];
}

export async function getAgentByIdMerged(
  agentId: string,
  options?: { discoverEns?: boolean },
): Promise<CatalogAgent | undefined> {
  if (options?.discoverEns !== false && process.env.ENS_AGENT_PARENT?.trim()) {
    await discoverAgentsFromEns();
  }

  const builtin = AGENT_REGISTRY.find((a) => a.id === agentId);
  const record = await getAgentRegistration(agentId);

  if (builtin) {
    return toCatalogAgent(builtin, record, "builtin");
  }

  if (record) {
    return toCatalogAgent(record.agent, record, "registered");
  }

  return undefined;
}
