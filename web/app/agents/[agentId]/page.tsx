"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";

import { AgentRobotAvatar, AgentRobotHero } from "@/components/marketplace/agent-robot-avatar";
import { AgentGrantForm } from "@/components/marketplace/agent-grant-form";
import { AgentChat } from "@/components/marketplace/agent-chat";
import { AgentReputationStars } from "@/components/marketplace/agent-reputation-stars";
import { ExecutionPanel } from "@/components/marketplace/execution-panel";
import { Button } from "@/components/ui/button";
import type { Agent, UserAgentGrant } from "@/lib/agents/types";
import type { AgentReputation } from "@/lib/agents/reputation/types";
import { getAgentListing } from "@/lib/agents/listings";
import { useDynamicContext } from "@/lib/dynamic";
import { authFetch } from "@/lib/dynamic/auth-fetch";

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params.agentId as string;
  const { primaryWallet, user } = useDynamicContext();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [grant, setGrant] = useState<UserAgentGrant | null>(null);
  const [reputation, setReputation] = useState<AgentReputation | null>(null);
  const [installed, setInstalled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAgent = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!user) {
      try {
        const response = await fetch("/api/agents/catalog");
        const data = await response.json();
        const found = data.agents?.find(
          (item: Agent) => item.id === agentId,
        );
        if (!found) {
          setError("Agent not found");
          setAgent(null);
        } else {
          setAgent(found);
          setInstalled(false);
          setGrant(null);
          setReputation(found.reputation ?? null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load agent");
        setAgent(null);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const response = await authFetch(`/api/agents/${agentId}`);
      const data = await response.json();
      if (!data.success) {
        setError(data.error ?? "Agent not found");
        setAgent(null);
        return;
      }
      setAgent(data.agent);
      setGrant(data.grant);
      setInstalled(data.installed);
      setReputation(data.reputation ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agent");
      setAgent(null);
    } finally {
      setLoading(false);
    }
  }, [agentId, user]);

  useEffect(() => {
    void loadAgent();
  }, [loadAgent]);

  if (loading) {
    return (
      <div className="flex w-full max-w-2xl flex-col gap-4 pt-16">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading agent…
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="flex w-full max-w-2xl flex-col gap-4 pt-16">
        <p className="text-destructive">{error ?? "Agent not found"}</p>
        <Button variant="outline" asChild>
          <Link href="/agents">
            <ArrowLeft className="mr-2 size-4" />
            Back to marketplace
          </Link>
        </Button>
      </div>
    );
  }

  const listing = getAgentListing(agent);

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6 pt-16">
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link href="/agents">
          <ArrowLeft className="mr-2 size-4" />
          Talent pool
        </Link>
      </Button>

      <AgentRobotHero agentId={agent.id} />

      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          {listing.tagline}
        </p>
        <div className="flex items-center gap-3">
          <AgentRobotAvatar agentId={agent.id} size="lg" />
          <div>
            <h1 className="text-2xl font-semibold">{agent.name}</h1>
            <AgentReputationStars reputation={reputation} size="md" />
          </div>
        </div>
        <p className="text-sm italic">&ldquo;{listing.pitch}&rdquo;</p>
        <p className="text-muted-foreground text-sm">{agent.longDescription}</p>
        <div className="flex flex-wrap gap-1">
          {agent.tags.map((tag) => (
            <span
              key={tag}
              className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <AgentGrantForm
        agent={agent}
        address={primaryWallet?.address}
        installed={installed}
        onInstalled={() => void loadAgent()}
        onRevoked={() => {
          setInstalled(false);
          setGrant(null);
        }}
      />

      <AgentChat
        agentId={agent.id}
        agentName={agent.name}
        listing={listing}
      />

      {agent.kind === "specialist" && (
        <details className="text-sm">
          <summary className="text-muted-foreground cursor-pointer">
            Manual controls (advanced)
          </summary>
          <div className="mt-3">
            <ExecutionPanel agent={agent} installed={installed} />
          </div>
        </details>
      )}

      {grant && (
        <p className="text-muted-foreground text-xs">
          Daily spent: {Number(grant.dailySpentUsdc) / 1e6} USDC (resets UTC
          midnight)
        </p>
      )}
    </div>
  );
}
