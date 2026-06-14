import { createPublicClient, http } from "viem";
import { mainnet, sepolia } from "viem/chains";
import { normalize } from "viem/ens";

import { agentEndpointKey, ENSIP26_AGENT_CONTEXT_KEY } from "@/lib/ens/ensip";

function getEnsChain() {
  const chain = process.env.ENS_CHAIN?.trim().toLowerCase() || "sepolia";
  return chain === "mainnet" ? mainnet : sepolia;
}

function getEnsRpcUrl() {
  const chain = process.env.ENS_CHAIN?.trim().toLowerCase() || "sepolia";
  if (chain === "mainnet") {
    return process.env.ETH_RPC_URL?.trim() || "https://eth.llamarpc.com";
  }
  return (
    process.env.SEPOLIA_RPC_URL?.trim() ||
    process.env.ETH_RPC_URL?.trim() ||
    "https://ethereum-sepolia-rpc.publicnode.com"
  );
}

function getEnsClient() {
  return createPublicClient({
    chain: getEnsChain(),
    transport: http(getEnsRpcUrl()),
  });
}

export async function resolveEnsText(
  name: string,
  key: string,
): Promise<string | null> {
  try {
    return await getEnsClient().getEnsText({
      name: normalize(name),
      key,
    });
  } catch {
    return null;
  }
}

export async function resolveAgentFromEns(name: string) {
  const [context, webEndpoint, mcpEndpoint] = await Promise.all([
    resolveEnsText(name, ENSIP26_AGENT_CONTEXT_KEY),
    resolveEnsText(name, agentEndpointKey("web")),
    resolveEnsText(name, agentEndpointKey("mcp")),
  ]);

  return {
    name,
    agentContext: context,
    endpoints: {
      web: webEndpoint,
      mcp: mcpEndpoint,
    },
  };
}
