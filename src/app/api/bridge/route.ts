/**
 * guymaTV - Bridge Proxy API
 * GET /api/bridge?url=<platform_url>
 *
 * Acts as a "gateway" to legal free streaming platforms (France.tv, Arte,
 * Pluto TV, etc.). The proxy:
 *   1. Fetches the target platform's page
 *   2. Strips X-Frame-Options and CSP frame-ancestors headers so it can be
 *      embedded in our iframe
 *   3. Rewrites relative URLs to absolute (so resources load correctly)
 *   4. Injects a <base> tag
 *   5. Serves the result with permissive CORS/frame headers
 *
 * Unlike /api/proxy (which strips ads from French-Stream), this proxy does
 * NOT modify the platform's content — it just bypasses the X-Frame-Options
 * restriction so the platform's real interface loads inside guymaTV.
 *
 * guymaTV keeps only its header/footer around the iframe — everything inside
 * is the real platform.
 *
 * SECURITY: Only whitelisted legal platforms can be proxied (see ALLOWED_HOSTS).
 */

import { NextRequest, NextResponse } from "next/server";
import { BRIDGE_PLATFORMS } from "@/lib/bridge-platforms";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Whitelist of allowed hosts (only the legal platforms in our registry)
const ALLOWED_HOSTS = BRIDGE_PLATFORMS.map((p) => {
  try {
    return new URL(p.url).hostname;
  } catch {
    return null;
  }
}).filter(Boolean) as string[];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get("url");

    if (!targetUrl) {
      return new NextResponse("Missing url parameter", { status: 400 });
    }

    // Parse and validate the URL
    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return new NextResponse("Invalid URL", { status: 400 });
    }

    // Security: only allow whitelisted hosts
    if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
      return new NextResponse(
        `<html><body style="background:#0f1412;color:#dfe4e0;font-family:sans-serif;padding:40px;text-align:center"><h2>Plateforme non autorisée</h2><p>Ce proxy ne fonctionne qu'avec les plateformes légales référencées par guymaTV.</p></body></html>`,
        { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Fetch the target page with browser-like headers.
    // Some platforms (France.tv, TF1) use Akamai bot detection which blocks
    // non-browser User-Agents, so we send a complete set of browser headers.
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Sec-Ch-Ua": '"Chromium";v="131", "Not_A Brand";v="24", "Google Chrome";v="131"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        Referer: parsed.origin,
      },
      redirect: "follow",
    });

    if (!res.ok) {
      return new NextResponse(
        `<html><body style="background:#0f1412;color:#dfe4e0;font-family:sans-serif;padding:40px;text-align:center"><h2>Plateforme temporairement indisponible</h2><p>Code: ${res.status}</p><p>URL: ${targetUrl}</p></body></html>`,
        { status: res.status, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const contentType = res.headers.get("content-type") || "";

    // For non-HTML responses (images, CSS, JS, etc.), pass through directly
    // with permissive CORS headers. This handles relative resource requests.
    if (!contentType.includes("text/html")) {
      const body = await res.arrayBuffer();
      return new NextResponse(body, {
        status: res.status,
        headers: {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // For HTML pages: rewrite relative URLs and strip frame-blocking headers
    let html = await res.text();

    // Inject a <base> tag so relative URLs resolve to the target platform
    const baseTag = `<base href="${parsed.origin}/">`;
    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
    } else {
      html = baseTag + html;
    }

    // Return with permissive frame headers (strip X-Frame-Options and CSP)
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // Permissive frame headers so our iframe can embed this
        "X-Frame-Options": "ALLOWALL",
        "Content-Security-Policy": "frame-ancestors 'self' *",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err) {
    console.error("[/api/bridge] error:", err);
    return new NextResponse(
      `<html><body style="background:#0f1412;color:#dfe4e0;font-family:sans-serif;padding:40px;text-align:center"><h2>Erreur de chargement</h2><p>Vérifiez votre connexion et réessayez.</p></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}
