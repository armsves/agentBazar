import { openai } from "@ai-sdk/openai";

const DEFAULT_MODEL = "gpt-4o-mini";

export function getOrchestratorModel() {
  if (process.env.OPENAI_API_KEY?.trim()) {
    return openai(process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL);
  }

  // Vercel AI Gateway / AI SDK global provider (AI_GATEWAY_API_KEY)
  const gatewayModel = process.env.AI_GATEWAY_MODEL?.trim() || `openai/${DEFAULT_MODEL}`;
  return gatewayModel;
}

export function hasLlmConfigured(): boolean {
  return Boolean(
    process.env.OPENAI_API_KEY?.trim() || process.env.AI_GATEWAY_API_KEY?.trim(),
  );
}
