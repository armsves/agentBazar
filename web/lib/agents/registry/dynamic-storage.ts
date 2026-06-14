import type { Agent } from "@/lib/agents/types";
import { getRedisClient } from "@/lib/redis";

export type RegistrationVerification = "signature" | "secret" | "ens";

export interface AgentRegistrationRecord {
  agent: Agent;
  ensName?: string;
  endpoints?: { web?: string | null; mcp?: string | null };
  registeredAt: string;
  updatedAt: string;
  signer?: string;
  verification: RegistrationVerification;
}

const REGISTRY_IDS_KEY = "agent-registry:ids";

function registrationKey(agentId: string): string {
  return `agent-registration:${agentId}`;
}

function parseRecord(data: unknown): AgentRegistrationRecord | undefined {
  if (!data) return undefined;
  if (typeof data === "object") return data as AgentRegistrationRecord;
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as AgentRegistrationRecord;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export async function upsertAgentRegistration(
  record: AgentRegistrationRecord,
): Promise<AgentRegistrationRecord> {
  const redis = getRedisClient();
  const now = new Date().toISOString();
  const existing = await getAgentRegistration(record.agent.id);

  const next: AgentRegistrationRecord = {
    ...record,
    registeredAt: existing?.registeredAt ?? record.registeredAt ?? now,
    updatedAt: now,
  };

  await redis.set(registrationKey(record.agent.id), JSON.stringify(next));
  await redis.sadd(REGISTRY_IDS_KEY, record.agent.id);
  return next;
}

export async function getAgentRegistration(
  agentId: string,
): Promise<AgentRegistrationRecord | undefined> {
  const redis = getRedisClient();
  const data = await redis.get(registrationKey(agentId));
  return parseRecord(data);
}

export async function listAgentRegistrations(): Promise<AgentRegistrationRecord[]> {
  const redis = getRedisClient();
  const ids = await redis.smembers(REGISTRY_IDS_KEY);
  if (!ids?.length) return [];

  const records: AgentRegistrationRecord[] = [];
  for (const id of ids) {
    const record = await getAgentRegistration(id);
    if (record) records.push(record);
  }
  return records;
}

export async function removeAgentRegistration(agentId: string): Promise<boolean> {
  const redis = getRedisClient();
  const existing = await getAgentRegistration(agentId);
  if (!existing) return false;

  await redis.del(registrationKey(agentId));
  await redis.srem(REGISTRY_IDS_KEY, agentId);
  return true;
}
