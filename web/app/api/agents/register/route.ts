import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { registerAgentWithEns } from "@/lib/agents/registry/ens-registration";
import { isAutonomousRegistrationEnabled } from "@/lib/agents/registry/verify-registration";
import { RegisterAgentSchema } from "../schema";

/** POST /api/agents/register — autonomous agent self-registration (ENS required for listing) */
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
  const result = await registerAgentWithEns({
    manifest: {
      ...manifest,
      ensName: parsed.data.ensName ?? manifest.ensName,
    },
    timestamp,
    signature,
    signer,
    authHeader: request.headers.get("authorization"),
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        ensName: result.ensName ?? null,
        details: result.details,
      },
      { status: result.status },
    );
  }

  const { record, ensProvisioned } = result;

  return NextResponse.json({
    success: true,
    agent: record.agent,
    ensName: record.ensName ?? null,
    verification: record.verification,
    ensProvisioned,
    message: ensProvisioned
      ? `${record.agent.name} registered with new ENS subdomain ${record.ensName}.`
      : `${record.agent.name} registered in Agent Bazar marketplace.`,
  });
}
