/**
 * guymaTV - Categories API
 * GET /api/categories
 */

import { NextResponse } from "next/server";
import { CATEGORIES } from "@/lib/scraper";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(CATEGORIES);
}
