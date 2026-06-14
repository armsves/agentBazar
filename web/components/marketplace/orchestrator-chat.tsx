"use client";

import { useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Bot, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAuthToken } from "@dynamic-labs/sdk-react-core";
import { useDynamicContext } from "@/lib/dynamic";

function MessageParts({
  parts,
}: {
  parts: Array<{ type: string; text?: string; [key: string]: unknown }>;
}) {
  return (
    <>
      {parts.map((part, i) => {
        if (part.type === "text" && part.text) {
          return (
            <p key={i} className="whitespace-pre-wrap">
              {part.text}
            </p>
          );
        }

        if (part.type.startsWith("tool-")) {
          return (
            <pre
              key={i}
              className="bg-muted mt-2 max-h-48 overflow-auto rounded-md p-2 text-xs"
            >
              {JSON.stringify(part, null, 2)}
            </pre>
          );
        }

        return null;
      })}
    </>
  );
}

export function OrchestratorChat() {
  const { primaryWallet, user } = useDynamicContext();
  const [input, setInput] = useState("");

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
        },
      }),
    [primaryWallet?.address],
  );

  const { messages, sendMessage, status, error } = useChat({ transport });

  const isBusy = status === "streaming" || status === "submitted";

  return (
    <Card className="flex h-[min(70vh,640px)] flex-col">
      <CardHeader className="shrink-0">
        <CardTitle className="flex items-center gap-2">
          <Bot className="size-5" />
          Agent Bazar Concierge
        </CardTitle>
        <CardDescription>
          LLM orchestrator (GPT-4o-mini). Ask in plain language — it picks
          specialist agents, simulates, and executes with your guardrails.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
        {!user ? (
          <p className="text-muted-foreground text-sm">
            Connect your Dynamic wallet to talk to the concierge.
          </p>
        ) : (
          <>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {messages.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  Try: &quot;What agents can deposit USDC into Uniswap?&quot; or
                  &quot;Simulate a 2 USDC v3 LP deposit&quot;
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
                    {message.role === "user" ? "You" : "Concierge"}
                  </p>
                  <MessageParts parts={message.parts} />
                </div>
              ))}
              {isBusy && (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Loader2 className="size-4 animate-spin" />
                  Thinking…
                </div>
              )}
            </div>

            {error && (
              <p className="text-destructive text-sm">{error.message}</p>
            )}

            <form
              className="flex shrink-0 gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!input.trim() || isBusy) return;
                void sendMessage({ text: input });
                setInput("");
              }}
            >
              <input
                className="border-input bg-background min-w-0 flex-1 rounded-md border px-3 py-2 text-sm"
                value={input}
                placeholder="Ask the concierge…"
                onChange={(e) => setInput(e.target.value)}
                disabled={isBusy}
              />
              <Button type="submit" size="icon" disabled={isBusy || !input.trim()}>
                <Send className="size-4" />
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
