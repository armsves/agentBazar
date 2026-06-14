import { getAddress, verifyMessage } from "viem";

import {
  agentRegistrationKey,
  ERC8004_REGISTRY_ERC7930,
} from "@/lib/ens/ensip";
import { resolveEnsText } from "@/lib/ens/resolve";

export const REGISTRATION_MESSAGE_PREFIX = "Agent Bazar — agent self-registration";

const MAX_TIMESTAMP_SKEW_MS = 5 * 60 * 1000;

export function buildRegistrationMessage(params: {
  agentId: string;
  ensName?: string;
  timestamp: number;
}): string {
  const lines = [
    REGISTRATION_MESSAGE_PREFIX,
    `Agent ID: ${params.agentId}`,
  ];
  if (params.ensName?.trim()) {
    lines.push(`ENS: ${params.ensName.trim()}`);
  }
  lines.push(`Timestamp: ${params.timestamp}`);
  return lines.join("\n");
}

export function verifyRegistrationTimestamp(timestamp: number): boolean {
  const now = Date.now();
  return (
    Number.isFinite(timestamp) &&
    Math.abs(now - timestamp) <= MAX_TIMESTAMP_SKEW_MS
  );
}

export async function verifyRegistrationSignature(params: {
  agentId: string;
  ensName?: string;
  timestamp: number;
  signer: string;
  signature: `0x${string}`;
}): Promise<boolean> {
  if (!verifyRegistrationTimestamp(params.timestamp)) return false;

  const message = buildRegistrationMessage({
    agentId: params.agentId,
    ensName: params.ensName,
    timestamp: params.timestamp,
  });

  try {
    const valid = await verifyMessage({
      address: getAddress(params.signer),
      message,
      signature: params.signature,
    });
    return valid;
  } catch {
    return false;
  }
}

export function verifyRegistrySecret(authHeader: string | null): boolean {
  const secret = process.env.AGENT_REGISTRY_SECRET?.trim();
  if (!secret) return false;

  if (!authHeader?.startsWith("Bearer ")) return false;
  return authHeader.slice("Bearer ".length).trim() === secret;
}

export function isEnsSubnameOf(name: string, parent: string): boolean {
  const normalizedName = name.trim().toLowerCase();
  const normalizedParent = parent.trim().toLowerCase();
  return (
    normalizedName === normalizedParent ||
    normalizedName.endsWith(`.${normalizedParent}`)
  );
}

export function parseAgentIdFromContext(context: string | null): string | null {
  if (!context) return null;
  const match = context.match(/Agent ID:\s*`([^`]+)`/);
  return match?.[1]?.trim() ?? null;
}

export async function verifyEnsAgentRegistration(params: {
  ensName: string;
  agentId: string;
  parentName?: string;
}): Promise<{
  verified: boolean;
  agentContext?: string | null;
  endpoints?: { web?: string | null; mcp?: string | null };
}> {
  const parent = params.parentName?.trim() || process.env.ENS_AGENT_PARENT?.trim();
  if (parent && !isEnsSubnameOf(params.ensName, parent)) {
    return { verified: false };
  }

  const registry =
    process.env.ENS_REGISTRY_ERC7930?.trim() || ERC8004_REGISTRY_ERC7930;
  const regKey = agentRegistrationKey(registry, params.agentId);

  const [registration, context, webEndpoint, mcpEndpoint] = await Promise.all([
    resolveEnsText(params.ensName, regKey),
    resolveEnsText(params.ensName, "agent-context"),
    resolveEnsText(params.ensName, "agent-endpoint[web]"),
    resolveEnsText(params.ensName, "agent-endpoint[mcp]"),
  ]);

  const contextAgentId = parseAgentIdFromContext(context);
  const verified =
    registration === "1" &&
    (!contextAgentId || contextAgentId === params.agentId);

  return {
    verified,
    agentContext: context,
    endpoints: {
      web: webEndpoint,
      mcp: mcpEndpoint,
    },
  };
}

export function isAutonomousRegistrationEnabled(): boolean {
  const flag = process.env.AGENT_AUTONOMOUS_REGISTRATION?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return false;
  return true;
}
