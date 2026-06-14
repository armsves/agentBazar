import { stepCountIs, ToolLoopAgent } from "ai";

import { buildOrchestratorInstructions } from "@/lib/agents/orchestrator/catalog-context";
import { getOrchestratorModel } from "@/lib/agents/orchestrator/model";
import {
  createOrchestratorTools,
  type OrchestratorContext,
} from "@/lib/agents/orchestrator/tools";

export async function createMarketplaceOrchestrator(
  context: OrchestratorContext,
) {
  const instructions = await buildOrchestratorInstructions();

  return new ToolLoopAgent({
    id: "agent-bazar-concierge",
    model: getOrchestratorModel(),
    instructions,
    tools: createOrchestratorTools(context),
    stopWhen: stepCountIs(10),
  });
}
