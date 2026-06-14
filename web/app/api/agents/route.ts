import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { listAgents } from "@/lib/agents/registry";
import { listUserGrants } from "@/lib/agents/grants/storage";
import {
  type AuthenticatedUser,
  withAuth,
} from "@/lib/dynamic/dynamic-auth";

/** GET /api/agents — marketplace catalog with user's install status */
export const GET = withAuth(
  async (_req: NextRequest, { user }: { user: AuthenticatedUser }) => {
    const agents = listAgents();
    const grants = await listUserGrants(user.sub);
    const installedIds = new Set(grants.map((g) => g.agentId));

    return NextResponse.json({
      success: true,
      agents: agents.map((agent) => ({
        ...agent,
        installed: installedIds.has(agent.id),
        grant: grants.find((g) => g.agentId === agent.id) ?? null,
      })),
    });
  },
);
