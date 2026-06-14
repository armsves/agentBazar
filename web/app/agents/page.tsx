"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Store } from "lucide-react";
import Link from "next/link";

import { AgentCard } from "@/components/marketplace/agent-card";
import { AgentHireDialog } from "@/components/marketplace/agent-hire-dialog";
import { OrchestratorChat } from "@/components/marketplace/orchestrator-chat";
import { Button } from "@/components/ui/button";
import type { Agent, UserAgentGrant } from "@/lib/agents/types";
import type { AgentReputation } from "@/lib/agents/reputation/types";
import { useDynamicContext } from "@/lib/dynamic";
import { authFetch } from "@/lib/dynamic/auth-fetch";

type CatalogAgent = Agent & {
  ensName?: string | null;
  installed: boolean;
  grant: UserAgentGrant | null;
  reputation?: AgentReputation | null;
};

export default function AgentsMarketplacePage() {
  const { user } = useDynamicContext();
  const [agents, setAgents] = useState<CatalogAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hireAgent, setHireAgent] = useState<Agent | null>(null);

  const loadCatalog = useCallback(async () => {
    if (!user) {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/agents/catalog");
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
          Agent Talent Pool
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          DeFi mercenaries for hire. Click <strong>Hire me</strong> to open a
          chat, give instructions in plain English, simulate the job, then sign
          &amp; broadcast via your delegated wallet.
        </p>
        <div className="flex gap-2">
          <Button variant="default" size="sm" asChild>
            <Link href="/chat">Talk to Concierge</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">My installed agents</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/">Delegation setup</Link>
          </Button>
        </div>
      </div>

      <OrchestratorChat />

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
              ensName={agent.ensName}
              installed={agent.installed}
              grant={agent.grant}
              reputation={agent.reputation}
              onHire={setHireAgent}
            />
          ))}
        </div>
      )}

      <AgentHireDialog
        agent={hireAgent}
        open={hireAgent !== null}
        onClose={() => setHireAgent(null)}
      />
    </div>
  );
}
