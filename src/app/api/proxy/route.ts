/**
 * guymaTV - Filtered Proxy API
 * GET /api/proxy?page=xxx
 *
 * Fetches the french-stream.net movie/series page, strips ALL ads, popups,
 * trackers and adult content, then serves a clean HTML document that loads
 * inside our secure iframe (no address bar visible).
 *
 * This is the core of the "invisible browser" approach: the user thinks they
 * are watching content inside guymaTV, but in reality we proxy the source site
 * with all advertising/redirects surgically removed.
 */

import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
// BASE_URL is no longer needed — the proxy resolves the domain dynamically.

export const dynamic = "force-dynamic";

// Domains that are ALWAYS blocked (ads, trackers, popups, adult ad networks)
const BLOCKED_DOMAINS = [
  // Ad networks
  "doubleclick.net",
  "googlesyndication.com",
  "googleadservices.com",
  "googletagmanager.com",
  "googletagservices.com",
  "adservice.google.com",
  "adsense.com",
  "adnxs.com",
  "criteo.com",
  "taboola.com",
  "outbrain.com",
  "mgid.com",
  "propellerads.com",
  "popads.net",
  "popcash.net",
  "adsterra.com",
  "exoclick.com",
  "trafficjunky.net",
  "juicyads.com",
  "advertising.com",
  "yieldmo.com",
  "rubiconproject.com",
  "openx.net",
  "pubmatic.com",
  "smartadserver.com",
  "casalemedia.com",
  "aggregate.com",
  // Trackers & analytics
  "histats.com",
  "google-analytics.com",
  "hotjar.com",
  "mixpanel.com",
  "segment.com",
  "amplitude.com",
  "statcounter.com",
  "quantserve.com",
  "scorecardresearch.com",
  "newrelic.com",
  "fullstory.com",
  "clarity.ms",
  // Adult ad networks (heavily used by streaming sites)
  "trafficstars.com",
  "exosrv.com",
  "twinkleparty.com",
  "plugrush.com",
  "adultadworld.com",
  "clickadu.com",
  "hilltopads.net",
  "admaven.com",
  "adcash.com",
  // Popunder / redirect networks
  "propeller-tracking.com",
  "onclickperformance.com",
  "onclickprediction.com",
  "ubundaload.com",
  "acknowledgestar.com",
  "qnlbktsubwtnf.space",
  "adexchangerapid.com",
  "kmqufetbovsea.site",
  // Crypto miners
  "coinhive.com",
  "coin-hive.com",
  "cryptoloot.com",
  "deepmine.io",
  "webmining.co",
  // Common popup redirect hosts
  "fsurl.lol",
  "french-stream.online",
  "french-stream.io",
];

function isBlocked(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return BLOCKED_DOMAINS.some((d) => lower.includes(d));
}

/**
 * Rewrite a relative URL to absolute, pointing to the source domain.
 */
function rewriteUrl(url: string, sourceDomain: string): string {
  if (!url) return url;
  // Don't rewrite data: URLs, anchors, javascript:, mailto:
  if (
    url.startsWith("data:") ||
    url.startsWith("#") ||
    url.startsWith("javascript:") ||
    url.startsWith("mailto:") ||
    url.startsWith("tel:")
  ) {
    return url;
  }
  // Blocked → return empty (will be filtered)
  if (isBlocked(url)) return "";
  // Make relative URLs absolute against the source domain that responded
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${sourceDomain}${url}`;
  return url;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pageId = searchParams.get("page");
    const season = searchParams.get("season");
    const episode = searchParams.get("episode");
    if (!pageId) {
      return new NextResponse("Missing page parameter", { status: 400 });
    }

    // The source site is available on multiple mirror domains. We try each
    // one until it responds. The proxy preserves the source site's native
    // player interface (server tabs, quality selector, episode list) — we
    // only strip ads, popups, trackers, and adult content.
    const SOURCE_DOMAINS = [
      "https://french-stream.net",
      "https://french-stream.one",
    ];

    const targetPath = `/index.php?newsid=${encodeURIComponent(pageId)}`;
    let html: string | null = null;
    let usedDomain: string | null = null;

    for (const domain of SOURCE_DOMAINS) {
      try {
        const res = await fetch(`${domain}${targetPath}`, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
            "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            Referer: domain,
          },
        });
        if (res.ok) {
          html = await res.text();
          usedDomain = domain;
          break;
        }
      } catch {
        // Try next domain
      }
    }

    if (!html || !usedDomain) {
      return new NextResponse(
        `<html><body style="background:#0f1412;color:#dfe4e0;font-family:sans-serif;padding:40px;text-align:center"><h2>Contenu temporairement indisponible</h2><p>Tous les miroirs français-stream ne répondent pas.</p></body></html>`,
        { status: 502, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }
    const $ = cheerio.load(html);

    // === 1. REMOVE ALL AD / TRACKER / POPUP ELEMENTS ===
    // Scripts from blocked domains
    $("script[src]").each((_, el) => {
      const src = $(el).attr("src") || "";
      if (isBlocked(src)) $(el).remove();
    });
    // Inline scripts that look like ad code
    $("script:not([src])").each((_, el) => {
      const code = $(el).html() || "";
      if (
        /adsbygoogle|popunder|popup|exoclick|trafficjunky|histats|onclick|window\.open\s*\(/i.test(
          code
        )
      ) {
        $(el).remove();
      }
    });
    // Iframes from blocked domains
    $("iframe[src]").each((_, el) => {
      const src = $(el).attr("src") || "";
      if (isBlocked(src)) $(el).remove();
    });
    // Link tags (CSS / preconnect) from blocked domains
    $('link[href]').each((_, el) => {
      const href = $(el).attr("href") || "";
      if (isBlocked(href)) $(el).remove();
    });
    // DNS prefetch / preconnect to blocked domains
    $('link[rel="dns-prefetch"], link[rel="preconnect"], link[rel="preload"]').each(
      (_, el) => {
        const href = $(el).attr("href") || "";
        if (isBlocked(href)) $(el).remove();
      }
    );
    // Common ad container selectors
    const adSelectors = [
      "[class*='ad-']",
      "[class*='ads-']",
      "[class*='ad_']",
      "[class*='banner']",
      "[class*='popup']",
      "[id*='ad-']",
      "[id*='ads-']",
      "[id*='banner']",
      "[id*='popup']",
      "[id*='interstitial']",
      ".fssts-card",
      ".fssts-in",
      ".fssts-flash",
      "[onclick*='window.open']",
      "[onclick*='popunder']",
      "ins.adsbygoogle",
      ".ad-container",
      ".ad-wrapper",
      ".ad-zone",
      ".pub",
      ".publicite",
      ".adsbygoogle",
      "#adblock",
      ".ad-banner",
      ".top-banner",
      ".bottom-banner",
      ".side-ad",
    ];
    adSelectors.forEach((sel) => $(sel).remove());

    // === 2. NEUTRALIZE window.open, popups, redirects ===
    // Inject a script at the very top of <head> that overrides these APIs
    // BEFORE any other script runs.
    const neutralizer = `
<script>
(function() {
  // Override window.open → no-op (kills popups/popunders)
  window.open = function() { return null; };
  // Override alert/confirm/prompt (often used for fake "your video is ready" dialogs)
  window.alert = function() {};
  window.confirm = function() { return false; };
  window.prompt = function() { return null; };
  // Block beforeunload hijacking (forces user to stay on page)
  window.onbeforeunload = null;
  Object.defineProperty(window, 'onbeforeunload', {
    configurable: false,
    writable: false,
    value: null
  });
  // Block location redirects to external ad domains
  var origAssign = window.location.assign.bind(window.location);
  var origReplace = window.location.replace.bind(window.location);
  var BLOCKED = ${JSON.stringify(BLOCKED_DOMAINS)};
  function isBlocked(url) {
    if (!url) return false;
    try { var u = new URL(url, window.location.href); } catch(e) { return false; }
    var h = u.hostname.toLowerCase();
    return BLOCKED.some(function(d) { return h.includes(d); });
  }
  // Can't easily override location.href setter cross-browser, but we patch the methods
  window.location.assign = function(url) {
    if (!isBlocked(url)) return origAssign(url);
  };
  window.location.replace = function(url) {
    if (!isBlocked(url)) return origReplace(url);
  };
  // Block document.write of ad scripts
  var origWrite = document.write.bind(document);
  document.write = function(html) {
    if (typeof html === 'string' && /adsbygoogle|popunder|exoclick/i.test(html)) return;
    return origWrite(html);
  };
  // Intercept createElement('script') for ad injection
  var origCreate = document.createElement.bind(document);
  document.createElement = function(tag) {
    var el = origCreate(tag);
    if (tag && tag.toLowerCase() === 'script') {
      var origSetAttr = el.setAttribute.bind(el);
      el.setAttribute = function(name, value) {
        if (name === 'src' && isBlocked(value)) return;
        return origSetAttr(name, value);
      };
      // Define setter for .src
      try {
        var origSrc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
        if (origSrc && origSrc.set) {
          Object.defineProperty(el, 'src', {
            configurable: true,
            get: origSrc.get,
            set: function(v) { if (!isBlocked(v)) origSrc.set.call(this, v); }
          });
        }
      } catch(e) {}
    }
    return el;
  };
  // MutationObserver to nuke ad nodes injected after load
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      m.addedNodes.forEach(function(node) {
        if (node.nodeType !== 1) return;
        var el = node;
        // Remove iframes/scripts pointing to blocked domains
        if (el.tagName === 'SCRIPT' || el.tagName === 'IFRAME') {
          var src = el.src || el.getAttribute('src') || '';
          if (isBlocked(src)) { el.remove(); return; }
        }
        // Remove elements with ad-like classes
        var cls = (el.className && typeof el.className === 'string') ? el.className : '';
        if (/\\b(ad-|ads-|banner|popup|interstitial|fssts-)\\b/i.test(cls)) {
          el.remove(); return;
        }
      });
    });
  });
  try {
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } catch(e) {}
})();
</script>`;

    // === 3. REWRITE ALL URLS (so resources load through the source) ===
    $("script[src], link[href], img[src], img[data-src], a[href]").each(
      (_, el) => {
        const tag = el.tagName.toLowerCase();
        const attr =
          tag === "img" && $(el).attr("data-src")
            ? "data-src"
            : tag === "a"
              ? "href"
              : tag === "img"
                ? "src"
                : tag === "link"
                  ? "href"
                  : "src";
        const val = $(el).attr(attr);
        if (val) {
          const rewritten = rewriteUrl(val, usedDomain);
          if (rewritten === "") {
            $(el).remove();
          } else {
            $(el).attr(attr, rewritten);
          }
        }
      }
    );

    // === 4. INJECT CSS TO HIDE ADS THAT MIGHT SLIP THROUGH + DARK THEME MATCH ===
    const styleInjection = `
<style>
/* Hide any remaining ad containers */
[class*="ad-"], [class*="ads-"], [id*="ad-"], [id*="ads-"],
[class*="banner"], [class*="popup"], [class*="interstitial"],
.fssts-card, .fssts-in, .fssts-flash, ins.adsbygoogle,
.ad-container, .ad-wrapper, .pub, .publicite,
.top-banner, .bottom-banner, .side-ad, #adblock,
iframe[src*="doubleclick"], iframe[src*="googlesyndication"],
iframe[src*="exoclick"], iframe[src*="trafficjunky"],
iframe[src*="popads"], iframe[src*="popcash"],
iframe[src*="adsterra"], iframe[src*="propeller"],
iframe[src*="histats"], iframe[src*="googletagmanager"] {
  display: none !important;
  visibility: hidden !important;
  width: 0 !important;
  height: 0 !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
/* Force dark background to match guymaTV theme */
body {
  background: #0f1412 !important;
  color: #dfe4e0 !important;
}
/* Make sure video iframes fill their container */
iframe {
  max-width: 100%;
}
/* Hide navigation/sidebar that's irrelevant in our wrapper */
.topnav, .FS-mobile-menu, .navigation, .navbar,
.fss-header, .site-header, header[role="banner"] {
  display: none !important;
}
</style>`;

    // Prepend neutralizer to <head>
    $("head").prepend(neutralizer);
    // Append style injection to <head>
    $("head").append(styleInjection);

    // Add a base tag so relative URLs resolve to the source
    if ($("base").length === 0) {
      $("head").prepend(`<base href="${usedDomain}/">`);
    }

    // === 5. ADD X-Frame-ALLOWING HEADERS (we're serving our own filtered HTML) ===
    const filteredHtml = $.html();

    return new NextResponse(filteredHtml, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Frame-Options": "ALLOWALL",
        "Content-Security-Policy":
          "frame-ancestors 'self' *; default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; img-src * data: blob:; media-src * data: blob:; frame-src *; object-src *",
      },
    });
  } catch (err) {
    console.error("[/api/proxy] error:", err);
    return new NextResponse(
      `<html><body style="background:#0f1412;color:#dfe4e0;font-family:sans-serif;padding:40px;text-align:center"><h2>Erreur de chargement</h2><p>Vérifiez votre connexion et réessayez.</p></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}
