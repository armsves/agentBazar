"use client";

import { useState } from "react";
import { Droplets, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDynamicContext, useWalletDelegation } from "@/lib/dynamic";
import { authFetch } from "@/lib/dynamic/auth-fetch";

interface MintResponse {
  success: boolean;
  dryRun?: boolean;
  composeHash?: string;
  userProxy?: string;
  approvalHashes?: string[];
  approvalsRequired?: number;
  liquidity?: string;
  totalUsdcDeposit?: string;
  explorerUrl?: string;
  error?: string;
}

export default function LpMint() {
  const { primaryWallet, user } = useDynamicContext();
  const { getWalletsDelegatedStatus } = useWalletDelegation();
  const [version, setVersion] = useState<"v3" | "v4">("v3");
  const [usdcAmount, setUsdcAmount] = useState("1000000");
  const [usdtAmount, setUsdtAmount] = useState("1000000");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<"build" | "execute" | null>(
    null,
  );
  const [result, setResult] = useState<MintResponse | null>(null);

  const address = primaryWallet?.address;
  const delegationStatus = address
    ? getWalletsDelegatedStatus().find((w) => w.address === address)?.status
    : undefined;
  const isDelegated = delegationStatus === "delegated";

  async function handleDeposit(dryRun: boolean) {
    if (!address || !isDelegated) return;

    setIsLoading(true);
    setLoadingAction(dryRun ? "build" : "execute");
    setResult(null);

    try {
      const response = await authFetch("/api/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          chain: "EVM",
          version,
          usdcAmount,
          usdtAmount,
          dryRun,
        }),
      });

      const data = (await response.json()) as MintResponse;
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Deposit request failed",
      });
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplets className="size-5" />
          LiFi Composer LP Deposit
        </CardTitle>
        <CardDescription>
          Build and execute a USDC/USDT Uniswap deposit on Optimism. Signing uses
          your Dynamic delegation — no wallet private keys on the server.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!user || !address ? (
          <p className="text-muted-foreground text-sm">
            Connect your wallet with Dynamic, then approve delegation below.
          </p>
        ) : !isDelegated ? (
          <p className="text-muted-foreground text-sm">
            Wallet connected ({address.slice(0, 6)}…{address.slice(-4)}). Approve
            delegation in the section below before building or executing a deposit.
          </p>
        ) : (
          <>
            <p className="text-sm text-green-700 dark:text-green-400">
              Delegation active — server can sign deposits for this wallet.
            </p>

            <div className="flex gap-2">
              <Button
                type="button"
                variant={version === "v3" ? "default" : "outline"}
                size="sm"
                onClick={() => setVersion("v3")}
              >
                Uniswap v3
              </Button>
              <Button
                type="button"
                variant={version === "v4" ? "default" : "outline"}
                size="sm"
                onClick={() => setVersion("v4")}
              >
                Uniswap v4
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                USDC amount (6 decimals)
                <input
                  className="border-input bg-background rounded-md border px-3 py-2"
                  value={usdcAmount}
                  onChange={(e) => setUsdcAmount(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                USDT amount (6 decimals)
                <input
                  className="border-input bg-background rounded-md border px-3 py-2"
                  value={usdtAmount}
                  onChange={(e) => setUsdtAmount(e.target.value)}
                />
              </label>
            </div>

            <p className="text-muted-foreground text-xs">
              Total USDC deposit:{" "}
              {(
                BigInt(usdcAmount || "0") + BigInt(usdtAmount || "0")
              ).toString()}{" "}
              (USDC_AMOUNT + USDT_AMOUNT)
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDeposit(true)}
                disabled={isLoading}
              >
                {isLoading && loadingAction === "build" ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Building…
                  </>
                ) : (
                  `Build ${version.toUpperCase()} flow`
                )}
              </Button>
              <Button
                type="button"
                onClick={() => handleDeposit(false)}
                disabled={isLoading}
              >
                {isLoading && loadingAction === "execute" ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Executing…
                  </>
                ) : (
                  `Execute ${version.toUpperCase()} deposit`
                )}
              </Button>
            </div>
          </>
        )}

        {result && (
          <div
            className={`rounded-md border p-3 text-sm ${
              result.success
                ? "border-green-500/40 bg-green-500/5"
                : "border-destructive/40 bg-destructive/5"
            }`}
          >
            {result.success ? (
              <div className="flex flex-col gap-1">
                <p className="font-medium text-green-700 dark:text-green-400">
                  {result.dryRun ? "Flow built & simulated" : "Deposit executed"}
                </p>
                {result.userProxy && (
                  <p>
                    User proxy:{" "}
                    <code className="text-xs">{result.userProxy}</code>
                  </p>
                )}
                {result.totalUsdcDeposit && (
                  <p>Total USDC deposit: {result.totalUsdcDeposit}</p>
                )}
                {result.liquidity && <p>v4 liquidity: {result.liquidity}</p>}
                {result.dryRun && result.approvalsRequired !== undefined && (
                  <p>Preflight approvals required: {result.approvalsRequired}</p>
                )}
                {!result.dryRun &&
                  result.approvalHashes &&
                  result.approvalHashes.length > 0 && (
                    <p>
                      Approvals: {result.approvalHashes.length} tx
                      {result.approvalHashes.length > 1 ? "s" : ""}
                    </p>
                  )}
                {result.explorerUrl && (
                  <a
                    href={result.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline"
                  >
                    View on Optimistic Etherscan
                  </a>
                )}
              </div>
            ) : (
              <p className="text-destructive">{result.error}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
