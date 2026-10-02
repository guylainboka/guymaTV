/**
 * guymaTV - Video URL Extractor (Playwright)
 *
 * Launches a headless Chromium browser, navigates to the french-stream.net
 * movie/series page, waits for the video iframe to load, follows to the
 * hoster page (Uqload, Vidoza, Doodstream, Streamtape, Mixdrop), and
 * extracts the direct video URL (.mp4 or .m3u8).
 *
 * The extracted URL is then returned to the client which plays it in a
 * native <video> element (full controls, no ads, no popups).
 *
 * This replaces the previous "iframe the whole filtered page" approach with
 * a proper "extract direct URL and play natively" approach — better UX,
 * better ad-blocking (the hoster page never loads in the user's browser),
 * and works inside an APK (no iframe sandbox issues).
 */

import { chromium, type Browser } from "playwright";
import type { StreamServer } from "@/lib/types";

// In-memory cache (30 min — hoster URLs often expire)
interface CacheEntry {
  servers: StreamServer[];
  expires: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 30 * 60 * 1000;

// Singleton browser instance (reused across requests)
let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage", // important in containers
        "--disable-gpu",
        "--disable-extensions",
        "--disable-popup-blocking", // we WANT popups so we can intercept them
      ],
    });
  }
  return browserPromise;
}

interface HosterInfo {
  name: string;
  match: RegExp;
}

const HOSTERS: HosterInfo[] = [
  { name: "Uqload", match: /uqload\.(com|vc|io|net|co)/i },
  { name: "Vidoza", match: /vidoza\.(net|io|co|org)/i },
  { name: "Doodstream", match: /dood(?:stream|so|watch|pm|cx|to)\./i },
  { name: "Streamtape", match: /streamtape\.com/i },
  { name: "Mixdrop", match: /mixdrop\.(co|to|ag|pz|mv)/i },
  { name: "Upstream", match: /upstream\.to/i },
  { name: "Voestream", match: /voe?stream\.(com|sx|net)/i },
  { name: "Voirseries", match: /voirseries\./i },
  { name: "Sibnet", match: /video\.sibnet\.ru/i },
  { name: "Filmoon", match: /filmoon\./i },
  { name: "ViDZY", match: /vidzy\./i },
  { name: "Upstream", match: /upstream\./i },
];

function detectHoster(url: string): string {
  for (const h of HOSTERS) {
    if (h.match.test(url)) return h.name;
  }
  return "Direct";
}

/**
 * Extract direct video URLs from a hoster page.
 * Tries multiple strategies:
 *  1. Intercept network requests for .mp4/.m3u8
 *  2. Read <source> or <video> src from DOM
 *  3. Parse JS sources/sourcesArray variable
 */
async function extractFromHosterPage(
  page: import("playwright").Page,
  hosterUrl: string
): Promise<string | null> {
  let directUrl: string | null = null;

  // Strategy 1: intercept network requests for master playlists / mp4 files.
  // We EXCLUDE segment files (.ts, .m4s, .aac) which would be useless to the
  // player. We prefer master.m3u8 or playlist.m3u8 over index/quality playlists.
  const videoUrlPromise = new Promise<string | null>((resolve) => {
    const candidates: { url: string; isMaster: boolean }[] = [];
    const timeout = setTimeout(() => {
      // Pick the best candidate (master playlist preferred)
      const master = candidates.find((c) => c.isMaster);
      resolve(master?.url || candidates[0]?.url || null);
    }, 12000);
    const check = (url: string) => {
      // Skip segments and non-video
      if (/\.(ts|m4s|aac|key)(\?|$)/i.test(url)) return;
      if (/\.(mp4|webm)(\?|$)/i.test(url) && !url.includes("ad")) {
        candidates.push({ url, isMaster: true });
        clearTimeout(timeout);
        resolve(url);
        return;
      }
      if (/\.m3u8(\?|$)/i.test(url) && !url.includes("ad")) {
        const isMaster = /master|playlist|main/i.test(url) || candidates.length === 0;
        candidates.push({ url, isMaster });
      }
    };
    page.on("request", (req) => check(req.url()));
    page.on("response", (res) => {
      const ct = res.headers()["content-type"] || "";
      if (ct.includes("video/") || ct.includes("mpegurl")) {
        check(res.url());
      }
    });
  });

  try {
    await page.goto(hosterUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
  } catch {
    // Continue anyway — network interception may still fire
  }

  // Wait for either network interception or DOM ready
  directUrl = await videoUrlPromise;

  // Strategy 2: read from <video> / <source> elements
  if (!directUrl) {
    try {
      directUrl = await page.evaluate(() => {
        const video = document.querySelector("video");
        if (video) {
          const src = video.getAttribute("src");
          if (src) return src;
          const source = video.querySelector("source");
          if (source) return source.getAttribute("src") || "";
        }
        // Look for sources variable in JS (common in Doodstream/Mixdrop)
        const html = document.documentElement.innerHTML;
        const mp4Match = html.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/i);
        if (mp4Match) return mp4Match[0];
        const m3u8Match = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/i);
        if (m3u8Match) return m3u8Match[0];
        return null;
      });
    } catch {
      /* ignore */
    }
  }

  // Strategy 3: eval common JS patterns (sources = [|])
  if (!directUrl) {
    try {
      directUrl = await page.evaluate(() => {
        // Doodstream: sources = ["https://..."]
        // Vidoza: playerInstance.setup({sources: [...]})
        // Uqload: sources = ["/v/..."] or eval'd
        // @ts-expect-error - runtime probe
        if (typeof window.sources !== "undefined" && Array.isArray(window.sources)) {
          // @ts-expect-error
          const s = window.sources.find((x: any) => typeof x === "string" && /\.mp4|m3u8/i.test(x));
          if (s) return s;
          // @ts-expect-error
          const obj = window.sources.find((x: any) => x?.file);
          if (obj?.file) return obj.file;
        }
        return null;
      });
    } catch {
      /* ignore */
    }
  }

  return directUrl;
}

/**
 * Main entry: extract video servers for a french-stream.net newsid.
 *
 * Returns an array of StreamServer objects with direct video URLs that can
 * be loaded in a native <video> element.
 */
export async function extractVideoServers(
  newsid: string
): Promise<StreamServer[]> {
  // Cache hit?
  const cacheKey = `extract:${newsid}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expires) {
    return cached.servers;
  }

  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    locale: "fr-FR",
    viewport: { width: 1280, height: 720 },
    javaScriptEnabled: true,
  });

  // Block ad/tracker requests at the network layer.
  // Playwright v1.63+ requires string/glob/RegExp/URLPattern — NOT "**/..." patterns.
  // We use a function matcher for maximum compatibility.
  const blockedHosts = [
    "doubleclick.net",
    "googlesyndication.com",
    "googletagmanager.com",
    "google-analytics.com",
    "exoclick.com",
    "trafficjunky.net",
    "histats.com",
    "popads.net",
    "popcash.net",
    "adsterra.com",
    "propellerads.com",
    "clickadu.com",
    "hilltopads.net",
    "admaven.com",
    "adcash.com",
    "coinhive.com",
    "cryptoloot.com",
    "fsurl.lol",
    "qnlbktsubwtnf.space",
    "adexchangerapid.com",
    "kmqufetbovsea.site",
    "taboola.com",
    "outbrain.com",
    "mgid.com",
    "criteo.com",
    "adnxs.com",
    "rubiconproject.com",
    "openx.net",
    "pubmatic.com",
    "smartadserver.com",
  ];
  await context.route((url: URL) => {
    const h = url.hostname.toLowerCase();
    return blockedHosts.some((b) => h.includes(b));
  }, (route) => route.abort());

  const page = await context.newPage();

  // Override window.open to capture popup attempts (some hosters open popups)
  await page.addInitScript(() => {
    window.open = () => null;
  });

  const sourceUrl = `https://french-stream.net/index.php?newsid=${newsid}`;

  try {
    // Use 'load' with a shorter timeout, then continue regardless —
    // the page may have slow third-party scripts that we've blocked.
    await page.goto(sourceUrl, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    // Give the page a moment to render player iframes via JS
    await page.waitForTimeout(3000);

    // Collect all video hoster iframes found on the page
    // The site renders player tabs/versions — we click through each to reveal iframes
    const hosterUrls: { url: string; label: string }[] = [];

    // 1. Direct iframes already in DOM
    const directIframes = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("iframe"))
        .map((f) => ({ src: f.src, label: f.title || "Lecteur" }))
        .filter((f) => f.src && !f.src.includes("french-stream.net"));
    });
    for (const f of directIframes) {
      if (HOSTERS.some((h) => h.match.test(f.src))) {
        hosterUrls.push({ url: f.src, label: f.label });
      }
    }

    // 2. Click through player options (the site uses .player-option buttons
    //    with data-player="Uqload"|"Dood"|"Vidoza"|etc. Clicking loads the
    //    corresponding hoster iframe into #main-player).
    //    We also need to remove any overlay divs (#dontfoid, anti-bot shields)
    //    that intercept pointer events.
    await page
      .evaluate(() => {
        // Remove known anti-bot / ad overlay divs
        document
          .querySelectorAll(
            "#dontfoid, [id*=dontfoid], [znid], .fssts-card, .fssts-in, .fssts-flash"
          )
          .forEach((el) => el.remove());
      })
      .catch(() => {});

    const playerOptions = await page.$$(".player-option").catch(() => []);
    for (let i = 0; i < Math.min(playerOptions.length, 4); i++) {
      try {
        // force: true to bypass any remaining overlay
        await playerOptions[i].click({ timeout: 5000, force: true });
        await page.waitForTimeout(2500);
        const iframes = await page.evaluate(() => {
          return Array.from(document.querySelectorAll("iframe"))
            .map((f) => f.src)
            .filter((src) => src && !src.includes("french-stream.net") && !src.includes("youtube.com"));
        });
        for (const src of iframes) {
          if (
            HOSTERS.some((h) => h.match.test(src)) &&
            !hosterUrls.some((h) => h.url === src)
          ) {
            hosterUrls.push({
              url: src,
              label: `Lecteur ${detectHoster(src)}`,
            });
          }
        }
      } catch {
        /* ignore tab click failures */
      }
    }

    // 3. Fallback: if no hoster found, try the fsurl.lol redirect endpoint
    if (hosterUrls.length === 0) {
      // The site uses fsurl.lol/sso.php?op=get as a session/redirect - skip it
      // and rely on the proxy iframe fallback.
    }

    // For each hoster URL, extract the direct video URL
    const servers: StreamServer[] = [];
    const seen = new Set<string>();

    for (const hoster of hosterUrls.slice(0, 4)) {
      try {
        const directUrl = await extractFromHosterPage(
          await context.newPage(),
          hoster.url
        );
        if (directUrl && !seen.has(directUrl)) {
          seen.add(directUrl);
          const hosterName = detectHoster(hoster.url) as StreamServer["hoster"];
          servers.push({
            id: `srv-${newsid}-${servers.length}`,
            name: `${hosterName}`,
            hoster: hosterName === "Direct" ? "Direct 4K" : (hosterName as StreamServer["hoster"]),
            quality: "1080p",
            language: "VF",
            speed: "Direct (sans pub)",
            videoUrl: directUrl,
          });
        }
      } catch {
        /* ignore individual hoster failures */
      }
    }

    // Always include our filtered proxy as a fallback server
    servers.push({
      id: `srv-${newsid}-proxy`,
      name: "Lecteur Sécurisé (proxy filtré)",
      hoster: "Direct 4K",
      quality: "1080p",
      language: "VF",
      speed: "Ultra Rapide (sans pub)",
      videoUrl: `/api/proxy?page=${newsid}`,
    });

    cache.set(cacheKey, { servers, expires: Date.now() + CACHE_TTL });
    return servers;
  } catch (err) {
    console.error(`[extractVideoServers] error for ${newsid}:`, err);
    // Return the proxy fallback on any error
    return [
      {
        id: `srv-${newsid}-proxy`,
        name: "Lecteur Sécurisé (proxy filtré)",
        hoster: "Direct 4K",
        quality: "1080p",
        language: "VF",
        speed: "Ultra Rapide (sans pub)",
        videoUrl: `/api/proxy?page=${newsid}`,
      },
    ];
  } finally {
    await context.close().catch(() => {});
  }
}

/**
 * Graceful shutdown — call on server exit.
 */
export async function closeExtractorBrowser(): Promise<void> {
  if (browserPromise) {
    const browser = await browserPromise.catch(() => null);
    if (browser) await browser.close().catch(() => {});
    browserPromise = null;
  }
}
