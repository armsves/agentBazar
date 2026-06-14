/**
 * Verify local env can read/write the remote Upstash KV store.
 * Run from web/: npm run verify:kv
 */
import { getDelegationByAddress } from "../lib/dynamic/delegation/storage";
import { getRedisClient } from "../lib/redis";

const probeKey = `healthcheck:local:${Date.now()}`;

async function main() {
  const config = {
    kvRestUrl: Boolean(process.env.KV_REST_API_URL?.trim()),
    kvRestToken: Boolean(process.env.KV_REST_API_TOKEN?.trim()),
    dynamicEnv: Boolean(process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID?.trim()),
    webhookSecret: Boolean(process.env.DYNAMIC_WEBHOOK_SECRET?.trim()),
    delegationKey: Boolean(process.env.DYNAMIC_DELEGATION_PRIVATE_KEY?.trim()),
  };

  console.log("Env config:", config);

  if (!config.kvRestUrl || !config.kvRestToken) {
    console.error(
      "\nMissing KV_REST_API_URL or KV_REST_API_TOKEN in web/.env",
    );
    process.exit(1);
  }

  const redis = getRedisClient();
  await redis.set(probeKey, "ok");
  const value = await redis.get(probeKey);
  await redis.del(probeKey);

  if (value !== "ok") {
    console.error("\nKV write/read failed:", value);
    process.exit(1);
  }

  const keys = await redis.keys("delegation:*");
  console.log("\nKV OK — remote Upstash is reachable");
  console.log("Delegation keys in store:", keys.length);
  if (keys.length) {
    console.log(keys.map((k) => `  - ${k}`).join("\n"));
  }

  const sampleAddress = process.argv[2];
  if (sampleAddress) {
    const record = await getDelegationByAddress(sampleAddress, "EVM");
    console.log(
      `\nLookup ${sampleAddress} on EVM:`,
      record ? "FOUND" : "not in KV",
    );
  }

  console.log(
    "\nNext: npm run dev → http://localhost:3000/api/health/kv",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
