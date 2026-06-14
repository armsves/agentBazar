import { AgentChat } from "@/components/marketplace/agent-chat";

export default function ChatPage() {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-4 pt-16">
      <div>
        <h1 className="text-2xl font-semibold">Hire the Concierge</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Your overqualified receptionist. Picks specialists, runs simulations,
          you hit Sign &amp; broadcast when you&apos;re ready.
        </p>
      </div>
      <AgentChat />
    </div>
  );
}
