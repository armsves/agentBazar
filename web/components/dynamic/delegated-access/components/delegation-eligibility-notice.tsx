"use client";

import { useMemo } from "react";
import { AlertTriangle, ArrowUpCircle } from "lucide-react";
import {
  useDynamicContext,
  useUpgradeToDynamicWaasFlow,
  useWalletDelegation,
} from "@dynamic-labs/sdk-react-core";
import { isDynamicWaasConnector } from "@dynamic-labs/wallet-connector-core";

import { Button } from "@/components/ui/button";

export default function DelegationEligibilityNotice() {
  const { primaryWallet, user } = useDynamicContext();
  const { delegatedAccessEnabled, getWalletsDelegatedStatus } =
    useWalletDelegation();
  const { promptUpgradeToDynamicWaasFlow } = useUpgradeToDynamicWaasFlow();

  const walletType = useMemo(() => {
    const credential = user?.verifiedCredentials?.find(
      (vc) =>
        vc.format === "blockchain" &&
        vc.address?.toLowerCase() === primaryWallet?.address.toLowerCase(),
    );

    return credential?.walletName ?? primaryWallet?.connector.key ?? "unknown";
  }, [primaryWallet, user?.verifiedCredentials]);

  const isWaasWallet =
    primaryWallet?.connector && isDynamicWaasConnector(primaryWallet.connector);
  const walletStatuses = getWalletsDelegatedStatus();
  const hasEligibleWallet = walletStatuses.some(
    (wallet) => wallet.status === "pending" || wallet.status === "delegated",
  );

  if (
    !primaryWallet ||
    !delegatedAccessEnabled ||
    isWaasWallet ||
    hasEligibleWallet
  ) {
    return null;
  }

  const isTurnkeyWallet =
    walletType.includes("turnkey") || walletType === "embeddedwallet";

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
      <div className="mb-2 flex items-center gap-2 font-medium text-amber-800 dark:text-amber-300">
        <AlertTriangle className="size-4 shrink-0" />
        This wallet cannot be delegated yet
      </div>
      <p className="text-muted-foreground mb-3">
        Email login created a{" "}
        <strong>{isTurnkeyWallet ? "Turnkey (v3)" : walletType}</strong> embedded
        wallet. Delegated access only works with{" "}
        <strong>Dynamic WaaS (MPC v4)</strong> wallets (
        <code className="text-xs">dynamicwaas</code>).
      </p>
      <div className="space-y-2 text-muted-foreground text-xs">
        <p>
          <strong>Option 1 — Upgrade this account:</strong> click below to
          migrate to WaaS, then approve delegation.
        </p>
        <p>
          <strong>Option 2 — Dashboard:</strong> Dynamic dashboard → Embedded
          Wallets → use <strong>Dynamic WaaS / MPC v4</strong> (not legacy
          Turnkey v3). Log out, sign up again with a new email.
        </p>
      </div>
      <Button
        type="button"
        className="mt-4 bg-dynamic hover:bg-dynamic/90 text-white"
        onClick={() => promptUpgradeToDynamicWaasFlow()}
      >
        <ArrowUpCircle className="mr-2 size-4" />
        Upgrade to Dynamic WaaS
      </Button>
    </div>
  );
}
