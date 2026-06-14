/**
 * Main delegation component - manages delegation status and UI flow
 *
 * This component orchestrates the delegation experience:
 * - Shows loading state while SDK initializes
 * - Displays wallet connection prompt if no wallet connected
 * - Shows delegation status header with enabled/disabled state
 * - Tabbed interface for Modal UI vs Custom UI delegation approaches
 * - Renders methods panel for delegated wallets
 *
 * This is the main entry point for the delegation UI. Import this
 * component wherever you want to display delegation functionality.
 */
"use client";

import { useEffect, useState } from "react";
import { Sparkles, Code2 } from "lucide-react";
import {
  dynamicEvents,
  useDynamicContext,
  useRefreshAuth,
  useRefreshUser,
  useWalletDelegation,
} from "@dynamic-labs/sdk-react-core";

import DelegatedAccessInit from "./init";
import DelegatedAccessMethods from "./methods";
import DelegationManagement from "./management";
import RecoveryOnlyFlagTest from "./recovery-only-test";
import DelegationStatusHeader from "./components/delegation-status-header";
import ConnectedWalletInfo from "./components/connected-wallet-info";
import ConnectWalletPrompt from "./components/connect-wallet-prompt";
import WalletStatusTable from "./components/wallet-status-table";
import DelegationEligibilityNotice from "./components/delegation-eligibility-notice";
import DelegationInfoBox from "@/components/info/delegation-info-box";
import DynamicSdkGate from "@/components/dynamic/dynamic-sdk-gate";
import { useDelegationStatus } from "@/lib/dynamic/delegation/useDelegationStatus";

type DelegationTab = "modal" | "custom";

export default function DelegatedAccess() {
  const { primaryWallet } = useDynamicContext();
  const {
    delegatedAccessEnabled,
    requiresDelegation,
  } = useWalletDelegation();
  const { getEffectiveStatus, getEffectiveWalletStatuses } = useDelegationStatus(
    primaryWallet?.address,
    primaryWallet?.chain ?? "EVM",
  );
  const refreshAuth = useRefreshAuth();
  const refreshUser = useRefreshUser();
  const [activeTab, setActiveTab] = useState<DelegationTab>("modal");
  const [, setRefreshTick] = useState(0);

  const walletStatuses = getEffectiveWalletStatuses();
  const primaryWalletDelegationStatus = primaryWallet
    ? getEffectiveStatus(primaryWallet.address)
    : undefined;

  useEffect(() => {
    const refresh = async () => {
      await Promise.all([refreshAuth(), refreshUser()]);
      setRefreshTick((tick) => tick + 1);
    };

    const events = dynamicEvents as {
      on: (event: string, handler: () => void) => void;
      removeListener: (event: string, handler: () => void) => void;
    };

    events.on("embeddedWalletDelegationCompleted", refresh);
    events.on("embeddedWalletDelegationFailed", refresh);

    return () => {
      events.removeListener("embeddedWalletDelegationCompleted", refresh);
      events.removeListener("embeddedWalletDelegationFailed", refresh);
    };
  }, [refreshAuth, refreshUser]);

  return (
    <DynamicSdkGate>
      <div className="space-y-6">
      {/* Main Status Card */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <DelegationStatusHeader
          isEnabled={delegatedAccessEnabled ?? false}
          requiresDelegation={requiresDelegation}
        />

        <div className={primaryWallet ? "p-6 space-y-4" : "px-4 py-2"}>
          {primaryWallet ? (
            <div className="space-y-4">
              <ConnectedWalletInfo address={primaryWallet.address} />
              <DelegationEligibilityNotice />
              <WalletStatusTable walletStatuses={walletStatuses} />
            </div>
          ) : (
            <ConnectWalletPrompt />
          )}
        </div>
      </div>

      {/* Tabbed Delegation Approaches */}
      {primaryWallet && primaryWalletDelegationStatus === "pending" && (
        <div className="space-y-4">
          {/* Tab Navigation */}
          <DelegationTabs activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Tab Content */}
          {activeTab === "modal" ? (
            <DelegatedAccessInit />
          ) : (
            <DelegationManagement />
          )}
        </div>
      )}

      {/* Methods Panel - shows when delegated */}
      {primaryWallet && primaryWalletDelegationStatus === "delegated" && (
          <>
            <DelegatedAccessMethods />
            <RecoveryOnlyFlagTest />
          </>
        )}

      <DelegationInfoBox />
      </div>
    </DynamicSdkGate>
  );
}

function DelegationTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: DelegationTab;
  onTabChange: (tab: DelegationTab) => void;
}) {
  return (
    <div className="flex gap-2 p-1 bg-muted rounded-lg">
      <button
        onClick={() => onTabChange("modal")}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
          activeTab === "modal"
            ? "bg-background text-dynamic shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Sparkles className="w-4 h-4" />
        <span>Modal UI</span>
      </button>
      <button
        onClick={() => onTabChange("custom")}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
          activeTab === "custom"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Code2 className="w-4 h-4" />
        <span>Custom UI</span>
      </button>
    </div>
  );
}
