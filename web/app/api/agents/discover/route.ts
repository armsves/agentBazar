import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { discoverAgentsFromEns } from "@/lib/agents/registry/discover-ens";
import {
  isAutonomousRegistrationEnabled,
  verifyRegistrySecret,
} from "@/lib/agents/registry/verify-registration";

/** POST /api/agents/discover — sync ENS-published agents into the dynamic registry */
export async function POST(request: NextRequest) {
  if (!isAutonomousRegistrationEnabled()) {
    return NextResponse.json(
      { success: false, error: "Autonomous registration is disabled" },
      { status: 403 },
    );
  }

  const parent = process.env.ENS_AGENT_PARENT?.trim();
  if (!parent) {
    return NextResponse.json(
      {
        success: false,
        error: "ENS_AGENT_PARENT is not configured",
      },
      { status: 400 },
    );
  }

  const authHeader = request.headers.get("authorization");
  const isPublicDiscover =
    process.env.AGENT_ENS_DISCOVER_PUBLIC?.trim().toLowerCase() === "true";

  if (!isPublicDiscover && !verifyRegistrySecret(authHeader)) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Discovery requires Bearer AGENT_REGISTRY_SECRET or AGENT_ENS_DISCOVER_PUBLIC=true",
      },
      { status: 401 },
    );
  }

  const discovered = await discoverAgentsFromEns({ parentName: parent });

  return NextResponse.json({
    success: true,
    parent,
    count: discovered.length,
    agents: discovered.map((record) => ({
      id: record.agent.id,
      name: record.agent.name,
      ensName: record.ensName,
      verification: record.verification,
      endpoints: record.endpoints,
    })),
  });
}

/** GET /api/agents/discover — read-only ENS discovery (no KV write) */
export async function GET(request: NextRequest) {
  const parent =
    request.nextUrl.searchParams.get("parent")?.trim() ||
    process.env.ENS_AGENT_PARENT?.trim();

  if (!parent) {
    return NextResponse.json(
      { success: false, error: "ENS parent name not configured" },
      { status: 400 },
    );
  }

  const discovered = await discoverAgentsFromEns({ parentName: parent });

  return NextResponse.json({
    success: true,
    parent,
    count: discovered.length,
    agents: discovered.map((record) => ({
      id: record.agent.id,
      name: record.agent.name,
      ensName: record.ensName,
      endpoints: record.endpoints,
    })),
  });
}
