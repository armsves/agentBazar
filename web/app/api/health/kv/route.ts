import { NextResponse } from "next/server";

import { getRedisClient } from "@/lib/redis";

/**
 * KV connectivity check — no secrets exposed.
 * GET /api/health/kv
 */
export async function GET() {
  const config = {
    kvRestUrl: Boolean(process.env.KV_REST_API_URL?.trim()),
    kvRestToken: Boolean(process.env.KV_REST_API_TOKEN?.trim()),
    kvUrl: Boolean(
      process.env.KV_URL?.trim() || process.env.REDIS_URL?.trim(),
    ),
    delegationKey: Boolean(process.env.DYNAMIC_DELEGATION_PRIVATE_KEY?.trim()),
    webhookSecret: Boolean(process.env.DYNAMIC_WEBHOOK_SECRET?.trim()),
  };

  try {
    const redis = getRedisClient();
    const probeKey = `healthcheck:${Date.now()}`;
    await redis.set(probeKey, "ok");
    const value = await redis.get(probeKey);
    await redis.del(probeKey);

    let delegationKeyCount = 0;
    try {
      const keys = await redis.keys("delegation:*");
      delegationKeyCount = keys.length;
    } catch {
      // keys() unavailable in some REST modes
    }

    return NextResponse.json({
      ok: value === "ok",
      config,
      delegationKeyCount,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        config,
        error: error instanceof Error ? error.message : "KV check failed",
      },
      { status: 500 },
    );
  }
}
