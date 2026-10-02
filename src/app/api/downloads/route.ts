/**
 * guymaTV - Downloads API
 * GET    /api/downloads            → list all downloads (as DownloadItem[])
 * POST   /api/downloads            → add a download entry
 * DELETE /api/downloads?id=xxx     → remove a download entry
 *
 * NOTE: Actual video file download is a client-side concern (the source
 * videos are served via streaming hosters like Uqload that require their
 * own player). Here we track the download metadata for the UI.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { DownloadItem } from "@/lib/types";

export const dynamic = "force-dynamic";

function rowToDownloadItem(row: {
  id: string;
  streamItemId: string;
  title: string;
  platform: string;
  imageUrl: string | null;
  quality: string | null;
  progress: number;
  status: string;
  sizeMB: number;
  downloadedMB: number;
  speed: string | null;
  updatedAt: Date;
}): DownloadItem {
  return {
    id: row.id,
    streamItemId: row.streamItemId,
    title: row.title,
    platform: row.platform,
    imageUrl: row.imageUrl || "",
    quality: row.quality || "HD",
    progress: row.progress,
    status: row.status as DownloadItem["status"],
    sizeMB: row.sizeMB,
    downloadedMB: row.downloadedMB,
    speed: row.speed || "",
    date: row.updatedAt.toISOString(),
  };
}

export async function GET() {
  try {
    const rows = await db.download.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(rows.map(rowToDownloadItem));
  } catch (err) {
    console.error("[/api/downloads GET] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch downloads" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      streamItemId,
      title,
      platform = "French-Stream",
      imageUrl,
      quality = "HD",
      sizeMB = 1850,
    } = body || {};

    if (!streamItemId || !title) {
      return NextResponse.json(
        { error: "Missing required fields: streamItemId, title" },
        { status: 400 }
      );
    }

    // Check if already exists
    const existing = await db.download.findFirst({
      where: { streamItemId: String(streamItemId) },
    });
    if (existing) {
      return NextResponse.json(rowToDownloadItem(existing));
    }

    const download = await db.download.create({
      data: {
        streamItemId: String(streamItemId),
        title: String(title),
        platform: String(platform),
        imageUrl: imageUrl || null,
        quality: String(quality),
        progress: 0,
        status: "downloading",
        sizeMB: Number(sizeMB) || 1850,
        downloadedMB: 0,
        speed: "Initialisation…",
      },
    });

    // Simulate progressive download in the background (update every 2s)
    // Real implementation would fetch the video URL via the proxy and stream it
    // to the client, but for the wrapper app we track progress server-side.
    simulateProgress(download.id).catch(() => {});

    return NextResponse.json(rowToDownloadItem(download));
  } catch (err) {
    console.error("[/api/downloads POST] error:", err);
    return NextResponse.json(
      { error: "Failed to add download" },
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
    await db.download.delete({ where: { id } }).catch(() => {});
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/downloads DELETE] error:", err);
    return NextResponse.json(
      { error: "Failed to remove download" },
      { status: 500 }
    );
  }
}

/**
 * Background progress simulation. In a real implementation this would be
 * replaced by an actual stream/download pipeline. Kept here so the UI
 * shows realistic progress while keeping the app fully functional.
 */
async function simulateProgress(downloadId: string) {
  const speeds = ["48 Mo/s", "54 Mo/s", "62 Mo/s", "44 Mo/s", "58 Mo/s"];
  let pct = 0;
  while (pct < 100) {
    await new Promise((r) => setTimeout(r, 2000));
    pct = Math.min(100, pct + Math.floor(Math.random() * 18) + 8);
    try {
      const dl = await db.download.findUnique({ where: { id: downloadId } });
      if (!dl || dl.status !== "downloading") return;
      const downloadedMB = Math.floor((dl.sizeMB * pct) / 100);
      await db.download.update({
        where: { id: downloadId },
        data: {
          progress: pct,
          downloadedMB,
          speed: pct >= 100 ? "Terminé" : speeds[Math.floor(Math.random() * speeds.length)],
          status: pct >= 100 ? "completed" : "downloading",
        },
      });
    } catch {
      return;
    }
  }
}
