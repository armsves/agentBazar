"use client";

import Link from "next/link";
import { Bot, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Agent, UserAgentGrant } from "@/lib/agents/types";

interface AgentCardProps {
  agent: Agent;
  installed?: boolean;
  grant?: UserAgentGrant | null;
}

export function AgentCard({ agent, installed, grant }: AgentCardProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot className="size-5" />
          {agent.name}
          {installed && (
            <CheckCircle2 className="size-4 text-green-600" aria-label="Installed" />
          )}
        </CardTitle>
        <CardDescription>{agent.description}</CardDescription>
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
            Cap: {Number(grant.maxUsdcPerTx) / 1e6} USDC/tx ·{" "}
            {Number(grant.maxUsdcDaily) / 1e6} USDC/day
          </p>
        )}
        <Button asChild variant={installed ? "outline" : "default"}>
          <Link href={`/agents/${agent.id}`}>
            {installed ? "Manage agent" : "View & install"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
