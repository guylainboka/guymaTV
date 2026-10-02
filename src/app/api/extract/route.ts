/**
 * guymaTV - Video Extraction API
 * GET /api/extract?id=xxx
 *
 * Launches Playwright to extract direct video URLs from french-stream.net.
 * Returns an array of StreamServer with direct .mp4/.m3u8 URLs that the
 * client can play in a native <video> element.
 *
 * First call is slow (~10-15s for Playwright launch + page navigation).
 * Subsequent calls for the same id are cached for 30 minutes.
 */

import { NextRequest, NextResponse } from "next/server";
import { extractVideoServers } from "@/lib/video-extractor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

    const servers = await extractVideoServers(id);
    return NextResponse.json(servers);
  } catch (err) {
    console.error("[/api/extract] error:", err);
    return NextResponse.json(
      {
        error: "Failed to extract video URLs",
        servers: [],
      },
      { status: 500 }
    );
  }
}
