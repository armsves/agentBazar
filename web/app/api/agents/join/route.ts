import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAddress } from "viem";

import { discoverAgentsFromEns } from "@/lib/agents/registry/discover-ens";
import {
  type AgentRegistrationRecord,
  upsertAgentRegistration,
} from "@/lib/agents/registry/dynamic-storage";
import { saveAgentIntroduction } from "@/lib/agents/registry/introductions";
import { getAgentByIdMerged } from "@/lib/agents/registry/merge";
import { AGENT_REGISTRY } from "@/lib/agents/registry";
import {
  conciergeEndpoints,
} from "@/lib/agents/orchestrator/catalog-context";
import {
  isAutonomousRegistrationEnabled,
  verifyEnsAgentRegistration,
  verifyRegistrationSignature,
  verifyRegistrySecret,
} from "@/lib/agents/registry/verify-registration";
import { JoinAgentSchema } from "../schema";

/** POST /api/agents/join — register, introduce to concierge, confirm catalog inclusion */
export async function POST(request: NextRequest) {
  if (!isAutonomousRegistrationEnabled()) {
    return NextResponse.json(
      { success: false, error: "Autonomous agent registration is disabled" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const parsed = JoinAgentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid join payload",
        details: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const { manifest, timestamp, signature, signer, introduction } = parsed.data;
  const ensName = parsed.data.ensName ?? manifest.ensName;
  const authHeader = request.headers.get("authorization");

  let verification: AgentRegistrationRecord["verification"] | null = null;
  let verifiedSigner: string | undefined;

  if (verifyRegistrySecret(authHeader)) {
    verification = "secret";
  } else if (signature && signer) {
    const valid = await verifyRegistrationSignature({
      agentId: manifest.id,
      ensName,
      timestamp,
      signer,
      signature: signature as `0x${string}`,
    });
    if (valid) {
      verification = "signature";
      verifiedSigner = getAddress(signer);
    }
  } else if (ensName) {
    const ensCheck = await verifyEnsAgentRegistration({
      ensName,
      agentId: manifest.id,
    });
    if (ensCheck.verified) verification = "ens";
  }

  if (!verification) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Join not authorized. Provide wallet signature, Bearer AGENT_REGISTRY_SECRET, or ENS proof.",
      },
      { status: 401 },
    );
  }

  const builtin = AGENT_REGISTRY.find((a) => a.id === manifest.id);
  if (builtin && verification !== "ens" && verification !== "secret") {
    return NextResponse.json(
      {
        success: false,
        error:
          "Built-in agents can only be joined via ENS verification or registry secret.",
      },
      { status: 403 },
    );
  }

  const now = new Date().toISOString();
  const ensCheck = ensName
    ? await verifyEnsAgentRegistration({ ensName, agentId: manifest.id })
    : null;

  const { ensName: _e, endpoints: _ep, ...agentFields } = manifest;

  const record = await upsertAgentRegistration({
    agent: agentFields,
    ensName,
    endpoints: ensCheck?.endpoints ?? manifest.endpoints,
    registeredAt: now,
    updatedAt: now,
    signer: verifiedSigner,
    verification,
  });

  if (introduction?.trim()) {
    await saveAgentIntroduction({
      agentId: manifest.id,
      message: introduction.trim(),
      signer: verifiedSigner ?? signer ?? "unknown",
      introducedAt: now,
    });
  }

  if (process.env.ENS_AGENT_PARENT?.trim()) {
    await discoverAgentsFromEns();
  }

  const included = await getAgentByIdMerged(manifest.id, { discoverEns: false });
  const concierge = conciergeEndpoints();

  return NextResponse.json({
    success: true,
    included: Boolean(included),
    agent: record.agent,
    ensName: record.ensName ?? null,
    verification: record.verification,
    concierge,
    message: included
      ? `${record.agent.name} joined Agent Bazar. Users can discover it via the Concierge at ${concierge.web}.`
      : "Registered but not yet visible in catalog.",
  });
}
