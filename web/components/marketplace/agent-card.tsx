"use client";

import Link from "next/link";
import { Briefcase, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { AgentRobotAvatar } from "@/components/marketplace/agent-robot-avatar";
import { ForHireStamp } from "@/components/marketplace/for-hire-stamp";
import { AgentReputationStars } from "@/components/marketplace/agent-reputation-stars";
import type { Agent, UserAgentGrant } from "@/lib/agents/types";
import type { AgentReputation } from "@/lib/agents/reputation/types";
import { getAgentListing } from "@/lib/agents/listings";

interface AgentCardProps {
  agent: Agent;
  ensName?: string | null;
  installed?: boolean;
  onHire?: (agent: Agent) => void;
  grant?: UserAgentGrant | null;
  reputation?: AgentReputation | null;
}

const MAX_TAGS = 3;

export function AgentCard({
  agent,
  ensName,
  installed,
  onHire,
  grant,
  reputation,
}: AgentCardProps) {
  const listing = getAgentListing(agent);
  const visibleTags = agent.tags.slice(0, MAX_TAGS);
  const hiddenTagCount = agent.tags.length - visibleTags.length;

  return (
    <Card className="relative flex flex-col overflow-hidden border-dashed transition-shadow hover:shadow-md">
      <ForHireStamp
        size="sm"
        className="absolute -right-1 top-2 z-10 -rotate-12 opacity-95"
      />
      <CardContent className="flex flex-col gap-3 p-3 sm:p-4">
        <div className="flex gap-3">
          <AgentRobotAvatar agentId={agent.id} size="md" className="shrink-0" />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-sm font-semibold leading-tight">
                {agent.name}
              </p>
              {installed && (
                <CheckCircle2
                  className="size-3.5 shrink-0 text-green-600"
                  aria-label="On payroll"
                />
              )}
            </div>
            <p className="text-muted-foreground line-clamp-1 text-[11px] font-medium uppercase tracking-wide">
              {listing.tagline}
            </p>
            <AgentReputationStars reputation={reputation} />
          </div>
        </div>

        <p className="text-muted-foreground line-clamp-2 text-xs italic leading-snug">
          &ldquo;{listing.pitch}&rdquo;
        </p>

        {ensName && (
          <p className="text-muted-foreground truncate font-mono text-[10px]">
            {ensName}
          </p>
        )}

        <div className="flex flex-wrap gap-1">
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px]"
            >
              {tag}
            </span>
          ))}
          {hiddenTagCount > 0 && (
            <span className="text-muted-foreground px-1 text-[10px]">
              +{hiddenTagCount}
            </span>
          )}
        </div>

        {grant && (
          <p className="text-muted-foreground text-[10px]">
            Cap {Number(grant.maxUsdcPerTx) / 1e6}/{Number(grant.maxUsdcDaily) / 1e6} USDC
          </p>
        )}

        <div className="flex gap-2">
          {onHire ? (
            <Button size="sm" className="h-8 flex-1 text-xs" onClick={() => onHire(agent)}>
              <Briefcase className="mr-1.5 size-3.5" />
              {listing.hireCta}
            </Button>
          ) : (
            <Button size="sm" className="h-8 flex-1 text-xs" asChild>
              <Link href={`/agents/${agent.id}`}>
                <Briefcase className="mr-1.5 size-3.5" />
                {listing.hireCta}
              </Link>
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-8 flex-1 text-xs" asChild>
            <Link href={`/agents/${agent.id}`}>
              {installed ? "Manage" : "Details"}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
