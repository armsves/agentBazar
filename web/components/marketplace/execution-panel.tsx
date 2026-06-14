"use client";

import { useEffect, useState } from "react";
import { Droplets, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Agent } from "@/lib/agents/types";
import { useDynamicContext } from "@/lib/dynamic";
import { authFetch } from "@/lib/dynamic/auth-fetch";
import { useDelegationStatus } from "@/lib/dynamic/delegation/useDelegationStatus";

const OPTIMISM_CHAIN_ID = 10;

interface ExecuteResponse {
  success: boolean;
  dryRun?: boolean;
  composeHash?: string;
  userProxy?: string;
  approvalHashes?: string[];
  approvalsRequired?: number;
  liquidity?: string;
  totalUsdcDeposit?: string;
  explorerUrl?: string;
  guardrails?: { maxUsdcPerTx: string; maxUsdcDaily: string };
  error?: string;
}

interface ExecutionPanelProps {
  agent: Agent;
  installed: boolean;
}

export function ExecutionPanel({ agent, installed }: ExecutionPanelProps) {
  const { primaryWallet } = useDynamicContext();
  const { getEffectiveStatus, hasServerShare } = useDelegationStatus(
    primaryWallet?.address,
    "EVM",
  );

  const [usdcAmount, setUsdcAmount] = useState("1000000");
  const [usdtAmount, setUsdtAmount] = useState("1000000");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<"build" | "execute" | null>(
    null,
  );
  const [result, setResult] = useState<ExecuteResponse | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);

  const address = primaryWallet?.address;
  const isOnOptimism = chainId === OPTIMISM_CHAIN_ID;
  const isDelegated =
    getEffectiveStatus(address) === "delegated" && hasServerShare;

  useEffect(() => {
    let cancelled = false;

    async function loadNetwork() {
      if (!primaryWallet) {
        setChainId(null);
        return;
      }
      const network = await primaryWallet.connector.getNetwork(true);
      if (!cancelled) setChainId(Number(network));
    }

    void loadNetwork();
    return () => {
      cancelled = true;
    };
  }, [primaryWallet]);

  async function handleSwitchToOptimism() {
    if (!primaryWallet) return;
    setIsSwitchingNetwork(true);
    try {
      await primaryWallet.switchNetwork(OPTIMISM_CHAIN_ID);
      const network = await primaryWallet.connector.getNetwork(true);
      setChainId(Number(network));
    } finally {
      setIsSwitchingNetwork(false);
    }
  }

  async function handleExecute(dryRun: boolean) {
    if (!address || !isDelegated || !isOnOptimism || !installed) return;

    setIsLoading(true);
    setLoadingAction(dryRun ? "build" : "execute");
    setResult(null);

    try {
      const response = await authFetch(`/api/agents/${agent.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          chain: "EVM",
          usdcAmount,
          usdtAmount,
          dryRun,
        }),
      });
      const data = (await response.json()) as ExecuteResponse;
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Execution failed",
      });
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Droplets className="size-5" />
          Run agent
        </CardTitle>
        <CardDescription>
          Build or execute a {agent.version.toUpperCase()} LP deposit with
          guardrails enforced before signing.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!installed ? (
          <p className="text-muted-foreground text-sm">
            Install this agent and set spend caps before running.
          </p>
        ) : !isDelegated ? (
          <p className="text-muted-foreground text-sm">
            Approve wallet delegation on the home page first.
          </p>
        ) : !isOnOptimism ? (
          <div className="space-y-3 text-sm">
            <p className="text-amber-700 dark:text-amber-300">
              Agent runs on Optimism (chain 10). Wallet is on chain{" "}
              {chainId ?? "unknown"}.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleSwitchToOptimism()}
              disabled={isSwitchingNetwork}
            >
              {isSwitchingNetwork ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Switching…
                </>
              ) : (
                "Switch to Optimism"
              )}
            </Button>
          </div>
        ) : (
          <>
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
              Total deposit:{" "}
              {(
                BigInt(usdcAmount || "0") + BigInt(usdtAmount || "0")
              ).toString()}{" "}
              (6-decimal units)
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleExecute(true)}
                disabled={isLoading}
              >
                {isLoading && loadingAction === "build" ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Simulating…
                  </>
                ) : (
                  "Dry run (simulate)"
                )}
              </Button>
              <Button
                type="button"
                onClick={() => void handleExecute(false)}
                disabled={isLoading}
              >
                {isLoading && loadingAction === "execute" ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Executing…
                  </>
                ) : (
                  "Execute deposit"
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
                  {result.dryRun ? "Simulation passed guardrails" : "Executed"}
                </p>
                {result.guardrails && (
                  <p className="text-muted-foreground text-xs">
                    Caps: {Number(result.guardrails.maxUsdcPerTx) / 1e6} USDC/tx
                  </p>
                )}
                {result.userProxy && (
                  <p>
                    Proxy: <code className="text-xs">{result.userProxy}</code>
                  </p>
                )}
                {result.totalUsdcDeposit && (
                  <p>Total: {result.totalUsdcDeposit}</p>
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
