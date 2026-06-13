declare module "@dynamic-labs-wallet/node-evm" {
  import type { ServerKeyShare } from "@dynamic-labs-wallet/node";
  import type { TransactionSerializable } from "viem";

  export class DynamicEvmWalletClient {
    constructor(options: {
      environmentId: string;
      enableMPCAccelerator?: boolean;
      baseMPCRelayApiUrl?: string;
      baseApiUrl?: string;
    });
    authenticateApiToken(token: string): Promise<void>;
  }

  export function createDelegatedEvmWalletClient(options: {
    environmentId: string;
    apiKey: string;
    baseApiUrl?: string;
    baseMPCRelayApiUrl?: string;
    debug?: boolean;
  }): ReturnType<typeof createDelegatedEvmWalletClient>;

  export function delegatedSignMessage(
    client: ReturnType<typeof createDelegatedEvmWalletClient>,
    options: {
      walletId: string;
      walletApiKey: string;
      keyShare: ServerKeyShare;
      message: string | Uint8Array;
      context?: unknown;
      onError?: unknown;
    },
  ): Promise<string>;

  export function delegatedSignTransaction(
    client: ReturnType<typeof createDelegatedEvmWalletClient>,
    options: {
      walletId: string;
      walletApiKey: string;
      keyShare: ServerKeyShare;
      transaction: TransactionSerializable;
    },
  ): Promise<`0x${string}`>;
}

declare module "@dynamic-labs-wallet/node" {
  export type ServerKeyShare = unknown;
}
