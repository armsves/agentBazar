"use client";

import { useCallback } from "react";
import { ChainEnum } from "@dynamic-labs/sdk-api-core";
import {
  dynamicEvents,
  useDynamicContext,
  useDynamicWaas,
  useRefreshAuth,
  useRefreshUser,
  useWalletDelegation,
} from "@dynamic-labs/sdk-react-core";

import { authFetch } from "@/lib/dynamic/auth-fetch";
import { normalizeChain } from "@/lib/dynamic/delegation/chain";
import {
  clearWalletDelegatedLocally,
  markWalletDelegatedLocally,
} from "@/lib/dynamic/delegation/sessionDelegation";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type DelegateWalletResult = {
  sdkSynced: boolean;
  serverStored: boolean;
};

async function waitForServerDelegation(
  address: string,
  chain: string,
): Promise<boolean> {
  const normalizedChain = normalizeChain(chain);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const response = await authFetch(
        `/api/delegation?address=${encodeURIComponent(address)}&chain=${encodeURIComponent(normalizedChain)}`,
      );
      const data = (await response.json()) as { success?: boolean };
      if (response.ok && data.success) {
        return true;
      }
    } catch {
      // auth may not be ready on first attempts
    }

    await sleep(1500);
  }

  return false;
}

async function waitForServerRevocation(
  address: string,
  chain: string,
): Promise<boolean> {
  const normalizedChain = normalizeChain(chain);

  for (let attempt = 0; attempt < 15; attempt += 1) {
    try {
      const response = await authFetch(
        `/api/delegation?address=${encodeURIComponent(address)}&chain=${encodeURIComponent(normalizedChain)}`,
      );
      if (response.status === 404) {
        return true;
      }
    } catch {
      // auth may not be ready on first attempts
    }

    await sleep(1000);
  }

  return false;
}

function resolveWalletChain(
  accountAddress: string,
  chainName: ChainEnum | string,
  getWalletsDelegatedStatus: ReturnType<
    typeof useWalletDelegation
  >["getWalletsDelegatedStatus"],
): ChainEnum {
  const walletStatus = getWalletsDelegatedStatus().find(
    (wallet) =>
      wallet.address.toLowerCase() === accountAddress.toLowerCase(),
  );

  return (walletStatus?.chain ?? chainName ?? ChainEnum.Evm) as ChainEnum;
}

export function useDelegateWallet() {
  const { primaryWallet } = useDynamicContext();
  const { getWaasWalletConnector } = useDynamicWaas();
  const refreshAuth = useRefreshAuth();
  const refreshUser = useRefreshUser();
  const { getWalletsDelegatedStatus, revokeDelegation } = useWalletDelegation();

  const isSdkDelegated = useCallback(
    (address: string) =>
      getWalletsDelegatedStatus().some(
        (wallet) =>
          wallet.address.toLowerCase() === address.toLowerCase() &&
          wallet.status === "delegated",
      ),
    [getWalletsDelegatedStatus],
  );

  const waitForSdkDelegated = useCallback(
    async (address: string) => {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        if (isSdkDelegated(address)) {
          return true;
        }

        await refreshAuth();
        await refreshUser();
        await sleep(1000);
      }

      return isSdkDelegated(address);
    },
    [isSdkDelegated, refreshAuth, refreshUser],
  );

  const waitForSdkRevoked = useCallback(
    async (address: string) => {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        if (!isSdkDelegated(address)) {
          return true;
        }

        await refreshAuth();
        await refreshUser();
        await sleep(1000);
      }

      return !isSdkDelegated(address);
    },
    [isSdkDelegated, refreshAuth, refreshUser],
  );

  const delegateWallet = useCallback(
    async ({
      accountAddress,
      chainName,
      password,
    }: {
      accountAddress: string;
      chainName: ChainEnum;
      password?: string;
    }): Promise<DelegateWalletResult> => {
      const resolvedChain = resolveWalletChain(
        accountAddress,
        chainName,
        getWalletsDelegatedStatus,
      );
      const connector = getWaasWalletConnector(resolvedChain);
      if (!connector) {
        throw new Error(
          `No Dynamic WaaS connector for chain ${resolvedChain}. This wallet may not be a WaaS wallet.`,
        );
      }

      try {
        await connector.delegateKeyShares({
          accountAddress,
          password,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "delegateKeyShares failed";

        throw new Error(
          `${message}. Confirm Delegated Access is enabled and the RSA public key in the Dynamic dashboard matches DYNAMIC_DELEGATION_PRIVATE_KEY.`,
        );
      }

      const events = dynamicEvents as {
        emit: (event: string, payload?: unknown) => void;
      };
      events.emit(
        "embeddedWalletDelegationCompleted",
        primaryWallet ?? { address: accountAddress, chain: resolvedChain },
      );

      const sdkSynced = await waitForSdkDelegated(accountAddress);
      if (sdkSynced) {
        markWalletDelegatedLocally(accountAddress);
      }

      const serverStored = await waitForServerDelegation(
        accountAddress,
        resolvedChain,
      );

      if (!serverStored) {
        throw new Error(
          "Dynamic completed delegation in the browser, but your server never stored the key share in KV. Check: (1) Dynamic webhook URL is https://agent-bazar-eight.vercel.app/api/webhooks/dynamic, (2) DYNAMIC_WEBHOOK_SECRET matches the dashboard, (3) the RSA public key in Dynamic matches DYNAMIC_DELEGATION_PRIVATE_KEY.",
        );
      }

      return { sdkSynced, serverStored };
    },
    [
      getWaasWalletConnector,
      getWalletsDelegatedStatus,
      primaryWallet,
      waitForSdkDelegated,
    ],
  );

  const revokeWallet = useCallback(
    async ({
      accountAddress,
      chainName,
      password,
    }: {
      accountAddress: string;
      chainName: ChainEnum;
      password?: string;
    }) => {
      const resolvedChain = resolveWalletChain(
        accountAddress,
        chainName,
        getWalletsDelegatedStatus,
      );
      const normalizedChain = normalizeChain(resolvedChain);

      let sdkRevokeError: string | undefined;

      if (isSdkDelegated(accountAddress)) {
        try {
          await revokeDelegation(
            [{ accountAddress, chainName: resolvedChain }],
            password,
          );
        } catch (error) {
          sdkRevokeError =
            error instanceof Error ? error.message : "SDK revoke failed";
        }
      } else {
        const connector = getWaasWalletConnector(resolvedChain);
        if (connector) {
          try {
            await connector.revokeDelegation({
              accountAddress,
              password,
            });
            await Promise.all([refreshAuth(), refreshUser()]);
          } catch (error) {
            sdkRevokeError =
              error instanceof Error ? error.message : "Connector revoke failed";
          }
        }
      }

      const deleteResponse = await authFetch(
        `/api/delegation?address=${encodeURIComponent(accountAddress)}&chain=${encodeURIComponent(normalizedChain)}`,
        { method: "DELETE" },
      );

      if (!deleteResponse.ok) {
        const data = (await deleteResponse.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          data.error ||
            `Failed to remove delegation from server (HTTP ${deleteResponse.status})`,
        );
      }

      const serverCleared = await waitForServerRevocation(
        accountAddress,
        resolvedChain,
      );

      if (!serverCleared) {
        throw new Error(
          "Server still has the delegation key share after revoke. Hard refresh and try again.",
        );
      }

      clearWalletDelegatedLocally(accountAddress);
      await waitForSdkRevoked(accountAddress);

      if (sdkRevokeError) {
        console.warn("Dynamic SDK revoke warning:", sdkRevokeError);
      }
    },
    [
      getWaasWalletConnector,
      getWalletsDelegatedStatus,
      isSdkDelegated,
      refreshAuth,
      refreshUser,
      revokeDelegation,
    ],
  );

  return { delegateWallet, revokeWallet, isSdkDelegated };
}
