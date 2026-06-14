/**
 * ERC-7930 interoperable address for ERC-8004 Identity Registry on mainnet.
 * @see https://docs.ens.domains/ensip/25/ (Ethereum example)
 */
export const ERC8004_IDENTITY_REGISTRY_MAINNET =
  "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as const;

/** Pre-encoded per ENSIP-25 spec — do not hand-roll for ERC-8004 mainnet. */
export const ERC8004_REGISTRY_ERC7930 =
  "0x000100000101148004a169fb4a3325136eb29fa0ceb6d2e539a432" as const;

/** ENSIP-25 verification text record key */
export function agentRegistrationKey(
  registryErc7930: string,
  agentId: string,
): string {
  if (agentId.includes("[") || agentId.includes("]")) {
    throw new Error("agentId must not contain [ or ]");
  }
  return `agent-registration[${registryErc7930}][${agentId}]`;
}

/** ENSIP-26 agent-endpoint key */
export function agentEndpointKey(protocol: "mcp" | "a2a" | "web"): string {
  return `agent-endpoint[${protocol}]`;
}

export const ENSIP26_AGENT_CONTEXT_KEY = "agent-context";
