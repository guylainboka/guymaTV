/**
 * guymaTV - Servers API
 * GET /api/servers?id=xxx
 * Returns the available secure player servers for a movie/series.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServers } from "@/lib/scraper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Missing id parameter" },
        { status: 400 }
      );
    }
    const servers = await getServers(id);
    return NextResponse.json(servers);
  } catch (err) {
    console.error("[/api/servers] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch servers" },
      { status: 500 }
    );
  }
}
