import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAddress } from "viem";

import {
  type AgentRegistrationRecord,
  upsertAgentRegistration,
} from "@/lib/agents/registry/dynamic-storage";
import { AGENT_REGISTRY } from "@/lib/agents/registry";
import {
  isAutonomousRegistrationEnabled,
  verifyEnsAgentRegistration,
  verifyRegistrationSignature,
  verifyRegistrySecret,
} from "@/lib/agents/registry/verify-registration";
import { RegisterAgentSchema } from "../schema";

/** POST /api/agents/register — autonomous agent self-registration */
export async function POST(request: NextRequest) {
  if (!isAutonomousRegistrationEnabled()) {
    return NextResponse.json(
      {
        success: false,
        error: "Autonomous agent registration is disabled",
      },
      { status: 403 },
    );
  }

  const body = await request.json();
  const parsed = RegisterAgentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid registration payload",
        details: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const { manifest, timestamp, signature, signer } = parsed.data;
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
    if (ensCheck.verified) {
      verification = "ens";
    }
  }

  if (!verification) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Registration not authorized. Provide a valid wallet signature, Bearer AGENT_REGISTRY_SECRET, or verifiable ENS records.",
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
          "Built-in agents can only be updated via ENS verification or registry secret.",
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

  return NextResponse.json({
    success: true,
    agent: record.agent,
    ensName: record.ensName ?? null,
    verification: record.verification,
    message: `${record.agent.name} registered in Agent Bazar marketplace.`,
  });
}
