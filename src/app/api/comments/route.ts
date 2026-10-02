/**
 * guymaTV - Comments & Reviews API
 *
 * GET    /api/comments?streamItemId=xxx   → list comments for a movie/series
 * POST   /api/comments                    → add a comment { streamItemId, userName?, rating?, content, parentId? }
 * DELETE /api/comments?id=xxx             → remove a comment
 *
 * Comments support:
 *   - Star rating (0-5)
 *   - Replies (parentId)
 *   - Anonymous by default (userName defaults to "Anonyme")
 *   - Sorted by createdAt DESC
 *
 * NO authentication required — this is a local/personal wrapper app.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export interface CommentDTO {
  id: string;
  streamItemId: string;
  userName: string;
  rating: number;
  content: string;
  parentId: string | null;
  createdAt: string;
  replies?: CommentDTO[];
}

function rowToDTO(row: {
  id: string;
  streamItemId: string;
  userName: string;
  rating: number;
  content: string;
  parentId: string | null;
  createdAt: Date;
}): CommentDTO {
  return {
    id: row.id,
    streamItemId: row.streamItemId,
    userName: row.userName,
    rating: row.rating,
    content: row.content,
    parentId: row.parentId,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const streamItemId = searchParams.get("streamItemId");
    if (!streamItemId) {
      return NextResponse.json(
        { error: "Missing streamItemId parameter" },
        { status: 400 }
      );
    }

    const rows = await db.comment.findMany({
      where: { streamItemId },
      orderBy: { createdAt: "desc" },
    });

    // Build a tree: top-level comments + their replies
    const all = rows.map(rowToDTO);
    const topLevel = all.filter((c) => !c.parentId);
    const byParent = new Map<string, CommentDTO[]>();
    for (const c of all) {
      if (c.parentId) {
        const arr = byParent.get(c.parentId) || [];
        arr.push(c);
        byParent.set(c.parentId, arr);
      }
    }
    const tree = topLevel.map((c) => ({
      ...c,
      replies: (byParent.get(c.id) || []).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    }));

    // Compute aggregate rating
    const ratedRows = rows.filter((r) => r.rating > 0);
    const avgRating =
      ratedRows.length > 0
        ? ratedRows.reduce((s, r) => s + r.rating, 0) / ratedRows.length
        : 0;

    return NextResponse.json({
      comments: tree,
      total: rows.length,
      averageRating: Math.round(avgRating * 10) / 10,
    });
  } catch (err) {
    console.error("[/api/comments GET] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { streamItemId, userName, rating, content, parentId } = body || {};

    if (!streamItemId || !content || !content.trim()) {
      return NextResponse.json(
        { error: "Missing required fields: streamItemId, content" },
        { status: 400 }
      );
    }

    const clampedRating = Math.max(0, Math.min(5, parseInt(rating, 10) || 0));
    const cleanName = (userName || "Anonyme").toString().slice(0, 50);
    const cleanContent = content.toString().slice(0, 2000);

    const comment = await db.comment.create({
      data: {
        streamItemId: String(streamItemId),
        userName: cleanName,
        rating: clampedRating,
        content: cleanContent,
        parentId: parentId || null,
      },
    });

    return NextResponse.json(rowToDTO(comment));
  } catch (err) {
    console.error("[/api/comments POST] error:", err);
    return NextResponse.json(
      { error: "Failed to add comment" },
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
    // Delete the comment and its replies
    await db.comment.deleteMany({
      where: {
        OR: [{ id }, { parentId: id }],
      },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/comments DELETE] error:", err);
    return NextResponse.json(
      { error: "Failed to remove comment" },
      { status: 500 }
    );
  }
}
