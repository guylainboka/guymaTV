/**
 * guymaTV - Filters API
 * GET /api/filters
 *
 * Returns the full filter catalog (genre, langue, pays, thème, sélection, année)
 * mirroring the french-stream.net dropdown menu.
 */

import { NextResponse } from "next/server";
import { FILTER_GROUPS, buildYearFilter } from "@/lib/filters";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    groups: FILTER_GROUPS,
    // Helper for the custom year input
    buildYearPath: (year: number) => buildYearFilter(year)?.path || null,
  });
}
