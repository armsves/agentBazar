import type { AgentExecutionLog } from "@/lib/agents/types";
import { getRedisClient } from "@/lib/redis";

function executionKey(id: string): string {
  return `execution:${id}`;
}

function userExecutionsKey(userId: string): string {
  return `executions:${userId}`;
}

function parseLog(data: unknown): AgentExecutionLog | undefined {
  if (!data) return undefined;
  if (typeof data === "object") return data as AgentExecutionLog;
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as AgentExecutionLog;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export async function logExecution(
  entry: Omit<AgentExecutionLog, "id" | "timestamp">,
): Promise<AgentExecutionLog> {
  const redis = getRedisClient();
  const id = crypto.randomUUID();
  const log: AgentExecutionLog = {
    ...entry,
    id,
    timestamp: new Date().toISOString(),
  };

  await redis.set(executionKey(id), JSON.stringify(log));
  await redis.lpush(userExecutionsKey(entry.userId), id);
  await redis.ltrim(userExecutionsKey(entry.userId), 0, 99);

  return log;
}

export async function listUserExecutions(
  userId: string,
  limit = 20,
): Promise<AgentExecutionLog[]> {
  const redis = getRedisClient();
  const ids = await redis.lrange(userExecutionsKey(userId), 0, limit - 1);
  if (!ids?.length) return [];

  const logs: AgentExecutionLog[] = [];
  for (const id of ids) {
    const data = await redis.get(executionKey(id));
    const log = parseLog(data);
    if (log) logs.push(log);
  }
  return logs;
}
