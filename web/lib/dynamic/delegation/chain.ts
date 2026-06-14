/** Canonical chain id used in Redis keys and API query params. */
export function normalizeChain(chain: string): string {
  const value = chain.trim();
  const lower = value.toLowerCase();

  if (lower === "evm" || lower.startsWith("eip155")) {
    return "EVM";
  }

  if (lower === "sol" || lower.startsWith("solana")) {
    return "SOL";
  }

  if (lower === "sui") {
    return "SUI";
  }

  return value.toUpperCase();
}
