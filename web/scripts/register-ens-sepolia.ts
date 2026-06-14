#!/usr/bin/env tsx
/**
 * Register an ENS name on Sepolia (ENSv2) and deploy a permissioned resolver.
 *
 * Usage (from repo root):
 *   PRIVATE_KEY=0x... npm run ens:register --prefix web
 *
 * Optional env:
 *   ENS_NAME=agenbazar.eth   (default)
 *   SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  parseAbi,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const ENS_CLI =
  'npx "https://pkg.pr.new/gskril/ens-cli/@ensdomains/cli@main"';
const RPC =
  process.env.SEPOLIA_RPC_URL?.trim() ||
  "https://ethereum-sepolia-rpc.publicnode.com";
const USDC = "0x3DfC8b53dAFa5eBbb071a8B97678Ab534Ed838D9" as const;
const REGISTRAR = "0x8c2E866B439358c41AE05De9cbE8A00BFEFafFcA" as const;
const ZERO_RESOLVER = "0x0000000000000000000000000000000000000000" as const;

function loadPrivateKey(): Hex {
  let pk = process.env.PRIVATE_KEY?.trim();
  if (!pk) {
    for (const envPath of [
      resolve(process.cwd(), ".env"),
      resolve(process.cwd(), "../.env"),
    ]) {
      if (!existsSync(envPath)) continue;
      const match = readFileSync(envPath, "utf8").match(/^PRIVATE_KEY=(.+)$/m);
      if (match?.[1]?.trim()) {
        pk = match[1].trim().replace(/^["']|["']$/g, "");
        break;
      }
    }
  }
  if (!pk) {
    throw new Error(
      "Set PRIVATE_KEY in environment or root .env (Sepolia-funded wallet for gas).",
    );
  }
  if (!pk.startsWith("0x")) pk = `0x${pk}`;
  return pk as Hex;
}

function ensJson(args: string): Record<string, unknown> {
  const out = execSync(`${ENS_CLI} ${args} --json`, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "inherit"],
  });
  return JSON.parse(out) as Record<string, unknown>;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const name = process.env.ENS_NAME?.trim() || "agenbazar.eth";
  const pk = loadPrivateKey();
  const account = privateKeyToAccount(pk);

  const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC) });
  const walletClient = createWalletClient({
    chain: sepolia,
    transport: http(RPC),
    account,
  });

  console.log(`Registering ${name} on Sepolia for ${account.address}`);

  const ethBal = await publicClient.getBalance({ address: account.address });
  if (ethBal === 0n) {
    throw new Error(`No Sepolia ETH on ${account.address} for gas.`);
  }

  const price = ensJson(`price ${name} --chain sepolia`);
  const total = BigInt(String(price.total));

  console.log(`Minting ${price.totalFormatted} test USDC...`);
  const mintHash = await walletClient.writeContract({
    address: USDC,
    abi: parseAbi(["function mint(address,uint256)"]),
    functionName: "mint",
    args: [account.address, total],
  });
  await publicClient.waitForTransactionReceipt({ hash: mintHash });

  console.log("Committing registration...");
  const commit = ensJson(
    `register commit ${name} --owner ${account.address} --chain sepolia`,
  );
  const commitHash = await walletClient.sendTransaction({
    to: getAddress(String(commit.to)),
    data: commit.data as Hex,
    value: 0n,
  });
  await publicClient.waitForTransactionReceipt({ hash: commitHash });
  console.log(`Commit tx: ${commitHash}`);

  console.log("Waiting 65s (commit/reveal delay)...");
  await sleep(65_000);

  console.log("Approving registrar for USDC payment...");
  const approveHash = await walletClient.writeContract({
    address: USDC,
    abi: parseAbi(["function approve(address,uint256)"]),
    functionName: "approve",
    args: [REGISTRAR, total],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  console.log("Revealing registration...");
  const reveal = ensJson(
    `register reveal ${name} --owner ${account.address} --chain sepolia --secret ${commit.secret} --paymentToken ${USDC} --resolver ${ZERO_RESOLVER}`,
  );
  const revealHash = await walletClient.sendTransaction({
    to: getAddress(String(reveal.to)),
    data: reveal.data as Hex,
    value: 0n,
  });
  await publicClient.waitForTransactionReceipt({ hash: revealHash });
  console.log(`Reveal tx: ${revealHash}`);
  console.log(`✓ Registered ${name}`);

  console.log("Deploying permissioned resolver...");
  const deploy = ensJson(
    `resolver deploy ${account.address} --chain sepolia`,
  );
  if (!deploy.alreadyDeployed) {
    const deployHash = await walletClient.sendTransaction({
      to: getAddress(String(deploy.to)),
      data: deploy.data as Hex,
      value: 0n,
    });
    await publicClient.waitForTransactionReceipt({ hash: deployHash });
  }
  const resolver = getAddress(String(deploy.resolver));
  console.log(`Resolver: ${resolver}`);

  console.log("Setting resolver on name...");
  const setResolver = ensJson(
    `resolver set ${name} --resolver ${resolver} --chain sepolia`,
  );
  const setHash = await walletClient.sendTransaction({
    to: getAddress(String(setResolver.to)),
    data: setResolver.data as Hex,
    value: 0n,
  });
  await publicClient.waitForTransactionReceipt({ hash: setHash });

  console.log("\n--- Next steps ---");
  console.log(`Add to web/.env:`);
  console.log(`ENS_AGENT_PARENT=${name}`);
  console.log(`NEXT_PUBLIC_APP_URL=http://localhost:3000`);
  console.log(`Then: cd web && ENS_AGENT_PARENT=${name} npm run ens:print`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
