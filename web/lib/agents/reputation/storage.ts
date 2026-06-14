import type { AgentRating, AgentReputation } from "@/lib/agents/reputation/types";
import { getRedisClient } from "@/lib/redis";

function ratingKey(agentId: string, userId: string): string {
  return `rating:${agentId}:${userId}`;
}

function ratingsIndexKey(agentId: string): string {
  return `ratings:${agentId}:users`;
}

function emptyDistribution(): AgentReputation["distribution"] {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

function parseRating(data: unknown): AgentRating | undefined {
  if (!data) return undefined;
  if (typeof data === "object") return data as AgentRating;
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as AgentRating;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function clampStar(stars: number): 1 | 2 | 3 | 4 | 5 {
  const rounded = Math.round(stars);
  if (rounded <= 1) return 1;
  if (rounded >= 5) return 5;
  return rounded as 1 | 2 | 3 | 4 | 5;
}

async function loadRatingsForAgent(agentId: string): Promise<AgentRating[]> {
  const redis = getRedisClient();
  const userIds = await redis.smembers(ratingsIndexKey(agentId));
  const ratings: AgentRating[] = [];

  for (const userId of userIds) {
    const raw = await redis.get(ratingKey(agentId, userId));
    const rating = parseRating(raw);
    if (rating) ratings.push(rating);
  }

  return ratings;
}

function buildReputation(agentId: string, ratings: AgentRating[]): AgentReputation {
  const distribution = emptyDistribution();
  let totalStars = 0;

  for (const rating of ratings) {
    const star = clampStar(rating.stars);
    distribution[star] += 1;
    totalStars += star;
  }

  const ratingCount = ratings.length;

  return {
    agentId,
    averageStars:
      ratingCount > 0 ? Math.round((totalStars / ratingCount) * 10) / 10 : 0,
    ratingCount,
    distribution,
  };
}

export async function getAgentReputation(
  agentId: string,
): Promise<AgentReputation> {
  const ratings = await loadRatingsForAgent(agentId);
  return buildReputation(agentId, ratings);
}

export async function getAgentReputations(
  agentIds: string[],
): Promise<Record<string, AgentReputation>> {
  const entries = await Promise.all(
    agentIds.map(async (agentId) => [agentId, await getAgentReputation(agentId)] as const),
  );
  return Object.fromEntries(entries);
}

export async function getUserAgentRating(
  userId: string,
  agentId: string,
): Promise<AgentRating | null> {
  const redis = getRedisClient();
  const raw = await redis.get(ratingKey(agentId, userId));
  return parseRating(raw) ?? null;
}

export async function submitAgentRating(params: {
  userId: string;
  agentId: string;
  stars: number;
  comment?: string;
}): Promise<{ rating: AgentRating; reputation: AgentReputation }> {
  const redis = getRedisClient();
  const now = new Date().toISOString();
  const stars = clampStar(params.stars);
  const comment = params.comment?.trim() || undefined;

  const existing = await getUserAgentRating(params.userId, params.agentId);

  const rating: AgentRating = {
    agentId: params.agentId,
    userId: params.userId,
    stars,
    comment,
    createdAt: existing?.createdAt ?? now,
    updatedAt: existing ? now : undefined,
  };

  await redis.set(ratingKey(params.agentId, params.userId), JSON.stringify(rating));
  await redis.sadd(ratingsIndexKey(params.agentId), params.userId);

  const reputation = await getAgentReputation(params.agentId);
  return { rating, reputation };
}
