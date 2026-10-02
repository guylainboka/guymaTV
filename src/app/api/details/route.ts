/**
 * guymaTV - Details API
 * GET /api/details?id=xxx
 * Returns full StreamItem metadata for a french-stream.net newsid.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDetails } from "@/lib/scraper";

export const dynamic = "force-dynamic";
export const revalidate = 600;

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
    const item = await getDetails(id);
    if (!item) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(item);
  } catch (err) {
    console.error("[/api/details] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch details" },
      { status: 500 }
    );
  }
}
