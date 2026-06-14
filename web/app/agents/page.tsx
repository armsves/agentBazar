"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Store } from "lucide-react";
import Link from "next/link";

import { AgentCard } from "@/components/marketplace/agent-card";
import { Button } from "@/components/ui/button";
import type { Agent, UserAgentGrant } from "@/lib/agents/types";
import { listAgents } from "@/lib/agents/registry";
import { useDynamicContext } from "@/lib/dynamic";
import { authFetch } from "@/lib/dynamic/auth-fetch";

type CatalogAgent = Agent & {
  installed: boolean;
  grant: UserAgentGrant | null;
};

export default function AgentsMarketplacePage() {
  const { user } = useDynamicContext();
  const [agents, setAgents] = useState<CatalogAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    if (!user) {
      setAgents(
        listAgents().map((agent) => ({
          ...agent,
          installed: false,
          grant: null,
        })),
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authFetch("/api/agents");
      const data = await response.json();
      if (!data.success) {
        setError(data.error ?? "Failed to load agents");
        return;
      }
      setAgents(data.agents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  return (
    <div className="flex w-full max-w-4xl flex-col gap-8 pt-16">
      <div className="flex flex-col gap-2">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Store className="size-6" />
          Agent Marketplace
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          Install DeFi agents that act on your Dynamic embedded wallet via
          delegated MPC signing. Each agent enforces spend caps, version locks,
          and an on-chain contract allowlist before any transaction is signed.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">My installed agents</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/">Delegation setup</Link>
          </Button>
        </div>
      </div>

      {!user ? (
        <p className="text-muted-foreground text-sm">
          Connect your wallet to see install status and manage grants.
        </p>
      ) : loading ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading agents…
        </div>
      ) : error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              installed={agent.installed}
              grant={agent.grant}
            />
          ))}
        </div>
      )}
    </div>
  );
}
