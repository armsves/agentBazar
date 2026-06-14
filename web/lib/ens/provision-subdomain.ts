import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

import type { Agent } from "@/lib/agents/types";
import {
  agentEnsName,
  buildAgentEnsRecords,
  type AgentEnsConfig,
  type EnsTextRecord,
} from "@/lib/ens/agent-records";

const ENS_CLI_NPX = "https://pkg.pr.new/gskril/ens-cli/@ensdomains/cli@main";
const DEFAULT_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const FACTORY = "0xd2A632D8A8b67C2c4398c255CBd7Af8Dd7236198" as const;
const FACTORY_DEPLOYED_TOPIC =
  "0x0a2c575ff341b41da136c9ccae74ec230a927a024d18f0dccf46d123f28f5f54" as const;
const UPGRADED_TOPIC =
  "0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b" as const;
const FALLBACK_SUBREGISTRY = "0xbe250cd10e9d417d1316d3b345027ac74fb81e62" as const;

export function isEnsProvisioningEnabled(): boolean {
  const parent = process.env.ENS_AGENT_PARENT?.trim();
  if (!parent) return false;
  return Boolean(loadParentPrivateKeyOptional());
}

function loadParentPrivateKeyOptional(): Hex | null {
  let pk =
    process.env.ENS_PARENT_PRIVATE_KEY?.trim() ||
    process.env.PRIVATE_KEY?.trim();
  if (!pk) return null;
  if (!pk.startsWith("0x")) pk = `0x${pk}`;
  return pk as Hex;
}

function loadParentPrivateKey(): Hex {
  const pk = loadParentPrivateKeyOptional();
  if (!pk) {
    throw new Error(
      "Set ENS_PARENT_PRIVATE_KEY or PRIVATE_KEY to provision agent ENS subdomains",
    );
  }
  return pk;
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
  records: EnsTextRecord[],
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
    account: walletClient.account!,
    chain: walletClient.chain,
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

function isSubnameExistsError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("revert") ||
    lower.includes("already") ||
    lower.includes("exists")
  );
}

function agentEnsConfig(): AgentEnsConfig {
  const parentName = process.env.ENS_AGENT_PARENT?.trim();
  if (!parentName) {
    throw new Error("ENS_AGENT_PARENT is required to provision agent subdomains");
  }

  const appBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://agent-bazar-eight.vercel.app";

  return {
    parentName,
    appBaseUrl,
    mcpBaseUrl: process.env.ENS_MCP_BASE_URL?.trim(),
    registryErc7930: process.env.ENS_REGISTRY_ERC7930?.trim(),
  };
}

async function ensureSubregistry(
  walletClient: ReturnType<typeof createWalletClient>,
  publicClient: ReturnType<typeof createPublicClient>,
  parentName: string,
  accountAddress: `0x${string}`,
): Promise<string> {
  let subregistryAddress: string | null =
    process.env.ENS_SUBREGISTRY_PROXY?.trim() || null;

  const subregistryDeploy = ensJson([
    "subregistry",
    "deploy",
    parentName,
    "--deployer",
    accountAddress,
    "--chain",
    "sepolia",
  ]);

  if (subregistryDeploy.alreadySet && subregistryDeploy.subregistry) {
    subregistryAddress = String(subregistryDeploy.subregistry);
  } else if (subregistryAddress) {
    // use configured proxy
  } else if (subregistryDeploy.alreadyDeployed && subregistryDeploy.registry) {
    subregistryAddress = String(subregistryDeploy.registry);
  } else if (!subregistryDeploy.alreadyDeployed) {
    const { hash, receipt } = await sendCalldata(
      walletClient,
      publicClient,
      subregistryDeploy,
    );
    subregistryAddress = parseSubregistryProxy(receipt);
    if (!subregistryAddress) {
      throw new Error(`Could not parse subregistry proxy from tx ${hash}`);
    }
  }

  if (!subregistryAddress) {
    subregistryAddress = FALLBACK_SUBREGISTRY;
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
    await sendCalldata(walletClient, publicClient, setSubregistry);
  }

  return subregistryAddress;
}

async function resolveResolver(
  walletClient: ReturnType<typeof createWalletClient>,
  publicClient: ReturnType<typeof createPublicClient>,
  accountAddress: `0x${string}`,
): Promise<string> {
  const configured = process.env.ENS_RESOLVER?.trim();
  if (configured) return getAddress(configured);

  const resolverDeploy = ensJson([
    "resolver",
    "deploy",
    accountAddress,
    "--chain",
    "sepolia",
  ]);
  return getAddress(String(resolverDeploy.resolver));
}

export function expectedAgentEnsName(agent: Agent): string | null {
  const parent = process.env.ENS_AGENT_PARENT?.trim();
  if (!parent) return null;
  return agentEnsName(agent, parent);
}

/** Create subname + ENSIP-25/26 records for an agent under ENS_AGENT_PARENT. */
export async function provisionAgentEnsSubdomain(agent: Agent): Promise<{
  ensName: string;
  txHashes: string[];
}> {
  const config = agentEnsConfig();
  const ensName = agentEnsName(agent, config.parentName);
  const rpc =
    process.env.SEPOLIA_RPC_URL?.trim() || DEFAULT_RPC;

  const account = privateKeyToAccount(loadParentPrivateKey());
  const publicClient = createPublicClient({ chain: sepolia, transport: http(rpc) });
  const walletClient = createWalletClient({
    chain: sepolia,
    transport: http(rpc),
    account,
  });

  const txHashes: string[] = [];

  await ensureSubregistry(
    walletClient,
    publicClient,
    config.parentName,
    account.address,
  );

  const resolver = await resolveResolver(
    walletClient,
    publicClient,
    account.address,
  );

  try {
    const subname = ensJson([
      "subname",
      "create",
      ensName,
      "--owner",
      account.address,
      "--resolver",
      resolver,
      "--chain",
      "sepolia",
    ]);
    const { hash } = await sendCalldata(walletClient, publicClient, subname);
    txHashes.push(hash);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!isSubnameExistsError(msg)) throw err;
  }

  const records = buildAgentEnsRecords(agent, config);
  const setBatch = ensSetBatch(ensName, records, resolver);
  const { hash } = await sendCalldata(walletClient, publicClient, setBatch);
  txHashes.push(hash);

  return { ensName, txHashes };
}
