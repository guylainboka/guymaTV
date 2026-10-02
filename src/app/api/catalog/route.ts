/**
 * guymaTV - Catalog API
 * GET /api/catalog?type=films|series|all&page=1&search=xxx
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

    const result = await getCatalog({ type, page, search });
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
