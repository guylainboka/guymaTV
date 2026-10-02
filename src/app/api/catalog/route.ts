/**
 * guymaTV - Catalog API
 * GET /api/catalog?type=films|series|all&page=1&search=xxx&filter=action&path=/films/actions/&random=1
 *
 * Supports browsing, searching, filtering (by genre/langue/pays/thème/année)
 * and random mode (for Explorer's random discovery).
 */

import { NextRequest, NextResponse } from "next/server";
import { getCatalog } from "@/lib/scraper";

export const dynamic = "force-dynamic";
export const revalidate = 600;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") || "all") as
      | "films"
      | "series"
      | "all";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const search = searchParams.get("search") || undefined;
    const filter = searchParams.get("filter") || undefined;
    const path = searchParams.get("path") || undefined;
    const random = searchParams.get("random") === "1";

    const result = await getCatalog({
      type,
      page,
      search,
      filter,
      path,
      random,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/catalog] error:", err);
    return NextResponse.json(
      {
        items: [],
        totalPages: 1,
        currentPage: 1,
        error: "Failed to fetch catalog",
      },
      { status: 500 }
    );
  }
}
