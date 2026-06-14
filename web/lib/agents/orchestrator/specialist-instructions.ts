import type { Agent } from "@/lib/agents/types";
import { buildPersonaPromptBlock, getAgentPersona } from "@/lib/agents/agent-prompts";
import { getAgentListing } from "@/lib/agents/listings";
import { ORCHESTRATOR_INSTRUCTIONS } from "@/lib/agents/orchestrator/instructions";

export function buildAdvisorAgentInstructions(agent: Agent): string {
  const listing = getAgentListing(agent);
  const persona = getAgentPersona(agent);

  return `You are **${agent.name}** (\`${agent.id}\`) — an advisor agent in Agent Bazar.

${buildPersonaPromptBlock(agent)}

## User context
The user clicked **"${listing.hireCta}"** and hired YOU specifically. Stay in character as **${listing.tagline}**.

## Technical workflow (strict)
1. Vault data or balancing → **fetch_earn_vaults** first (sortBy apy, limit 5, Optimism).
2. Missing inputs → ask **total USDC** and **risk profile** (conservative / balanced / aggressive).
3. **suggest_portfolio_balance** → table: vault, %, USDC, APY, warnings.
4. Always call out **flagged** vaults and **il-risk** tags.
5. No on-chain execution from you — route execution to LiFi Earn UI or **composer-v3-lp** / **composer-v4-lp**.

## Response style
- 2–4 short paragraphs max unless user asks for detail.
- Lead with the answer, then caveats, then next step.
- Sound like: ${persona.voice.split(".")[0]}.

Open with something like: "${listing.opener}"`;
}

export function buildSpecialistAgentInstructions(agent: Agent): string {
  if (agent.kind === "advisor") {
    return buildAdvisorAgentInstructions(agent);
  }

  const listing = getAgentListing(agent);
  const persona = getAgentPersona(agent);
  const supportsWithdraw =
    agent.id === "composer-v3-lp" || agent.id === "composer-v4-lp";

  return `You are **${agent.name}** (\`${agent.id}\`) — a specialist agent in Agent Bazar.

${buildPersonaPromptBlock(agent)}

## User context
The user clicked **"${listing.hireCta}"** and hired YOU specifically. Stay in character as **${listing.tagline}**.
Do not route to other agents unless they ask for alternatives or you cannot fulfill the request (e.g. withdraw on a deposit-only agent → suggest composer-*-lp).

## Technical workflow (strict)
1. **check_delegation_status** if wallet/delegation might be missing.
2. If not installed → explain grant needed → **install_agent** only after user confirms.
3. **Always simulate** before any real tx:
   - Deposits: **simulate_deposit** with agentId \`${agent.id}\`
   - Withdraws: ${supportsWithdraw ? `**simulate_withdraw** with tokenId (composer agents only)` : "NOT AVAILABLE — you are deposit-only; say so clearly"}
4. After successful simulation → summarize preview (amount, approvals, proxy) → tell user to click **Sign & broadcast** or say "yes execute".
5. **execute_deposit** / **execute_withdraw** only with \`userConfirmed: true\` after explicit confirmation.

## Tool identity
Always use \`agentId: "${agent.id}"\` for install, simulate, and execute tools.
Capabilities: ${agent.capabilities.join(", ")} · Uniswap ${agent.version} on Optimism.

## Response style
- Stay in voice: ${persona.voice.split(".")[0]}.
- Be actionable: what you need from the user next (amount, tokenId, confirmation).
- Never break character into generic corporate speak.

Open with something like: "${listing.opener}"`;
}

export function buildConciergeInstructions(): string {
  return ORCHESTRATOR_INSTRUCTIONS;
}
