"use client";

import { useEffect, useState } from "react";
import { Lock, Zap, Loader2, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ChainEnum,
  useDynamicContext,
  useWalletDelegation,
  useWalletPassword,
} from "@/lib/dynamic";
import {
  ensureWalletUnlocked,
  walletNeedsPassword,
} from "@/lib/dynamic/delegation/prepareDelegation";
import { useDelegateWallet } from "@/lib/dynamic/delegation/useDelegateWallet";
import DelegationPasswordField from "./components/delegation-password-field";

/**
 * DelegatedAccessInit - Delegation with Dynamic's Built-in Modal UI
 *
 * Password-protected WaaS wallets delegate via delegateKeyShares with unlock.
 * Other wallets can use Dynamic's modal via initDelegationProcess.
 */
export default function DelegatedAccessInit() {
  const { primaryWallet } = useDynamicContext();
  const { getWalletsDelegatedStatus } = useWalletDelegation();
  const { delegateWallet } = useDelegateWallet();
  const { checkWalletLockState, unlockWallet } = useWalletPassword();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [walletPassword, setWalletPassword] = useState("");
  const [passwordRequired, setPasswordRequired] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function detectPasswordWallet() {
      if (!primaryWallet) {
        setPasswordRequired(false);
        return;
      }

      const needsPassword = await walletNeedsPassword(primaryWallet, {
        checkWalletLockState,
        unlockWallet,
      });

      if (!cancelled) {
        setPasswordRequired(needsPassword);
      }
    }

    void detectPasswordWallet();
    return () => {
      cancelled = true;
    };
  }, [primaryWallet, checkWalletLockState, unlockWallet]);

  const handleInitDelegation = async () => {
    if (!primaryWallet) {
      setError("Primary wallet not found. Please connect your wallet.");
      return;
    }

    const pendingStatus = getWalletsDelegatedStatus().find(
      (wallet) =>
        wallet.address.toLowerCase() === primaryWallet.address.toLowerCase() &&
        wallet.status === "pending",
    );

    if (!pendingStatus) {
      setError(
        "This wallet is not eligible for delegation. Email login must create a Dynamic WaaS (MPC v4) wallet — enable WaaS in the Dynamic dashboard and sign up with a new email if you see the amber warning above.",
      );
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      await ensureWalletUnlocked(
        primaryWallet,
        { checkWalletLockState, unlockWallet },
        walletPassword || undefined,
      );

      const result = await delegateWallet({
        accountAddress: pendingStatus.address,
        chainName: pendingStatus.chain as ChainEnum,
        password: walletPassword || undefined,
      });

      setSuccess(
        result.serverStored
          ? "Delegation active — key share stored in KV. You can build and execute deposits."
          : "Delegation completed.",
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Delegation failed";
      setError(errorMessage);
      console.error("Delegation failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="p-6 space-y-4">
          {/* Method Explanation */}
          <div className="rounded-lg border border-dynamic/20 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-dynamic/10 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4 text-dynamic" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">Approve delegation</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Email login does not use a wallet password. This runs
                  delegation directly for your WaaS wallet.
                </p>
              </div>
            </div>

            {/* What happens */}
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground">
                When triggered, the modal will:
              </p>
              <div className="space-y-1.5">
                <FlowStep number={1} text="Confirm delegation for your wallet" />
                <FlowStep number={2} text="Generate and encrypt MPC key share" />
                <FlowStep number={3} text="Dynamic sends share to your server webhook" />
              </div>
            </div>

            {passwordRequired && (
              <DelegationPasswordField
                value={walletPassword}
                onChange={setWalletPassword}
                required
              />
            )}

            {/* Action Button */}
            <Button
              onClick={handleInitDelegation}
              className="w-full bg-dynamic hover:bg-dynamic/90 text-white"
              disabled={
                isLoading ||
                !primaryWallet ||
                (passwordRequired && !walletPassword)
              }
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Delegating…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Approve Delegation
                </span>
              )}
            </Button>
          </div>

          {success && (
            <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 p-3 text-xs text-green-700 dark:text-green-400">
              {success}
            </div>
          )}

          {/* Error Display */}
          {error && <ErrorMessage message={error} />}

          {/* Code Example */}
          <CodeExample />
        </div>
      </div>
    </div>
  );
}

function FlowStep({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-5 h-5 rounded-full bg-dynamic/15 flex items-center justify-center text-xs font-bold text-dynamic shrink-0">
        {number}
      </div>
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
        <p className="text-xs text-red-600 dark:text-red-400">{message}</p>
      </div>
    </div>
  );
}

function CodeExample() {
  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Info className="w-4 h-4 text-muted-foreground" />
        <h4 className="text-xs font-medium text-muted-foreground">
          Usage Example
        </h4>
      </div>
      <pre className="text-xs bg-background rounded-lg p-3 overflow-x-auto border">
        <code className="text-muted-foreground">{`const { initDelegationProcess } = useWalletDelegation();

// Opens Dynamic's modal UI for delegation
const handleDelegate = async () => {
  try {
    await initDelegationProcess();
    console.log('Delegation completed!');
  } catch (error) {
    console.error('User cancelled or error:', error);
  }
};

// Or delegate specific wallets only
await initDelegationProcess({ wallets: [primaryWallet] });`}</code>
      </pre>
    </div>
  );
}
