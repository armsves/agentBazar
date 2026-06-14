import type { UserAgentGrant, UniswapVersion } from "@/lib/agents/types";
import {
  DEFAULT_MAX_USDC_DAILY,
  DEFAULT_MAX_USDC_PER_TX,
} from "@/lib/agents/constants";
import { getAgentByIdMerged } from "@/lib/agents/registry/merge";
import { normalizeChain } from "@/lib/dynamic/delegation/chain";
import { getRedisClient } from "@/lib/redis";

function grantKey(userId: string, agentId: string): string {
  return `grant:${userId}:${agentId}`;
}

function userGrantsKey(userId: string): string {
  return `grants:${userId}`;
}

function addressGrantKey(address: string, agentId: string): string {
  return `grant:address:${address.toLowerCase()}:${agentId}`;
}

function parseGrant(data: unknown): UserAgentGrant | undefined {
  if (!data) return undefined;
  if (typeof data === "object") return data as UserAgentGrant;
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as UserAgentGrant;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function installGrant(params: {
  userId: string;
  agentId: string;
  walletAddress: string;
  chain: string;
  maxUsdcPerTx?: string;
  maxUsdcDaily?: string;
}): Promise<UserAgentGrant> {
  const redis = getRedisClient();
  const chain = normalizeChain(params.chain);
  const now = new Date().toISOString();

  const agent = await getAgentByIdMerged(params.agentId);
  const allowedVersions: UniswapVersion[] =
    agent?.kind === "advisor" ? [] : agent ? [agent.version] : [];

  const grant: UserAgentGrant = {
    userId: params.userId,
    agentId: params.agentId,
    walletAddress: params.walletAddress.toLowerCase(),
    chain,
    allowedVersions,
    maxUsdcPerTx: params.maxUsdcPerTx ?? DEFAULT_MAX_USDC_PER_TX,
    maxUsdcDaily: params.maxUsdcDaily ?? DEFAULT_MAX_USDC_DAILY,
    dailySpentUsdc: "0",
    dailySpentDate: todayUtc(),
    installedAt: now,
  };

  const grantJson = JSON.stringify(grant);
  await redis.set(grantKey(params.userId, params.agentId), grantJson);
  await redis.sadd(userGrantsKey(params.userId), params.agentId);
  await redis.set(
    addressGrantKey(params.walletAddress, params.agentId),
    grantKey(params.userId, params.agentId),
  );

  return grant;
}

export async function getGrant(
  userId: string,
  agentId: string,
): Promise<UserAgentGrant | undefined> {
  const redis = getRedisClient();
  const data = await redis.get(grantKey(userId, agentId));
  const grant = parseGrant(data);
  if (!grant || grant.revokedAt) return undefined;
  return grant;
}

export async function getGrantByAddress(
  address: string,
  agentId: string,
): Promise<UserAgentGrant | undefined> {
  const redis = getRedisClient();
  const pointer = await redis.get(addressGrantKey(address, agentId));
  if (!pointer || typeof pointer !== "string") return undefined;
  const data = await redis.get(pointer);
  const grant = parseGrant(data);
  if (!grant || grant.revokedAt) return undefined;
  return grant;
}

export async function listUserGrants(
  userId: string,
): Promise<UserAgentGrant[]> {
  const redis = getRedisClient();
  const agentIds = await redis.smembers(userGrantsKey(userId));
  if (!agentIds?.length) return [];

  const grants: UserAgentGrant[] = [];
  for (const agentId of agentIds) {
    const grant = await getGrant(userId, agentId);
    if (grant) grants.push(grant);
  }
  return grants;
}

export async function revokeGrant(
  userId: string,
  agentId: string,
): Promise<boolean> {
  const redis = getRedisClient();
  const existing = await getGrant(userId, agentId);
  if (!existing) return false;

  const revoked: UserAgentGrant = {
    ...existing,
    revokedAt: new Date().toISOString(),
  };

  await redis.set(grantKey(userId, agentId), JSON.stringify(revoked));
  await redis.srem(userGrantsKey(userId), agentId);
  await redis.del(addressGrantKey(existing.walletAddress, agentId));
  return true;
}

export async function recordDailySpend(
  grant: UserAgentGrant,
  usdcAmount: bigint,
): Promise<UserAgentGrant> {
  const redis = getRedisClient();
  const today = todayUtc();
  let dailySpent = BigInt(grant.dailySpentUsdc);
  let dailySpentDate = grant.dailySpentDate;

  if (dailySpentDate !== today) {
    dailySpent = 0n;
    dailySpentDate = today;
  }

  dailySpent += usdcAmount;

  const updated: UserAgentGrant = {
    ...grant,
    dailySpentUsdc: dailySpent.toString(),
    dailySpentDate,
  };

  await redis.set(grantKey(grant.userId, grant.agentId), JSON.stringify(updated));
  return updated;
}

export function withAllowedVersion(
  grant: UserAgentGrant,
  version: "v3" | "v4",
): UserAgentGrant {
  if (grant.allowedVersions.includes(version)) return grant;
  return {
    ...grant,
    allowedVersions: [...grant.allowedVersions, version],
  };
}

export async function persistGrant(grant: UserAgentGrant): Promise<void> {
  const redis = getRedisClient();
  await redis.set(grantKey(grant.userId, grant.agentId), JSON.stringify(grant));
}
