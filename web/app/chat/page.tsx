import { OrchestratorChat } from "@/components/marketplace/orchestrator-chat";

export default function ChatPage() {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-4 pt-16">
      <div>
        <h1 className="text-2xl font-semibold">Talk to your agent</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          The Concierge is the real AI agent — it reasons about your request,
          calls specialist marketplace agents as tools, and only signs
          transactions after you confirm.
        </p>
      </div>
      <OrchestratorChat />
    </div>
  );
}
