import { stepCountIs, ToolLoopAgent } from "ai";

import {
  buildSpecialistAgentInstructions,
} from "@/lib/agents/orchestrator/specialist-instructions";
import { buildOrchestratorInstructions } from "@/lib/agents/orchestrator/catalog-context";
import { getOrchestratorModel } from "@/lib/agents/orchestrator/model";
import {
  createOrchestratorTools,
  type OrchestratorContext,
} from "@/lib/agents/orchestrator/tools";
import type { Agent } from "@/lib/agents/types";

export async function createMarketplaceOrchestrator(
  context: OrchestratorContext,
  focusAgent?: Agent,
) {
  const instructions = focusAgent
    ? buildSpecialistAgentInstructions(focusAgent)
    : await buildOrchestratorInstructions();

  return new ToolLoopAgent({
    id: focusAgent?.id ?? "agent-bazar-concierge",
    model: getOrchestratorModel(),
    instructions,
    tools: createOrchestratorTools(context, focusAgent),
    stopWhen: stepCountIs(10),
  });
}

/** @deprecated use createMarketplaceOrchestrator */
export async function createAgentChatOrchestrator(
  context: OrchestratorContext,
  focusAgent?: Agent,
) {
  return createMarketplaceOrchestrator(context, focusAgent);
}
