"use client";

import { useState } from "react";
import { Loader2, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DEFAULT_MAX_USDC_DAILY,
  DEFAULT_MAX_USDC_PER_TX,
} from "@/lib/agents/constants";
import type { Agent } from "@/lib/agents/types";
import { authFetch } from "@/lib/dynamic/auth-fetch";

interface AgentGrantFormProps {
  agent: Agent;
  address?: string;
  installed: boolean;
  onInstalled: () => void;
  onRevoked: () => void;
}

export function AgentGrantForm({
  agent,
  address,
  installed,
  onInstalled,
  onRevoked,
}: AgentGrantFormProps) {
  const [maxPerTx, setMaxPerTx] = useState(
    String(Number(DEFAULT_MAX_USDC_PER_TX) / 1e6),
  );
  const [maxDaily, setMaxDaily] = useState(
    String(Number(DEFAULT_MAX_USDC_DAILY) / 1e6),
  );
  const [loading, setLoading] = useState<"install" | "revoke" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleInstall() {
    if (!address) return;
    setLoading("install");
    setMessage(null);
    setError(null);

    try {
      const response = await authFetch(`/api/agents/${agent.id}/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          chain: "EVM",
          maxUsdcPerTx: String(Math.round(Number(maxPerTx) * 1e6)),
          maxUsdcDaily: String(Math.round(Number(maxDaily) * 1e6)),
        }),
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.error ?? "Install failed");
        return;
      }
      setMessage(data.message);
      onInstalled();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Install failed");
    } finally {
      setLoading(null);
    }
  }

  async function handleRevoke() {
    setLoading("revoke");
    setMessage(null);
    setError(null);

    try {
      const response = await authFetch(`/api/agents/${agent.id}/install`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.error ?? "Revoke failed");
        return;
      }
      setMessage(data.message);
      onRevoked();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="size-5" />
          Grant & guardrails
        </CardTitle>
        <CardDescription>
          Install this agent to allow delegated signing with spend caps and
          contract allowlists on Optimism.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!address ? (
          <p className="text-muted-foreground text-sm">
            Connect your Dynamic wallet to install this agent.
          </p>
        ) : installed ? (
          <div className="space-y-3">
            <p className="text-sm text-green-700 dark:text-green-400">
              Installed for {address.slice(0, 6)}…{address.slice(-4)}
            </p>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleRevoke()}
              disabled={loading !== null}
            >
              {loading === "revoke" ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Revoking…
                </>
              ) : (
                "Revoke grant"
              )}
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                Max USDC per transaction
                <input
                  className="border-input bg-background rounded-md border px-3 py-2"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={maxPerTx}
                  onChange={(e) => setMaxPerTx(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Max USDC per day
                <input
                  className="border-input bg-background rounded-md border px-3 py-2"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={maxDaily}
                  onChange={(e) => setMaxDaily(e.target.value)}
                />
              </label>
            </div>
            <Button
              type="button"
              onClick={() => void handleInstall()}
              disabled={loading !== null}
            >
              {loading === "install" ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Installing…
                </>
              ) : (
                "Install agent"
              )}
            </Button>
          </>
        )}

        {message && (
          <p className="text-sm text-green-700 dark:text-green-400">{message}</p>
        )}
        {error && <p className="text-destructive text-sm">{error}</p>}
      </CardContent>
    </Card>
  );
}
