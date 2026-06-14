const STORAGE_KEY = "lifidynamicens_delegated_wallets";

function readAddresses(): Set<string> {
  if (typeof window === "undefined") {
    return new Set();
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed.map((address) => address.toLowerCase()));
  } catch {
    return new Set();
  }
}

function writeAddresses(addresses: Set<string>) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...addresses]));
}

/** UI hint only — server mint/sign still requires a webhook-stored share in KV. */
export function markWalletDelegatedLocally(address: string) {
  const addresses = readAddresses();
  addresses.add(address.toLowerCase());
  writeAddresses(addresses);
}

export function isWalletDelegatedLocally(address: string) {
  return readAddresses().has(address.toLowerCase());
}

export function clearWalletDelegatedLocally(address: string) {
  const addresses = readAddresses();
  addresses.delete(address.toLowerCase());
  writeAddresses(addresses);
}

export function clearLocalDelegationState() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
