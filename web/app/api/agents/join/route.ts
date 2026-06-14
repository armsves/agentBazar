import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { discoverAgentsFromEns } from "@/lib/agents/registry/discover-ens";
import { registerAgentWithEns } from "@/lib/agents/registry/ens-registration";
import { saveAgentIntroduction } from "@/lib/agents/registry/introductions";
import { getAgentByIdMerged } from "@/lib/agents/registry/merge";
import { conciergeEndpoints } from "@/lib/agents/orchestrator/catalog-context";
import { isAutonomousRegistrationEnabled } from "@/lib/agents/registry/verify-registration";
import { JoinAgentSchema } from "../schema";

/** POST /api/agents/join — register with ENS subdomain, introduce to concierge */
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
  const now = new Date().toISOString();

  if (introduction?.trim()) {
    await saveAgentIntroduction({
      agentId: manifest.id,
      message: introduction.trim(),
      signer: record.signer ?? signer ?? "unknown",
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
    ensProvisioned,
    concierge,
    message: included
      ? `${record.agent.name} joined Agent Bazar at ${record.ensName}. Users can discover it via the Concierge at ${concierge.web}.`
      : "Registered but not yet visible in marketplace (ENS verification required).",
  });
}
