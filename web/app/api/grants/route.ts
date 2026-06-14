import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { listUserExecutions } from "@/lib/agents/executions/storage";
import { listUserGrants } from "@/lib/agents/grants/storage";
import { getAgentById } from "@/lib/agents/registry";
import {
  type AuthenticatedUser,
  withAuth,
} from "@/lib/dynamic/dynamic-auth";

/** GET /api/grants — user's installed agents and recent executions */
export const GET = withAuth(
  async (_req: NextRequest, { user }: { user: AuthenticatedUser }) => {
    const grants = await listUserGrants(user.sub);
    const executions = await listUserExecutions(user.sub);

    const installed = grants.map((grant) => ({
      grant,
      agent: getAgentById(grant.agentId),
    }));

    return NextResponse.json({
      success: true,
      installed,
      executions,
    });
  },
);
