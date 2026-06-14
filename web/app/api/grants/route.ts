import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { listUserExecutions } from "@/lib/agents/executions/storage";
import { listUserGrants } from "@/lib/agents/grants/storage";
import { getAgentByIdMerged } from "@/lib/agents/registry/merge";
import {
  type AuthenticatedUser,
  withAuth,
} from "@/lib/dynamic/dynamic-auth";

/** GET /api/grants — user's installed agents and recent executions */
export const GET = withAuth(
  async (_req: NextRequest, { user }: { user: AuthenticatedUser }) => {
    const grants = await listUserGrants(user.sub);
    const executions = await listUserExecutions(user.sub);

    const installed = await Promise.all(
      grants.map(async (grant) => ({
        grant,
        agent: await getAgentByIdMerged(grant.agentId),
      })),
    );

    return NextResponse.json({
      success: true,
      installed,
      executions,
    });
  },
);
