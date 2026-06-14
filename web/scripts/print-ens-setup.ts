#!/usr/bin/env tsx
/**
 * Print ens-cli commands to publish ENSIP-25/26 records for all marketplace agents.
 *
 * Usage (from web/):
 *   ENS_AGENT_PARENT=yourname.eth npm run ens:print
 *
 * Then run the printed ens-cli commands with a wallet that owns the parent name.
 * Install ens-cli: npx "https://pkg.pr.new/gskril/ens-cli/@ensdomains/cli@main"
 */
import { listAgents } from "../lib/agents/registry";
import {
  buildAllAgentEnsBatches,
  type AgentEnsConfig,
} from "../lib/ens/agent-records";

const parentName = process.env.ENS_AGENT_PARENT?.trim();
const appBaseUrl =
  process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://agent-bazar-eight.vercel.app";

if (!parentName) {
  console.error("Set ENS_AGENT_PARENT (e.g. agentbazar.eth)");
  process.exit(1);
}

const config: AgentEnsConfig = {
  parentName,
  appBaseUrl,
  mcpBaseUrl: process.env.ENS_MCP_BASE_URL?.trim(),
  registryErc7930: process.env.ENS_REGISTRY_ERC7930?.trim(),
};

const batches = buildAllAgentEnsBatches(config, listAgents());

console.log("# 0. Create subnames (if not already created):");
for (const batch of batches) {
  console.log(
    `# ens subname create ${batch.ensName} --owner <YOUR_ADDRESS> --chain mainnet`,
  );
}
console.log("");

console.log("# Install ens-cli preview:");
console.log(
  '# alias ens=\'npx "https://pkg.pr.new/gskril/ens-cli/@ensdomains/cli@main"\'\n',
);

for (const batch of batches) {
  console.log(`# --- ${batch.agentId} → ${batch.ensName} ---`);
  console.log(
    `ens set batch ${batch.ensName} --data '${JSON.stringify(batch.records)}' --json`,
  );
  console.log("");
}

console.log("# Verify:");
for (const batch of batches) {
  console.log(`ens get text ${batch.ensName} --key agent-context`);
}
