"use client";

import { useEffect, useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Loader2, PenLine, Send } from "lucide-react";

import { AgentRobotAvatar } from "@/components/marketplace/agent-robot-avatar";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AgentListing } from "@/lib/agents/listings";
import { AgentChatRating } from "@/components/marketplace/agent-chat-rating";
import { getAuthToken } from "@dynamic-labs/sdk-react-core";
import { useDynamicContext } from "@/lib/dynamic";

type ToolPart = {
  type: string;
  toolName?: string;
  state?: string;
  output?: unknown;
  input?: unknown;
  [key: string]: unknown;
};

function extractToolOutput(part: ToolPart): Record<string, unknown> | null {
  if (part.output && typeof part.output === "object") {
    return part.output as Record<string, unknown>;
  }
  if (typeof part.output === "string") {
    try {
      return JSON.parse(part.output) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

function toolNameFromPart(part: ToolPart): string | null {
  if (part.toolName && typeof part.toolName === "string") return part.toolName;
  if (part.type.startsWith("tool-")) return part.type.slice(5);
  return null;
}

function MessageParts({ parts }: { parts: ToolPart[] }) {
  return (
    <>
      {parts.map((part, i) => {
        if (part.type === "text" && typeof part.text === "string") {
          return (
            <p key={i} className="whitespace-pre-wrap">
              {part.text}
            </p>
          );
        }

        const toolName = toolNameFromPart(part);
        const output = extractToolOutput(part);

        if (toolName && output) {
          if (output.success === true && output.composeHash) {
            return (
              <div
                key={i}
                className="mt-2 rounded-md border border-green-600/30 bg-green-500/10 p-3 text-sm"
              >
                <p className="font-medium text-green-700 dark:text-green-400">
                  Broadcasted on-chain
                </p>
                {typeof output.explorerUrl === "string" && (
                  <a
                    href={output.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary mt-1 block text-xs underline"
                  >
                    View on Optimistic Etherscan →
                  </a>
                )}
              </div>
            );
          }

          if (
            output.success === true &&
            (toolName === "suggest_portfolio_balance" ||
              toolName === "fetch_earn_vaults")
          ) {
            const allocations = Array.isArray(output.allocations)
              ? (output.allocations as Array<Record<string, unknown>>)
              : null;

            if (allocations?.length) {
              return (
                <div
                  key={i}
                  className="mt-2 rounded-md border border-blue-500/40 bg-blue-500/10 p-3 text-xs"
                >
                  <p className="font-medium">Portfolio suggestion</p>
                  <ul className="text-muted-foreground mt-2 space-y-1">
                    {allocations.map((row, j) => (
                      <li key={j}>
                        {String(row.percent)}% · {String(row.vaultName)} (
                        {String(row.protocol)}) — ~{String(row.apyTotal)}% APY
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }

            if (Array.isArray(output.vaults)) {
              return (
                <div
                  key={i}
                  className="mt-2 rounded-md border border-blue-500/40 bg-blue-500/10 p-3 text-xs"
                >
                  <p className="font-medium">
                    Top {String(output.count ?? output.vaults.length)} earn vaults
                  </p>
                </div>
              );
            }
          }

          if (
            output.success === true &&
            (toolName === "simulate_deposit" || toolName === "simulate_withdraw")
          ) {
            return (
              <div
                key={i}
                className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs"
              >
                <p className="font-medium">Simulation passed</p>
                <p className="text-muted-foreground mt-1">
                  Review above, then hit <strong>Sign &amp; broadcast</strong> to
                  sign via your delegated wallet.
                </p>
              </div>
            );
          }

          return (
            <pre
              key={i}
              className="bg-muted mt-2 max-h-36 overflow-auto rounded-md p-2 text-xs"
            >
              {JSON.stringify(output, null, 2)}
            </pre>
          );
        }

        if (toolName) {
          return (
            <p key={i} className="text-muted-foreground mt-1 text-xs">
              Running {toolName}…
            </p>
          );
        }

        return null;
      })}
    </>
  );
}

function detectPendingBroadcast(messages: UIMessage[]): boolean {
  let lastSimulateIndex = -1;
  let lastExecuteIndex = -1;

  messages.forEach((message, messageIndex) => {
    if (message.role !== "assistant") return;
    const parts = message.parts as ToolPart[];
    for (const part of parts) {
      const name = toolNameFromPart(part);
      const output = extractToolOutput(part);
      if (!name || !output || output.success !== true) continue;
      if (name === "simulate_deposit" || name === "simulate_withdraw") {
        lastSimulateIndex = messageIndex;
      }
      if (name === "execute_deposit" || name === "execute_withdraw") {
        lastExecuteIndex = messageIndex;
      }
    }
  });

  return lastSimulateIndex >= 0 && lastSimulateIndex > lastExecuteIndex;
}

export type AgentChatProps = {
  agentId?: string;
  agentName?: string;
  listing?: AgentListing;
  className?: string;
  showHeader?: boolean;
};

export function AgentChat({
  agentId,
  agentName,
  listing,
  className,
  showHeader = true,
}: AgentChatProps) {
  const { primaryWallet, user } = useDynamicContext();
  const [input, setInput] = useState("");
  const [inputFocused, setInputFocused] = useState(false);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: () => {
          const token = getAuthToken();
          const headers: Record<string, string> = {};
          if (token) headers.Authorization = `Bearer ${token}`;
          return headers;
        },
        body: {
          walletAddress: primaryWallet?.address,
          chain: "EVM",
          ...(agentId ? { agentId } : {}),
        },
      }),
    [primaryWallet?.address, agentId],
  );

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport,
  });

  const isBusy = status === "streaming" || status === "submitted";
  const pendingBroadcast = detectPendingBroadcast(messages);
  const resolvedAgentId = agentId ?? "agent-bazar-concierge";
  const hasConversation = messages.length > 0;
  const isExpanded = inputFocused || hasConversation || isBusy;
  const lastMessage = messages[messages.length - 1];
  const chatDone =
    Boolean(user) &&
    messages.some((message) => message.role === "user") &&
    messages.some((message) => message.role === "assistant") &&
    lastMessage?.role === "assistant" &&
    !isBusy &&
    !inputFocused &&
    !pendingBroadcast;
  const showRating = chatDone;

  const displayName = agentName ?? (agentId ? agentId : "Agent Bazar Concierge");
  const tagline =
    listing?.tagline ??
    "LLM orchestrator — hires specialists, simulates, you sign once.";

  useEffect(() => {
    setMessages([]);
  }, [agentId, setMessages]);

  const sendUserMessage = (text: string) => {
    if (!text.trim() || isBusy) return;
    void sendMessage({ text });
    setInput("");
  };

  const content = (
    <>
      {!user ? (
        <p className="text-muted-foreground text-sm">
          Connect your Dynamic wallet to hire this agent and sign transactions.
        </p>
      ) : (
        <>
          {(isExpanded || hasConversation) && (
            <div
              className={`min-h-0 space-y-3 overflow-y-auto pr-1 ${
                isExpanded ? "flex-1" : "max-h-32"
              }`}
            >
              {messages.length === 0 && listing && (
                <div className="bg-muted/60 mr-4 rounded-lg px-3 py-2 text-sm">
                  <p className="font-medium">{listing.opener}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Try a starter below, or tell me what you want in plain English.
                  </p>
                </div>
              )}
              {messages.length === 0 && !listing && isExpanded && (
                <p className="text-muted-foreground text-xs">
                  Ask who to hire, simulate LP deposits, or balance your earn
                  portfolio…
                </p>
              )}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    message.role === "user"
                      ? "bg-primary/10 ml-8"
                      : "bg-muted mr-8"
                  }`}
                >
                  <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                    {message.role === "user" ? "You" : displayName}
                  </p>
                  <MessageParts parts={message.parts as ToolPart[]} />
                </div>
              ))}
              {isBusy && (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Loader2 className="size-4 animate-spin" />
                  On it…
                </div>
              )}
            </div>
          )}

          {!isExpanded && !hasConversation && listing && (
            <p className="text-muted-foreground shrink-0 text-xs italic">
              {listing.opener}
            </p>
          )}

          {pendingBroadcast && !isBusy && (
            <div className="border-primary/30 bg-primary/5 flex shrink-0 flex-col gap-2 rounded-lg border p-3">
              <p className="text-sm font-medium">Ready to sign &amp; broadcast?</p>
              <p className="text-muted-foreground text-xs">
                Your delegated embedded wallet will sign the Composer transaction.
              </p>
              <Button
                size="sm"
                className="w-fit"
                onClick={() =>
                  sendUserMessage(
                    "Yes — sign and broadcast the transaction on-chain.",
                  )
                }
              >
                <PenLine className="mr-2 size-4" />
                Sign &amp; broadcast
              </Button>
            </div>
          )}

          {error && (
            <p className="text-destructive text-sm">{error.message}</p>
          )}

          {listing && messages.length === 0 && (
            <div className="flex shrink-0 flex-wrap gap-2">
              {listing.starterPrompts.map((prompt) => (
                <Button
                  key={prompt}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto whitespace-normal text-left text-xs"
                  disabled={isBusy}
                  onClick={() => sendUserMessage(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          )}

          <form
            className="flex shrink-0 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              sendUserMessage(input);
            }}
          >
            <input
              className="border-input bg-background min-w-0 flex-1 rounded-md border px-3 py-2 text-sm transition-shadow focus:ring-2 focus:ring-primary/20"
              value={input}
              placeholder={`Instructions for ${displayName}…`}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              disabled={isBusy}
            />
            <Button type="submit" size="icon" disabled={isBusy || !input.trim()}>
              <Send className="size-4" />
            </Button>
          </form>

          {showRating && (
            <AgentChatRating
              agentId={resolvedAgentId}
              agentName={displayName}
            />
          )}
        </>
      )}
    </>
  );

  if (!showHeader) {
    return (
      <div className={`flex min-h-0 flex-1 flex-col gap-3 ${className ?? ""}`}>
        {content}
      </div>
    );
  }

  return (
    <Card
      className={`flex flex-col transition-[height] duration-200 ease-out ${
        isExpanded
          ? "h-[min(70vh,640px)]"
          : "h-auto max-h-none"
      } ${className ?? ""}`}
    >
      <CardHeader className={`shrink-0 ${isExpanded ? "" : "pb-3"}`}>
        <CardTitle className="flex items-center gap-3">
          <AgentRobotAvatar
            agentId={resolvedAgentId}
            size="md"
            showFrame={false}
          />
          <div className="min-w-0">
            <span className="block truncate">{displayName}</span>
            <CardDescription className="mt-0.5">{tagline}</CardDescription>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent
        className={`flex min-h-0 flex-col gap-3 ${isExpanded ? "flex-1" : ""}`}
      >
        {content}
      </CardContent>
    </Card>
  );
}

/** Concierge chat — no focused agent */
export function OrchestratorChat() {
  return <AgentChat />;
}
