import { getRedisClient } from "@/lib/redis";

export interface AgentIntroduction {
  agentId: string;
  message: string;
  signer: string;
  introducedAt: string;
}

const INTRO_SET_KEY = "agent-introductions:ids";

function introKey(agentId: string): string {
  return `agent-introduction:${agentId}`;
}

function parseIntro(data: unknown): AgentIntroduction | undefined {
  if (!data) return undefined;
  if (typeof data === "object") return data as AgentIntroduction;
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as AgentIntroduction;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export async function saveAgentIntroduction(
  intro: AgentIntroduction,
): Promise<AgentIntroduction> {
  const redis = getRedisClient();
  const record = {
    ...intro,
    introducedAt: intro.introducedAt || new Date().toISOString(),
  };
  await redis.set(introKey(intro.agentId), JSON.stringify(record));
  await redis.sadd(INTRO_SET_KEY, intro.agentId);
  return record;
}

export async function getAgentIntroduction(
  agentId: string,
): Promise<AgentIntroduction | undefined> {
  const redis = getRedisClient();
  return parseIntro(await redis.get(introKey(agentId)));
}

export async function listAgentIntroductions(): Promise<AgentIntroduction[]> {
  const redis = getRedisClient();
  const ids = await redis.smembers(INTRO_SET_KEY);
  if (!ids?.length) return [];

  const intros: AgentIntroduction[] = [];
  for (const id of ids) {
    const intro = await getAgentIntroduction(id);
    if (intro) intros.push(intro);
  }
  return intros;
}
