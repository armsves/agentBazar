import { getAddress } from "viem";

import type { Agent } from "@/lib/agents/types";
import { AGENT_REGISTRY } from "@/lib/agents/registry";
import {
  expectedAgentEnsName,
  isEnsProvisioningEnabled,
  provisionAgentEnsSubdomain,
} from "@/lib/ens/provision-subdomain";
import {
  type AgentRegistrationRecord,
  upsertAgentRegistration,
} from "./dynamic-storage";
import {
  verifyEnsAgentRegistration,
  verifyRegistrationSignature,
  verifyRegistrySecret,
} from "./verify-registration";

export type RegisterAgentManifest = Agent & {
  ensName?: string;
  endpoints?: { web?: string | null; mcp?: string | null };
};

export type RegisterAgentInput = {
  manifest: RegisterAgentManifest;
  timestamp?: number;
  signature?: string;
  signer?: string;
  authHeader: string | null;
};

export type RegisterAgentResult =
  | {
      ok: true;
      record: AgentRegistrationRecord;
      ensProvisioned: boolean;
    }
  | {
      ok: false;
      status: number;
      error: string;
      ensName?: string;
      details?: unknown;
    };

function stripManifestFields(manifest: RegisterAgentManifest): Agent {
  const { ensName: _e, endpoints: _ep, ...agentFields } = manifest;
  return agentFields;
}

export function isMarketplaceListed(
  source: "builtin" | "registered",
  record?: AgentRegistrationRecord,
): boolean {
  if (source === "builtin") return true;
  return record?.verification === "ens" && Boolean(record.ensName?.trim());
}

async function resolveEnsForAgent(
  agent: Agent,
  preferredEnsName?: string,
): Promise<{
  ensName: string;
  verified: boolean;
  endpoints?: { web?: string | null; mcp?: string | null };
  provisioned: boolean;
} | null> {
  const candidates = [
    preferredEnsName?.trim(),
    expectedAgentEnsName(agent) ?? undefined,
  ].filter(Boolean) as string[];

  for (const ensName of candidates) {
    const check = await verifyEnsAgentRegistration({
      ensName,
      agentId: agent.id,
    });
    if (check.verified) {
      return {
        ensName,
        verified: true,
        endpoints: check.endpoints,
        provisioned: false,
      };
    }
  }

  if (!isEnsProvisioningEnabled()) return null;

  const { ensName } = await provisionAgentEnsSubdomain(agent);
  const check = await verifyEnsAgentRegistration({
    ensName,
    agentId: agent.id,
  });

  if (!check.verified) return null;

  return {
    ensName,
    verified: true,
    endpoints: check.endpoints,
    provisioned: true,
  };
}

/** Register or update an agent; external agents must end with verified ENS. */
export async function registerAgentWithEns(
  input: RegisterAgentInput,
): Promise<RegisterAgentResult> {
  const { manifest, timestamp, signature, signer, authHeader } = input;
  const ensNameInput = input.manifest.ensName;
  const builtin = AGENT_REGISTRY.find((a) => a.id === manifest.id);
  const agent = stripManifestFields(manifest);

  let identityProof: "signature" | "secret" | "ens" | null = null;
  let verifiedSigner: string | undefined;

  if (verifyRegistrySecret(authHeader)) {
    identityProof = "secret";
  } else if (signature && signer && timestamp) {
    const valid = await verifyRegistrationSignature({
      agentId: manifest.id,
      ensName: ensNameInput,
      timestamp,
      signer,
      signature: signature as `0x${string}`,
    });
    if (valid) {
      identityProof = "signature";
      verifiedSigner = getAddress(signer);
    }
  } else if (ensNameInput) {
    const ensCheck = await verifyEnsAgentRegistration({
      ensName: ensNameInput,
      agentId: manifest.id,
    });
    if (ensCheck.verified) identityProof = "ens";
  }

  if (!identityProof) {
    return {
      ok: false,
      status: 401,
      error:
        "Registration not authorized. Sign with your wallet, use Bearer AGENT_REGISTRY_SECRET, or provide verifiable ENS records.",
    };
  }

  if (builtin && identityProof === "signature") {
    return {
      ok: false,
      status: 403,
      error:
        "Built-in agents can only be updated via ENS verification or registry secret.",
    };
  }

  const ensResolution = await resolveEnsForAgent(agent, ensNameInput);
  const expectedEns = expectedAgentEnsName(agent);

  if (!builtin) {
    if (!ensResolution?.verified) {
      return {
        ok: false,
        status: 400,
        error: isEnsProvisioningEnabled()
          ? "ENS subdomain registration failed. Try again or set ENS records manually."
          : `ENS is required. Claim a subdomain under ${process.env.ENS_AGENT_PARENT ?? "your parent name"} (e.g. ${expectedEns ?? `${agent.id}.<parent>`}) and re-register.`,
        ensName: expectedEns ?? undefined,
      };
    }
  }

  const now = new Date().toISOString();
  const verification: AgentRegistrationRecord["verification"] =
    ensResolution?.verified ? "ens" : identityProof === "secret" ? "secret" : "ens";

  const record = await upsertAgentRegistration({
    agent,
    ensName: ensResolution?.ensName ?? ensNameInput ?? expectedEns ?? undefined,
    endpoints:
      ensResolution?.endpoints ??
      manifest.endpoints ??
      undefined,
    registeredAt: now,
    updatedAt: now,
    signer: verifiedSigner,
    verification,
  });

  return {
    ok: true,
    record,
    ensProvisioned: ensResolution?.provisioned ?? false,
  };
}
