/**
 * guymaTV - Favorites API
 * GET    /api/favorites            → list all favorites (as StreamItem[])
 * POST   /api/favorites            → add a favorite  (body: StreamItem-ish)
 * DELETE /api/favorites?id=xxx     → remove a favorite
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { StreamItem } from "@/lib/types";

export const dynamic = "force-dynamic";

function rowToStreamItem(row: {
  id: string;
  title: string;
  platform: string;
  imageUrl: string | null;
  quality: string | null;
  category: string | null;
  sourceUrl: string | null;
}): StreamItem {
  return {
    id: row.id,
    title: row.title,
    category: (row.category as StreamItem["category"]) || "Cinéma",
    platform: row.platform,
    sourceServiceId: "french-stream",
    sourceUrl: row.sourceUrl || undefined,
    badgeClass: "bg-primary/20 text-primary",
    imageUrl: row.imageUrl || "",
    fallbackGradient: "from-emerald-950 via-neutral-900 to-lime-950",
    description: "",
    quality: (row.quality as StreamItem["quality"]) || "HD",
    blockedAdStats: { popups: 8, adultBanners: 4, redirects: 6, trackers: 12 },
  };
}

export async function GET() {
  try {
    const rows = await db.favorite.findMany({
      orderBy: { createdAt: "desc" },
    });
    const items = rows.map(rowToStreamItem);
    return NextResponse.json(items);
  } catch (err) {
    console.error("[/api/favorites GET] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch favorites" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      title,
      platform = "French-Stream",
      imageUrl,
      quality,
      category,
      sourceUrl,
    } = body || {};

    if (!id || !title) {
      return NextResponse.json(
        { error: "Missing required fields: id, title" },
        { status: 400 }
      );
    }

    const favorite = await db.favorite.upsert({
      where: { id: String(id) },
      create: {
        id: String(id),
        title: String(title),
        platform: String(platform),
        imageUrl: imageUrl || null,
        quality: quality || null,
        category: category || null,
        sourceUrl: sourceUrl || null,
      },
      update: {
        title: String(title),
        imageUrl: imageUrl || null,
        quality: quality || null,
      },
    });

    return NextResponse.json(rowToStreamItem(favorite));
  } catch (err) {
    console.error("[/api/favorites POST] error:", err);
    return NextResponse.json(
      { error: "Failed to add favorite" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Missing id parameter" },
        { status: 400 }
      );
    }
    await db.favorite.delete({ where: { id } }).catch(() => {
      // ignore not found
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/favorites DELETE] error:", err);
    return NextResponse.json(
      { error: "Failed to remove favorite" },
      { status: 500 }
    );
  }
}
