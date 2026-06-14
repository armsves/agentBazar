"use client";

import { useEffect } from "react";
import { Briefcase, X } from "lucide-react";

import { AgentRobotAvatar } from "@/components/marketplace/agent-robot-avatar";
import { AgentChat } from "@/components/marketplace/agent-chat";
import { Button } from "@/components/ui/button";
import type { Agent } from "@/lib/agents/types";
import { getAgentListing } from "@/lib/agents/listings";

type AgentHireDialogProps = {
  agent: Agent | null;
  open: boolean;
  onClose: () => void;
};

export function AgentHireDialog({ agent, open, onClose }: AgentHireDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !agent) return null;

  const listing = getAgentListing(agent);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hire-dialog-title"
      onClick={onClose}
    >
      <div
        className="bg-background flex h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <AgentRobotAvatar agentId={agent.id} size="lg" />
            <div className="min-w-0 flex-1">
              <p
                id="hire-dialog-title"
                className="flex items-center gap-2 text-lg font-semibold"
              >
                <Briefcase className="size-5 text-amber-500" />
                {listing.hireCta}
              </p>
              <p className="text-muted-foreground text-sm">{agent.name}</p>
              <p className="mt-2 text-sm italic">&ldquo;{listing.pitch}&rdquo;</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X className="size-4" />
            </Button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col p-4">
          <AgentChat
            key={agent.id}
            agentId={agent.id}
            agentName={agent.name}
            listing={listing}
            showHeader={false}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}
