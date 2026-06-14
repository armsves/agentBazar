"use client";

import Link from "next/link";
import { Briefcase, CheckCircle2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AgentRobotAvatar, AgentRobotHero } from "@/components/marketplace/agent-robot-avatar";
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

export function AgentCard({
  agent,
  ensName,
  installed,
  onHire,
  grant,
  reputation,
}: AgentCardProps) {
  const listing = getAgentListing(agent);

  return (
    <Card className="flex h-full flex-col overflow-hidden border-dashed transition-shadow hover:shadow-md">
      <AgentRobotHero agentId={agent.id} className="rounded-b-none border-0 border-b" />
      <CardHeader className="pt-4">
        <p className="text-muted-foreground mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide">
          <Sparkles className="size-3 text-amber-500" />
          {listing.tagline}
        </p>
        <CardTitle className="flex items-center gap-2 text-lg">
          <AgentRobotAvatar agentId={agent.id} size="sm" showFrame={false} />
          {agent.name}
          {installed && (
            <CheckCircle2
              className="size-4 text-green-600"
              aria-label="On payroll"
            />
          )}
        </CardTitle>
        <CardDescription className="text-sm italic">
          &ldquo;{listing.pitch}&rdquo;
        </CardDescription>
        {ensName && (
          <p className="text-muted-foreground font-mono text-xs">{ensName}</p>
        )}
        <AgentReputationStars reputation={reputation} />
      </CardHeader>
      <CardContent className="mt-auto flex flex-col gap-3">
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
        {grant && (
          <p className="text-muted-foreground text-xs">
            Payroll cap: {Number(grant.maxUsdcPerTx) / 1e6} USDC/gig ·{" "}
            {Number(grant.maxUsdcDaily) / 1e6} USDC/day
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="flex-1"
            onClick={() => onHire?.(agent)}
          >
            <Briefcase className="mr-2 size-4" />
            {listing.hireCta}
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/agents/${agent.id}`}>
              {installed ? "Manage contract" : "Job description"}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
