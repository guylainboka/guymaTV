/**
 * guymaTV - Services API
 * GET /api/services
 * Returns the list of "services" (french-stream is the main/only real one).
 */

import { NextResponse } from "next/server";
import { getServices } from "@/lib/scraper";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getServices());
}
