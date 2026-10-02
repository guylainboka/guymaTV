/**
 * guymaTV - Series Structure API
 * GET /api/series-structure?id=xxx
 *
 * Returns the seasons + episodes structure for a series. Uses Playwright to
 * render the JS-driven episode list on french-stream.net.
 *
 * Returns:
 *   {
 *     newsid, title, currentSeason,
 *     seasons: [{ seasonNumber, title, episodesCount, posterUrl? }],
 *     episodes: [{ id, episodeNumber, seasonNumber, title, synopsis?, videoUrl, language }]
 *   }
 *
 * First call is slow (~10-15s for Playwright). Cached for 30 minutes.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSeriesStructure } from "@/lib/scraper";

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
    const structure = await getSeriesStructure(id);
    if (!structure) {
      return NextResponse.json(
        { error: "Failed to load series structure" },
        { status: 500 }
      );
    }
    return NextResponse.json(structure);
  } catch (err) {
    console.error("[/api/series-structure] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch series structure" },
      { status: 500 }
    );
  }
}
