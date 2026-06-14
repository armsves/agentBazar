#!/usr/bin/env tsx
/**
 * Publish agent ENS identity on Sepolia:
 * 1. Deploy + set subregistry on parent
 * 2. Create agent subnames
 * 3. Set ENSIP-25/26 text records via batch
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

import { listAgents } from "../lib/agents/registry";
import {
  buildAllAgentEnsBatches,
  type AgentEnsConfig,
} from "../lib/ens/agent-records";


const ENS_CLI_NPX = "https://pkg.pr.new/gskril/ens-cli/@ensdomains/cli@main";
const RPC =
  process.env.SEPOLIA_RPC_URL?.trim() ||
  "https://ethereum-sepolia-rpc.publicnode.com";
const FACTORY = "0xd2A632D8A8b67C2c4398c255CBd7Af8Dd7236198" as const;
const FACTORY_DEPLOYED_TOPIC =
  "0x0a2c575ff341b41da136c9ccae74ec230a927a024d18f0dccf46d123f28f5f54" as const;
const UPGRADED_TOPIC =
  "0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b" as const;

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
  if (!pk) throw new Error("Set PRIVATE_KEY in root .env");
  if (!pk.startsWith("0x")) pk = `0x${pk}`;
  return pk as Hex;
}

function loadWebEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    if (process.env[key]) continue;
    process.env[key] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

function ensJson(args: string[]): Record<string, unknown> {
  const result = spawnSync("npx", [ENS_CLI_NPX, ...args, "--json"], {
    encoding: "utf8",
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "ens-cli failed");
  }
  return JSON.parse(result.stdout) as Record<string, unknown>;
}

function ensSetBatch(
  ensName: string,
  records: unknown[],
  resolver: string,
): Record<string, unknown> {
  const tmp = join(tmpdir(), `ens-batch-${Date.now()}.json`);
  writeFileSync(tmp, JSON.stringify(records));
  try {
    return ensJson([
      "set",
      "batch",
      ensName,
      "--data",
      readFileSync(tmp, "utf8"),
      "--chain",
      "sepolia",
      "--resolver",
      resolver,
    ]);
  } finally {
    unlinkSync(tmp);
  }
}

async function sendCalldata(
  walletClient: ReturnType<typeof createWalletClient>,
  publicClient: ReturnType<typeof createPublicClient>,
  calldata: Record<string, unknown>,
) {
  const hash = await walletClient.sendTransaction({
    to: getAddress(String(calldata.to)),
    data: calldata.data as Hex,
    value: 0n,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { hash, receipt };
}

function parseSubregistryProxy(
  receipt: Awaited<
    ReturnType<ReturnType<typeof createPublicClient>["waitForTransactionReceipt"]>
  >,
): `0x${string}` | null {
  for (const log of receipt.logs) {
    if (
      log.address.toLowerCase() === FACTORY.toLowerCase() &&
      log.topics[0]?.toLowerCase() === FACTORY_DEPLOYED_TOPIC &&
      log.topics[2]
    ) {
      return getAddress(log.topics[2]);
    }
  }

  for (const log of receipt.logs) {
    if (log.topics[0]?.toLowerCase() === UPGRADED_TOPIC) {
      return getAddress(log.address);
    }
  }

  return null;
}

async function main() {
  loadWebEnv();
  const parentName = process.env.ENS_AGENT_PARENT?.trim() || "agenbazar.eth";
  const appBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://agent-bazar-eight.vercel.app";

  const config: AgentEnsConfig = {
    parentName,
    appBaseUrl,
    mcpBaseUrl: process.env.ENS_MCP_BASE_URL?.trim(),
    registryErc7930: process.env.ENS_REGISTRY_ERC7930?.trim(),
  };

  const account = privateKeyToAccount(loadPrivateKey());
  const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC) });
  const walletClient = createWalletClient({
    chain: sepolia,
    transport: http(RPC),
    account,
  });

  console.log(`Publishing agents under ${parentName} for ${account.address}`);

  let subregistryAddress: string | null =
    process.env.ENS_SUBREGISTRY_PROXY?.trim() || null;

  const subregistryDeploy = ensJson([
    "subregistry",
    "deploy",
    parentName,
    "--deployer",
    account.address,
    "--chain",
    "sepolia",
  ]);

  if (subregistryDeploy.alreadySet && subregistryDeploy.subregistry) {
    subregistryAddress = String(subregistryDeploy.subregistry);
    console.log(`Subregistry already set: ${subregistryAddress}`);
  } else if (subregistryAddress) {
    console.log(`Using ENS_SUBREGISTRY_PROXY: ${subregistryAddress}`);
  } else if (subregistryDeploy.alreadyDeployed && subregistryDeploy.registry) {
    subregistryAddress = String(subregistryDeploy.registry);
    console.log(`Subregistry already deployed: ${subregistryAddress}`);
  } else if (!subregistryDeploy.alreadyDeployed) {
    const { hash, receipt } = await sendCalldata(
      walletClient,
      publicClient,
      subregistryDeploy,
    );
    console.log(`Subregistry deploy tx: ${hash}`);
    subregistryAddress = parseSubregistryProxy(receipt);
    if (!subregistryAddress) {
      throw new Error("Could not parse subregistry proxy from deploy receipt");
    }
    console.log(`Subregistry proxy: ${subregistryAddress}`);
  }

  if (!subregistryAddress) {
    // Recover from prior deploy tx if CLI does not detect alreadyDeployed
    subregistryAddress = "0xbe250cd10e9d417d1316d3b345027ac74fb81e62";
    console.log(`Fallback subregistry proxy: ${subregistryAddress}`);
  }

  if (!subregistryDeploy.alreadySet) {
    const setSubregistry = ensJson([
      "subregistry",
      "set",
      parentName,
      "--registry",
      subregistryAddress,
      "--chain",
      "sepolia",
    ]);
    const { hash } = await sendCalldata(
      walletClient,
      publicClient,
      setSubregistry,
    );
    console.log(`Subregistry set tx: ${hash}`);
  }

  const resolverDeploy = ensJson([
    "resolver",
    "deploy",
    account.address,
    "--chain",
    "sepolia",
  ]);
  const resolver = getAddress(String(resolverDeploy.resolver));

  const batches = buildAllAgentEnsBatches(
    config,
    listAgents().filter((agent) =>
      process.env.ENS_PUBLISH_AGENT_ID?.trim()
        ? agent.id === process.env.ENS_PUBLISH_AGENT_ID.trim()
        : true,
    ),
  );

  if (!batches.length) {
    throw new Error(
      `No agents to publish. ENS_PUBLISH_AGENT_ID=${process.env.ENS_PUBLISH_AGENT_ID ?? "(all)"}`,
    );
  }

  for (const batch of batches) {
    console.log(`\n--- ${batch.ensName} ---`);

    try {
      const subname = ensJson([
        "subname",
        "create",
        batch.ensName,
        "--owner",
        account.address,
        "--resolver",
        resolver,
        "--chain",
        "sepolia",
      ]);
      const { hash } = await sendCalldata(walletClient, publicClient, subname);
      console.log(`Subname created: ${hash}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.toLowerCase().includes("revert") ||
        msg.toLowerCase().includes("already") ||
        msg.toLowerCase().includes("exists")
      ) {
        console.log("Subname exists or create skipped, setting records...");
      } else {
        throw err;
      }
    }

    const setBatch = ensSetBatch(batch.ensName, batch.records, resolver);
    const { hash } = await sendCalldata(walletClient, publicClient, setBatch);
    console.log(`ENSIP-25/26 records set: ${hash}`);
  }

  console.log("\n✓ Done. Verify:");
  for (const batch of batches) {
    console.log(
      `ens get text ${batch.ensName} --key agent-context --chain sepolia`,
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
