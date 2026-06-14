#!/usr/bin/env tsx
/** Finish resolver deploy + set for an already-registered Sepolia ENS name. */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const ENS_CLI =
  'npx "https://pkg.pr.new/gskril/ens-cli/@ensdomains/cli@main"';
const RPC =
  process.env.SEPOLIA_RPC_URL?.trim() ||
  "https://ethereum-sepolia-rpc.publicnode.com";

function loadPrivateKey(): Hex {
  let pk = process.env.PRIVATE_KEY?.trim();
  if (!pk) {
    const envPath = resolve(process.cwd(), "../.env");
    if (existsSync(envPath)) {
      const match = readFileSync(envPath, "utf8").match(/^PRIVATE_KEY=(.+)$/m);
      if (match?.[1]?.trim()) pk = match[1].trim().replace(/^["']|["']$/g, "");
    }
  }
  if (!pk) throw new Error("Set PRIVATE_KEY");
  if (!pk.startsWith("0x")) pk = `0x${pk}`;
  return pk as Hex;
}

function ensJson(args: string): Record<string, unknown> {
  const out = execSync(`${ENS_CLI} ${args} --json`, { encoding: "utf8" });
  return JSON.parse(out) as Record<string, unknown>;
}

async function main() {
  const name = process.env.ENS_NAME?.trim() || "agenbazar.eth";
  const account = privateKeyToAccount(loadPrivateKey());
  const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC) });
  const walletClient = createWalletClient({
    chain: sepolia,
    transport: http(RPC),
    account,
  });

  const deploy = ensJson(`resolver deploy ${account.address} --chain sepolia`);
  if (!deploy.alreadyDeployed) {
    const hash = await walletClient.sendTransaction({
      to: getAddress(String(deploy.to)),
      data: deploy.data as Hex,
      value: 0n,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log("Deployed resolver:", hash);
  }

  const resolver = getAddress(String(deploy.resolver));
  const setResolver = ensJson(
    `resolver set ${name} --resolver ${resolver} --chain sepolia`,
  );
  const setHash = await walletClient.sendTransaction({
    to: getAddress(String(setResolver.to)),
    data: setResolver.data as Hex,
    value: 0n,
  });
  await publicClient.waitForTransactionReceipt({ hash: setHash });
  console.log(`✓ ${name} resolver set to ${resolver}`);
  console.log(`ENS_AGENT_PARENT=${name}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
