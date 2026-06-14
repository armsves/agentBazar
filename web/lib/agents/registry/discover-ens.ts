import { agentEnsName } from "@/lib/ens/agent-records";
import { resolveAgentFromEns } from "@/lib/ens/resolve";

import { AGENT_REGISTRY } from "@/lib/agents/registry";
import type { Agent, AgentCapability, AgentKind, UniswapVersion } from "@/lib/agents/types";
import { OPTIMISM_CHAIN_ID } from "../../../../src/optimism";

import {
  type AgentRegistrationRecord,
  listAgentRegistrations,
  upsertAgentRegistration,
} from "./dynamic-storage";
import {
  parseAgentIdFromContext,
  verifyEnsAgentRegistration,
} from "./verify-registration";

const SUBDOMAIN_TO_AGENT_ID: Record<string, string> = {
  concierge: "agent-bazar-concierge",
  "v3-lp": "uniswap-v3-lp",
  "v4-lp": "uniswap-v4-lp",
  "lifidynamicens-lp": "lifidynamicens-lp",
  "composer-v3-lp": "composer-v3-lp",
  "composer-v4-lp": "composer-v4-lp",
  "lifi-earn-balancer": "lifi-earn-balancer",
};

function subdomainFromEnsName(ensName: string, parent: string): string {
  const suffix = `.${parent}`;
  if (!ensName.endsWith(suffix)) return ensName;
  return ensName.slice(0, -suffix.length);
}

function inferAgentFromContext(params: {
  ensName: string;
  agentId: string;
  agentContext: string | null;
  endpoints: { web?: string | null; mcp?: string | null };
  builtin?: Agent;
}): Agent {
  if (params.builtin) return params.builtin;

  const context = params.agentContext ?? "";
  const nameMatch = context.match(/^#\s+(.+)$/m);
  const name = nameMatch?.[1]?.trim() || params.agentId;

  const descMatch = context.match(/^#\s+.+\n\n([\s\S]*?)\n\n##/m);
  const description =
    descMatch?.[1]?.trim().split("\n")[0] ||
    `Agent discovered via ENS at ${params.ensName}`;

  const kindMatch = context.match(/- Kind:\s*(\w+)/);
  const kind = (kindMatch?.[1] as AgentKind | undefined) ?? "specialist";

  const capsSection = context.match(/## Capabilities\n([\s\S]*?)\n\n##/);
  const capabilities: AgentCapability[] = [];
  if (capsSection?.[1]) {
    for (const line of capsSection[1].split("\n")) {
      const cap = line.replace(/^-\s*/, "").trim();
      if (
        cap === "uniswap-v3-lp" ||
        cap === "uniswap-v4-lp" ||
        cap === "earn-portfolio"
      ) {
        capabilities.push(cap);
      }
    }
  }
  if (!capabilities.length) {
    if (params.agentId.includes("earn") || params.agentId.includes("balancer")) {
      capabilities.push("earn-portfolio");
    } else if (params.agentId.includes("v4")) capabilities.push("uniswap-v4-lp");
    else if (params.agentId.includes("v3") || params.agentId.includes("lp")) {
      capabilities.push("uniswap-v3-lp");
    }
  }

  const version: UniswapVersion =
    params.agentId.includes("v4") || capabilities.includes("uniswap-v4-lp")
      ? "v4"
      : "v3";

  return {
    id: params.agentId,
    name,
    description,
    longDescription: context || description,
    kind,
    capabilities,
    version,
    chainId: OPTIMISM_CHAIN_ID,
    tags: ["ens-discovered", "registered"],
  };
}

export function knownEnsNamesForParent(parentName: string): string[] {
  const names = new Set<string>();

  for (const agent of AGENT_REGISTRY) {
    names.add(agentEnsName(agent, parentName));
  }

  const extra = process.env.ENS_DISCOVER_SUBNAMES?.trim();
  if (extra) {
    for (const sub of extra.split(",")) {
      const trimmed = sub.trim();
      if (trimmed) names.add(`${trimmed}.${parentName}`);
    }
  }

  return [...names];
}

export async function knownEnsNamesForDiscovery(
  parentName: string,
): Promise<string[]> {
  const names = new Set(knownEnsNamesForParent(parentName));
  const registrations = await listAgentRegistrations();

  for (const record of registrations) {
    if (record.ensName?.trim()) names.add(record.ensName.trim());
  }

  return [...names];
}

export async function discoverAgentFromEnsName(
  ensName: string,
  parentName: string,
): Promise<AgentRegistrationRecord | null> {
  const subdomain = subdomainFromEnsName(ensName, parentName);
  const hintedId = SUBDOMAIN_TO_AGENT_ID[subdomain];

  const resolved = await resolveAgentFromEns(ensName);
  const contextAgentId =
    parseAgentIdFromContext(resolved.agentContext) ?? hintedId;

  if (!contextAgentId) return null;

  const verification = await verifyEnsAgentRegistration({
    ensName,
    agentId: contextAgentId,
    parentName,
  });

  if (!verification.verified) return null;

  const builtin = AGENT_REGISTRY.find((a) => a.id === contextAgentId);
  const agent = inferAgentFromContext({
    ensName,
    agentId: contextAgentId,
    agentContext: resolved.agentContext,
    endpoints: verification.endpoints ?? resolved.endpoints,
    builtin,
  });

  const now = new Date().toISOString();
  return upsertAgentRegistration({
    agent,
    ensName,
    endpoints: verification.endpoints ?? resolved.endpoints,
    registeredAt: now,
    updatedAt: now,
    verification: "ens",
  });
}

export async function discoverAgentsFromEns(params?: {
  parentName?: string;
  sync?: boolean;
}): Promise<AgentRegistrationRecord[]> {
  const parent =
    params?.parentName?.trim() || process.env.ENS_AGENT_PARENT?.trim();
  if (!parent) return [];

  const ensNames = await knownEnsNamesForDiscovery(parent);
  const discovered: AgentRegistrationRecord[] = [];

  for (const ensName of ensNames) {
    const record = await discoverAgentFromEnsName(ensName, parent);
    if (record) discovered.push(record);
  }

  return discovered;
}
