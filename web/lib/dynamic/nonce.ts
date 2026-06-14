/**
 * Dynamic auth nonce helpers (internal SDK store API).
 * Used to prefetch a nonce before wallet verify — the SDK does not refetch
 * after "Select network" during sign-in.
 */
export {
  fetchAndStoreNonce,
  getNonce,
} from "@dynamic-labs/sdk-internal-nonce";
