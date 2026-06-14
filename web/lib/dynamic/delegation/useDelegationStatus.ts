"use client";

import { useCallback, useEffect, useState } from "react";
import { useWalletDelegation } from "@dynamic-labs/sdk-react-core";

import { authFetch } from "@/lib/dynamic/auth-fetch";
import { normalizeChain } from "@/lib/dynamic/delegation/chain";

type WalletDelegationStatus = "delegated" | "denied" | "pending";

export function useDelegationStatus(address?: string, chain = "EVM") {
  const { getWalletsDelegatedStatus } = useWalletDelegation();
  const [hasServerShare, setHasServerShare] = useState(false);

  const refreshServerShare = useCallback(async () => {
    if (!address) {
      setHasServerShare(false);
      return false;
    }

    try {
      const response = await authFetch(
        `/api/delegation?address=${encodeURIComponent(address)}&chain=${encodeURIComponent(normalizeChain(chain))}`,
      );
      const data = (await response.json()) as { success?: boolean };
      const found = response.ok && data.success === true;
      setHasServerShare(found);
      return found;
    } catch {
      setHasServerShare(false);
      return false;
    }
  }, [address, chain]);

  useEffect(() => {
    void refreshServerShare();
  }, [refreshServerShare]);

  const getSdkStatus = useCallback(
    (walletAddress?: string): WalletDelegationStatus | undefined => {
      if (!walletAddress) return undefined;

      return getWalletsDelegatedStatus().find(
        (wallet) =>
          wallet.address.toLowerCase() === walletAddress.toLowerCase(),
      )?.status;
    },
    [getWalletsDelegatedStatus],
  );

  const getEffectiveStatus = useCallback(
    (walletAddress?: string): WalletDelegationStatus | undefined => {
      if (!walletAddress) return undefined;

      const isPrimary =
        address &&
        walletAddress.toLowerCase() === address.toLowerCase();

      if (isPrimary && hasServerShare) return "delegated";

      const sdk = getSdkStatus(walletAddress);
      if (sdk === "delegated" && isPrimary && !hasServerShare) {
        return "pending";
      }

      return sdk;
    },
    [address, getSdkStatus, hasServerShare],
  );

  const getEffectiveWalletStatuses = useCallback(() => {
    return getWalletsDelegatedStatus().map((wallet) => {
      const isPrimary =
        address &&
        wallet.address.toLowerCase() === address.toLowerCase();

      let status = wallet.status;
      if (isPrimary && hasServerShare) {
        status = "delegated";
      } else if (isPrimary && wallet.status === "delegated" && !hasServerShare) {
        status = "pending";
      }

      return { ...wallet, status };
    });
  }, [address, getWalletsDelegatedStatus, hasServerShare]);

  return {
    getEffectiveStatus,
    getEffectiveWalletStatuses,
    getSdkStatus,
    hasServerShare,
    refreshServerShare,
    getWalletsDelegatedStatus,
  };
}
