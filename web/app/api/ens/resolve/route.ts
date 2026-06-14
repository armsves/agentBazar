import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { resolveAgentFromEns } from "@/lib/ens/resolve";

/** GET /api/ens/resolve?name=concierge.parent.eth — read ENSIP-26 records */
export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name")?.trim();
  if (!name) {
    return NextResponse.json(
      { success: false, error: "Query param name is required" },
      { status: 400 },
    );
  }

  const resolved = await resolveAgentFromEns(name);

  return NextResponse.json({
    success: true,
    ...resolved,
    verified: Boolean(resolved.agentContext),
  });
}
