"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, Loader2 } from "lucide-react";

import { AgentCard } from "@/components/marketplace/agent-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Agent, AgentExecutionLog, UserAgentGrant } from "@/lib/agents/types";
import { useDynamicContext } from "@/lib/dynamic";
import { authFetch } from "@/lib/dynamic/auth-fetch";

type InstalledEntry = {
  grant: UserAgentGrant;
  agent: Agent | undefined;
};

export default function DashboardPage() {
  const { user } = useDynamicContext();
  const [installed, setInstalled] = useState<InstalledEntry[]>([]);
  const [executions, setExecutions] = useState<AgentExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!user) {
      setInstalled([]);
      setExecutions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authFetch("/api/grants");
      const data = await response.json();
      if (!data.success) {
        setError(data.error ?? "Failed to load dashboard");
        return;
      }
      setInstalled(data.installed);
      setExecutions(data.executions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return (
    <div className="flex w-full max-w-4xl flex-col gap-8 pt-16">
      <div className="flex flex-col gap-2">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <LayoutDashboard className="size-6" />
          My Agents
        </h1>
        <p className="text-muted-foreground text-sm">
          Installed agents and recent execution history for your wallet.
        </p>
        <Button variant="outline" size="sm" className="w-fit" asChild>
          <Link href="/agents">Browse marketplace</Link>
        </Button>
      </div>

      {!user ? (
        <p className="text-muted-foreground text-sm">
          Connect your wallet to view installed agents.
        </p>
      ) : loading ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading…
        </div>
      ) : error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : (
        <>
          {installed.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No agents installed yet.{" "}
              <Link href="/agents" className="text-primary underline">
                Browse the marketplace
              </Link>
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {installed.map(({ grant, agent }) =>
                agent ? (
                  <AgentCard
                    key={grant.agentId}
                    agent={agent}
                    installed
                    grant={grant}
                  />
                ) : null,
              )}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent executions</CardTitle>
              <CardDescription>
                Last agent runs (success and failures)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {executions.length === 0 ? (
                <p className="text-muted-foreground text-sm">No runs yet.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {executions.map((log) => (
                    <li
                      key={log.id}
                      className="border-border flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0"
                    >
                      <span>
                        {log.agentId} · {log.version} ·{" "}
                        {log.dryRun ? "dry-run" : "execute"}
                      </span>
                      <span
                        className={
                          log.status === "success"
                            ? "text-green-600"
                            : "text-destructive"
                        }
                      >
                        {log.status}
                      </span>
                      {log.composeHash && (
                        <a
                          href={`https://optimistic.etherscan.io/tx/${log.composeHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary text-xs underline"
                        >
                          {log.composeHash.slice(0, 10)}…
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
