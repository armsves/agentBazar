import { env } from "@/env";
import { createClient, type VercelKV } from "@vercel/kv";
import Redis from "ioredis";

/**
 * KV config — read process.env first so Vercel Storage integration vars
 * (injected at runtime, not always in t3 env at build) are picked up.
 */
function getKvConfig() {
  return {
    restUrl:
      process.env.KV_REST_API_URL?.trim() || env.KV_REST_API_URL?.trim(),
    restToken:
      process.env.KV_REST_API_TOKEN?.trim() || env.KV_REST_API_TOKEN?.trim(),
    redisUrl:
      process.env.KV_URL?.trim() ||
      process.env.REDIS_URL?.trim() ||
      env.KV_URL?.trim(),
  };
}

let vercelKvClient: VercelKV | null = null;
let ioredisClient: Redis | null = null;

type RedisClient = {
  set(key: string, value: string): Promise<void | string>;
  get(key: string): Promise<string | null>;
  del(...keys: string[]): Promise<number>;
  sadd(key: string, ...members: string[]): Promise<number>;
  srem(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
  keys(pattern: string): Promise<string[]>;
};

function getVercelKvClient(): VercelKV | null {
  const { restUrl, restToken } = getKvConfig();
  if (!restUrl || !restToken) return null;

  if (!vercelKvClient) {
    vercelKvClient = createClient({ url: restUrl, token: restToken });
  }

  return vercelKvClient;
}

function wrapVercelKV(kv: VercelKV): RedisClient {
  return {
    async set(key: string, value: string) {
      await kv.set(key, value);
    },
    async get(key: string) {
      const result = await kv.get<string>(key);
      return result || null;
    },
    async del(...keys: string[]) {
      let count = 0;
      for (const key of keys) {
        const result = await kv.del(key);
        if (result) count++;
      }
      return count;
    },
    async sadd(key: string, ...members: string[]) {
      let count = 0;
      for (const member of members) {
        await kv.sadd(key, member);
        count++;
      }
      return count;
    },
    async srem(key: string, ...members: string[]) {
      let count = 0;
      for (const member of members) {
        await kv.srem(key, member);
        count++;
      }
      return count;
    },
    async smembers(key: string) {
      const result = await kv.smembers(key);
      if (!result) return [];
      return Array.isArray(result) ? result.map(String) : [String(result)];
    },
    async keys(pattern: string) {
      const result = await kv.keys(pattern);
      return result || [];
    },
  };
}

function getIoredisClient(): Redis {
  const { redisUrl } = getKvConfig();
  if (!redisUrl) {
    throw new Error(
      "No KV/Redis configured. Set KV_REST_API_URL + KV_REST_API_TOKEN in web/.env (from Vercel Storage → upstash-kv-ethglobalny2026), or set KV_URL.",
    );
  }

  if (!ioredisClient) {
    ioredisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: redisUrl.startsWith("rediss://") ? {} : undefined,
    });
  }

  return ioredisClient;
}

/**
 * Get the Redis client instance.
 * Prefers Vercel KV REST (Upstash) when KV_REST_* is set; otherwise KV_URL/REDIS_URL.
 */
export function getRedisClient(): RedisClient {
  const vercelKv = getVercelKvClient();
  if (vercelKv) return wrapVercelKV(vercelKv);

  const redis = getIoredisClient();
  return {
    set: (key, value) => redis.set(key, value),
    get: (key) => redis.get(key),
    del: (...keys) => redis.del(...keys),
    sadd: (key, ...members) => redis.sadd(key, ...members),
    srem: (key, ...members) => redis.srem(key, ...members),
    smembers: (key) => redis.smembers(key),
    keys: (pattern) => redis.keys(pattern),
  };
}
