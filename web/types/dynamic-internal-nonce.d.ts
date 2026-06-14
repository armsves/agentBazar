declare module "@dynamic-labs/sdk-internal-nonce" {
  export const fetchAndStoreNonce: () => Promise<void>;
  export const getNonce: () => string | undefined;
}
