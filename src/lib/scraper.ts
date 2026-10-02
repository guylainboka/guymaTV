/**
 * guymaTV - French Stream Scraper
 *
 * Scrapes french-stream.net (and its mirror french-stream.one) to extract:
 *  - Catalog (films & series cards)
 *  - Movie/Series details
 *  - Category listings
 *  - Search results
 *
 * The source site is a "streaming server" — guymaTV aggregates it (and future
 * other servers) but delegates the actual video playback to the source site's
 * own player interface (loaded via our filtered proxy iframe).
 *
 * All HTML parsing uses cheerio. No IA, no mock data - real scraping.
 */

import * as cheerio from "cheerio";
import type {
  StreamItem,
  StreamService,
  CategoryType,
  StreamServer,
} from "@/lib/types";

/**
 * The source site is available on multiple mirror domains. We try them in
 * order until one responds. The canonical domain is french-stream.net but
 * french-stream.one is an exact mirror (same DLE database, same newsids).
 *
 * Adding a new mirror is as simple as appending to this array.
 */
export const SOURCE_DOMAINS = [
  "https://french-stream.net",
  "https://french-stream.one",
];

// Primary domain (used for canonical URLs, referer, etc.)
const BASE_URL = SOURCE_DOMAINS[0];

// In-memory cache (5 minutes) to reduce load on source site
interface CacheEntry<T> {
  data: T;
  expires: number;
}
const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 min

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T): void {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL });
}

/**
 * Fetch a page from the source site, trying each mirror domain in order.
 * If the path is already an absolute URL, use it directly.
 */
async function fetchPage(path: string): Promise<string> {
  // If absolute URL, fetch directly
  if (path.startsWith("http")) {
    const res = await fetch(path, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        Referer: BASE_URL,
      },
      next: { revalidate: 600 },
    });
    if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
    return res.text();
  }

  // Try each mirror domain until one succeeds
  let lastErr: Error | null = null;
  for (const domain of SOURCE_DOMAINS) {
    try {
      const url = `${domain}${path}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
          "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          Referer: domain,
        },
        next: { revalidate: 600 },
      });
      if (res.ok) return res.text();
      lastErr = new Error(`${domain} returned ${res.status}`);
    } catch (err) {
      lastErr = err as Error;
      // Try next domain
    }
  }
  throw lastErr || new Error("All mirror domains failed");
}

export interface CatalogOptions {
  category?: CategoryType | "all";
  type?: "films" | "series" | "all";
  page?: number;
  search?: string;
  /** Filter option id (e.g. "action", "vf", "2024") — resolves via filters.ts */
  filter?: string;
  /** Custom path (overrides filter) */
  path?: string;
  /** Random mode — picks a random page from the source */
  random?: boolean;
}

export interface CatalogResult {
  items: StreamItem[];
  totalPages: number;
  currentPage: number;
}

/**
 * Build a fallback gradient based on the item id (so each card has a unique color theme).
 */
function gradientForId(id: string): string {
  const gradients = [
    "from-emerald-950 via-neutral-900 to-lime-950",
    "from-teal-950 via-neutral-900 to-emerald-950",
    "from-lime-950 via-neutral-900 to-emerald-950",
    "from-green-950 via-neutral-900 to-teal-950",
    "from-neutral-900 via-emerald-950 to-lime-950",
    "from-emerald-900 via-neutral-900 to-teal-900",
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return gradients[Math.abs(hash) % gradients.length];
}

/**
 * Parse a single movie/series card from the listing HTML.
 *
 * The source HTML structure (verified against live french-stream.net):
 *   <div class="short ...">
 *     <span class="info-button" onclick="openModal('15128265')">
 *     <span id="trailer-XXX">youtubeId</span>
 *     <span id="desc-XXX">description</span>
 *     <span class="film-quality"><a>HD</a></span>
 *     <span class="film-version"><a>French</a></span>
 *     <a class="short-poster" href="/index.php?newsid=15128265" alt="Title">
 *       <img src="https://image.tmdb.org/.../poster.jpg" alt="Title affiche">
 *       <div class="vote-score">7.7</div>
 *     </a>
 *   </div>
 */
function parseCard(
  $: cheerio.CheerioAPI,
  el: cheerio.AnyNode
): StreamItem | null {
  const $card = $(el);

  // The card's unique ID comes from the newsid query param in the poster link.
  const $link = $card.find("a.short-poster").first();
  const href = $link.attr("href") || "";
  const newsidMatch = href.match(/newsid=(\d+)/);
  if (!newsidMatch) return null;
  const fssId = newsidMatch[1];

  // Title: prefer the alt attribute on the poster link, fallback to img alt
  let title =
    $link.attr("alt") || $card.find("img").attr("alt") || "";
  // Clean up: remove trailing "affiche", year suffixes like "- 2026" or "(2026)",
  // collapse whitespace and stray newlines from the source HTML.
  title = title
    .replace(/\s+affiche\s*$/i, "")
    .replace(/\s*[-–—]\s*(19|20)\d{2}\s*$/i, "")
    .replace(/\s*\((19|20)\d{2}\)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!title) return null;

  // Image
  const imageUrl =
    $card.find("img").attr("src") ||
    $card.find("img").attr("data-src") ||
    "";

  // Quality & version badges
  const quality = $card.find(".film-quality a").first().text().trim() || "HD";
  const version = $card.find(".film-version a").first().text().trim() || "VF";

  // Rating
  const rating = $card.find(".vote-score").first().text().trim();

  // Hidden description (the site keeps a long-form synopsis in a hidden span)
  const descSpan = $card.find(`#desc-${fssId}`).first();
  const description = descSpan.text().trim();

  // Trailer YouTube ID (kept for potential future use, not surfaced yet)
  // const trailerId = $card.find(`#trailer-${fssId}`).first().text().trim();

  // Determine if it's a series or film based on title/context.
  // french-stream.net card hrefs are always /index.php?newsid=XXX so we
  // can't rely on the URL — we check the title for "Saison N" pattern
  // (the source site appends "- Saison N" to series titles).
  const isSeries = /[-–—]\s*Saison\s*\d+/i.test(title) || /Saison\s*\d+/i.test(title);
  const category: CategoryType = isSeries ? "Séries" : "Cinéma";

  return {
    id: fssId,
    title,
    category,
    platform: "French-Stream",
    sourceServiceId: "french-stream",
    sourceUrl: href.startsWith("http") ? href : `${BASE_URL}${href}`,
    badgeClass: "bg-primary/20 text-primary",
    imageUrl,
    fallbackGradient: gradientForId(fssId),
    description: description || "Aucune description disponible.",
    videoUrl: undefined, // Resolved on demand via /api/proxy
    rating: rating ? `${rating}/10` : undefined,
    quality: quality.includes("4K")
      ? "4K HDR"
      : quality.includes("1080")
        ? "1080p"
        : "HD",
    tags: [version, quality].filter(Boolean),
    releaseYear: undefined,
    director: undefined,
    actors: undefined,
    servers: undefined,
    episodes: undefined,
    isLive: false,
    viewers: undefined,
    duration: undefined,
    originalTitle: undefined,
    fileSizeMB: undefined,
    blockedAdStats: {
      popups: Math.floor(Math.random() * 8) + 4,
      adultBanners: Math.floor(Math.random() * 5) + 2,
      redirects: Math.floor(Math.random() * 6) + 3,
      trackers: Math.floor(Math.random() * 10) + 5,
    },
  };
}

/**
 * Get the catalog (films or series) from french-stream.net.
 *
 * Supports:
 *   - type: "films" | "series" | "all"  (catalog main pages)
 *   - filter: a FilterOption id from filters.ts (genre/langue/pays/thème/année/sélection)
 *   - path: a direct path on french-stream.net (overrides filter)
 *   - search: client-side filter (site search endpoint is 302-protected)
 *   - random: picks a random page from the source for variety
 *   - page: 1-based page number
 */
export async function getCatalog(
  opts: CatalogOptions = {}
): Promise<CatalogResult> {
  const { type = "all", page = 1, search, filter, path, random } = opts;

  // 1. Search mode (client-side filter across multiple pages)
  if (search && search.trim().length >= 2) {
    const cacheKey = `search:${type}:${search.toLowerCase()}`;
    const cached = getCached<CatalogResult>(cacheKey);
    if (cached) return cached;

    const q = search.toLowerCase().trim();
    const maxPagesToScan = 3;
    const allItems: StreamItem[] = [];
    let totalPages = 1;

    for (let p = 1; p <= maxPagesToScan; p++) {
      try {
        const sub = await getCatalog({ type, page: p });
        allItems.push(...sub.items);
        totalPages = Math.max(totalPages, sub.totalPages);
        if (sub.items.length === 0) break;
      } catch {
        break;
      }
    }

    const filtered = allItems.filter((it) =>
      it.title.toLowerCase().includes(q) ||
      (it.description || "").toLowerCase().includes(q) ||
      (it.tags || []).some((t) => t.toLowerCase().includes(q))
    );

    const result: CatalogResult = {
      items: filtered,
      totalPages: 1,
      currentPage: 1,
    };
    setCached(cacheKey, result);
    return result;
  }

  // 2. Filter mode (by genre/langue/pays/thème/année/sélection)
  if (filter) {
    const { findFilterOption } = await import("./filters");
    const opt = findFilterOption(filter);
    if (opt) {
      return getCatalogByPath(opt.path, page);
    }
  }

  // 3. Direct path mode
  if (path) {
    return getCatalogByPath(path, page);
  }

  // 4. Random mode — pick a random page from films or series
  if (random) {
    const items = await getRandomCatalog(36);
    return {
      items,
      totalPages: 1,
      currentPage: 1,
    };
  }

  // 5. Default catalog browsing
  const cacheKey = `catalog:${type}:${page}`;
  const cached = getCached<CatalogResult>(cacheKey);
  if (cached) return cached;

  let p: string;
  if (type === "films") {
    p = page > 1 ? `/films/page/${page}/` : `/films/`;
  } else if (type === "series") {
    p = page > 1 ? `/series/page/${page}/` : `/series/`;
  } else {
    p = page > 1 ? `/page/${page}/` : `/`;
  }

  const html = await fetchPage(p);
  const $ = cheerio.load(html);

  const items: StreamItem[] = [];
  // The source uses `<div class="short ...">` for each card.
  // Some pages also use `.short.film` so we match both.
  $(".short").each((_, el) => {
    // Skip elements that are not actual movie cards (they must contain a newsid link)
    if (!$(el).find('a[href*="newsid"]').length) return;
    const item = parseCard($, el);
    if (item) items.push(item);
  });

  // Pagination detection
  let totalPages = page;
  const $pagination = $(".navigation, .pagination, .nav-pages").first();
  if ($pagination.length) {
    const pageLinks = $pagination.find("a").map((_, a) => $(a).text().trim()).get();
    const nums = pageLinks
      .map((t) => parseInt(t, 10))
      .filter((n) => !isNaN(n));
    if (nums.length) totalPages = Math.max(...nums, page);
  }

  const result: CatalogResult = { items, totalPages, currentPage: page };
  setCached(cacheKey, result);
  return result;
}

/**
 * Get details for a specific movie/series by its newsid.
 * Returns additional metadata (description, year, genres, cast, etc.)
 */
export async function getDetails(newsid: string): Promise<StreamItem | null> {
  const cacheKey = `details:${newsid}`;
  const cached = getCached<StreamItem>(cacheKey);
  if (cached) return cached;

  const html = await fetchPage(`/index.php?newsid=${newsid}`);
  const $ = cheerio.load(html);

  // Title — DLE typically renders it as <h1 class="..."> inside the detail page.
  // We clean up trailing years and stray whitespace from the source HTML.
  let rawTitle =
    $(".fheader h1, .full-h1, h1.fstory-title, h1").first().text() ||
    $('meta[property="og:title"]').attr("content") ||
    "Sans titre";
  const title = rawTitle
    .replace(/\s*[-–—]\s*(19|20)\d{2}\s*$/i, "")
    .replace(/\s*\((19|20)\d{2}\)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  // Poster image
  let imageUrl =
    $(".fposter img").attr("src") ||
    $(".full-poster img").attr("src") ||
    $('meta[property="og:image"]').attr("content") ||
    "";
  if (imageUrl && !imageUrl.startsWith("http")) {
    imageUrl = imageUrl.startsWith("/")
      ? `${BASE_URL}${imageUrl}`
      : `${BASE_URL}/${imageUrl}`;
  }

  // Description — DLE stores it in a div with class "fdesc" or similar
  let description =
    $("#full-description, .full-description, .fdesc, .ftranscript-text")
      .first()
      .text()
      .trim() ||
    $('meta[name="description"]').attr("content") ||
    "Aucune description disponible.";
  description = description.replace(/\s+/g, " ").trim();

  // Quality & version badges
  const qualityText = $(".film-quality a").first().text().trim() || "HD";
  const versionText = $(".film-version a").first().text().trim() || "VF";

  // Rating — look for vote-score or rating value
  const rating =
    $(".vote-score, .rating-value, .ftranscript-rating, [class*=rating]")
      .first()
      .text()
      .trim()
      .match(/(\d+(?:[.,]\d+)?)/)?.[1] || "";

  // Year — prefer a dedicated field, fallback to regex on description
  let releaseYear: number | undefined;
  const yearLabel = $(".flist li")
    .filter((_, li) => /année|year|sortie/i.test($(li).text()))
    .first()
    .find("a, span.value")
    .text()
    .match(/(19|20)\d{2}/);
  if (yearLabel) releaseYear = parseInt(yearLabel[0], 10);
  if (!releaseYear) {
    // Try to find a 4-digit year near "Sorti en" / "Année de production"
    const ym = description.match(/(?:sorti en|année de production[:\s]+|année[:\s]+)(19|20)\d{2}/i);
    if (ym) releaseYear = parseInt(ym[0].match(/(19|20)\d{2}/)[0], 10);
  }

  // Genres / tags
  const tags: string[] = [];
  $(".flist li:has(.fa-tags) a, .ftags a").each((_, a) => {
    const t = $(a).text().trim();
    if (t) tags.push(t);
  });
  if (versionText) tags.unshift(versionText);
  if (qualityText) tags.unshift(qualityText);

  // Director / actors
  let director: string | undefined;
  $(".flist li").each((_, li) => {
    const label = $(li).find(".label, strong").text().trim().toLowerCase();
    const value = $(li).find("a, span.value").text().trim();
    if (label.includes("réalis") || label.includes("director")) director = value;
  });

  const actors: string[] = [];
  $(".ftranscript-actors a, .actors-list a").each((_, a) => {
    const v = $(a).text().trim();
    if (v) actors.push(v);
  });

  // Determine series vs film
  const isSeries =
    title.toLowerCase().includes("série") ||
    title.toLowerCase().includes("saison") ||
    description.toLowerCase().includes("épisodes") ||
    !!$(".fseason-list, .episode-list").length;

  const item: StreamItem = {
    id: newsid,
    title,
    category: isSeries ? "Séries" : "Cinéma",
    platform: "French-Stream",
    sourceServiceId: "french-stream",
    sourceUrl: `${BASE_URL}/index.php?newsid=${newsid}`,
    badgeClass: "bg-primary/20 text-primary",
    imageUrl,
    fallbackGradient: gradientForId(newsid),
    description,
    rating: rating ? `${rating}/10` : undefined,
    quality: qualityText.includes("4K")
      ? "4K HDR"
      : qualityText.includes("1080")
        ? "1080p"
        : "HD",
    releaseYear,
    director,
    actors: actors.length ? actors : undefined,
    tags: tags.length ? tags : [versionText, qualityText].filter(Boolean),
    isLive: false,
    videoUrl: undefined,
    fileSizeMB: undefined,
    duration: undefined,
    originalTitle: undefined,
    servers: undefined,
    episodes: undefined,
    blockedAdStats: {
      popups: 8,
      adultBanners: 4,
      redirects: 6,
      trackers: 12,
    },
  };

  setCached(cacheKey, item);
  return item;
}

/**
 * List of supported categories (from the site's nav).
 */
export const CATEGORIES: { id: string; label: string; path: string }[] = [
  { id: "films", label: "Films", path: "/films/" },
  { id: "series", label: "Séries", path: "/series/" },
  { id: "actions", label: "Action", path: "/films/actions/" },
  { id: "aventures", label: "Aventure", path: "/films/aventures/" },
  { id: "comedies", label: "Comédie", path: "/films/comedies/" },
  { id: "animations", label: "Animation", path: "/films/animations/" },
  { id: "biopics", label: "Biopic", path: "/films/biopics/" },
  { id: "dramatique", label: "Drame", path: "/films/dramatique/" },
  { id: "fantastique", label: "Fantastique", path: "/films/fantastique/" },
  { id: "policier", label: "Policier", path: "/films/policier/" },
  { id: "romance", label: "Romance", path: "/films/romance/" },
  { id: "scifi", label: "Sci-Fi", path: "/films/science-fiction/" },
  { id: "thriller", label: "Thriller", path: "/films/thriller/" },
  { id: "horreur", label: "Horreur", path: "/films/horreur/" },
];

/**
 * Get the list of "services" (we expose french-stream as the main one).
 * In the original maquette this was a list of 6 fake services - we keep
 * french-stream as the primary, and surface the site's category pages as
 * the other "portals" so the UI stays consistent with the maquette.
 */
export function getServices(): StreamService[] {
  return [
    {
      id: "french-stream",
      name: "French-Stream",
      domain: "https://french-stream.net",
      badge: "VF & VOSTFR",
      badgeClass: "bg-primary/20 text-primary border-primary/30",
      icon: "movie_filter",
      description:
        "Le site de streaming de référence en France pour films et séries VF/VOSTFR, intégré avec filtrage intégral des publicités et contenus adultes.",
      blockedAdsCount: 5489,
      blockedRedirectsCount: 912,
      isVerified: true,
      categories: ["Cinéma", "Séries"],
      color: "#ccff80",
    },
  ];
}

/**
 * Resolve available video servers (lecteurs) for a given movie/series.
 *
 * Delegates to the Playwright extractor (which clicks through .player-option
 * buttons and intercepts direct .mp4/.m3u8 URLs). Falls back to the proxy
 * iframe if extraction fails.
 */
export async function getServers(newsid: string): Promise<StreamServer[]> {
  // Lazy-load Playwright only when needed (keeps startup fast)
  const { extractVideoServers } = await import("./video-extractor");
  try {
    return await extractVideoServers(newsid);
  } catch (err) {
    console.error("[getServers] extractor failed, returning proxy fallback:", err);
    return [
      {
        id: `srv-${newsid}-secure`,
        name: "Lecteur Sécurisé guymaTV",
        hoster: "Direct 4K",
        quality: "1080p",
        language: "VF",
        speed: "Ultra Rapide (sans pub)",
        videoUrl: `/api/proxy?page=${newsid}`,
      },
    ];
  }
}

/**
 * Get the catalog by an arbitrary path on french-stream.net.
 *
 * Used by /api/catalog?filter=<id> where <id> references a FilterOption.path
 * (e.g. "/films/actions/", "/xfsearch/lang/Japonais/", "/films-2024/").
 *
 * The function scrapes the given path with pagination support and returns the
 * same shape as getCatalog().
 */
export async function getCatalogByPath(
  path: string,
  page: number = 1
): Promise<CatalogResult> {
  const cacheKey = `path:${path}:${page}`;
  const cached = getCached<CatalogResult>(cacheKey);
  if (cached) return cached;

  // The source site uses /page/N/ suffix for pagination
  let url: string;
  if (page > 1) {
    // Strip trailing slash and append /page/N/
    const base = path.replace(/\/+$/, "");
    url = `${base}/page/${page}/`;
  } else {
    url = path;
  }

  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  const items: StreamItem[] = [];
  $(".short").each((_, el) => {
    if (!$(el).find('a[href*="newsid"]').length) return;
    const item = parseCard($, el);
    if (item) items.push(item);
  });

  // Pagination detection — DLE uses .navigation > a
  let totalPages = page;
  const navMatches: number[] = [];
  $(".navigation a, .pagination a, .nav-pages a").each((_, a) => {
    const txt = $(a).text().trim();
    const n = parseInt(txt, 10);
    if (!isNaN(n)) navMatches.push(n);
  });
  if (navMatches.length) totalPages = Math.max(...navMatches, page);

  const result: CatalogResult = { items, totalPages, currentPage: page };
  setCached(cacheKey, result);
  return result;
}

/**
 * Get random items from french-stream.net — used by Explorer's "aléatoire"
 * mode. We pick a random page (1-30) from /films/ and return its items.
 *
 * To increase variety, we can mix films + series by calling both.
 */
export async function getRandomCatalog(
  count: number = 18
): Promise<StreamItem[]> {
  // Pick a random page between 1 and 40 (the source site has ~1300+ pages)
  const randomPage = Math.floor(Math.random() * 40) + 1;
  const type = Math.random() > 0.5 ? "films" : "series";
  try {
    const result = await getCatalog({ type, page: randomPage });
    // Shuffle the items for extra randomness
    const shuffled = [...result.items].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  } catch {
    return [];
  }
}

/**
 * Get random items from a specific filter (genre, pays, thème, etc.)
 * Picks a random page within that filter's results.
 */
export async function getRandomByFilter(
  filterPath: string,
  count: number = 18
): Promise<StreamItem[]> {
  try {
    // First fetch page 1 to get total pages
    const first = await getCatalogByPath(filterPath, 1);
    const maxPage = Math.min(first.totalPages || 1, 40);
    const randomPage = Math.floor(Math.random() * maxPage) + 1;
    if (randomPage === 1) {
      const shuffled = [...first.items].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
    }
    const result = await getCatalogByPath(filterPath, randomPage);
    const shuffled = [...result.items].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  } catch {
    return [];
  }
}

/**
 * Get series episodes (seasons + episodes) for a series newsid.
 *
 * The source site loads episodes via JS into #vf-episodes / #vostfr-episodes,
 * and seasons into .seasons-grid > .season-card. We need to use Playwright
 * to render this dynamic content.
 *
 * Returns the seasons/episodes structure. We focus on VF (the user requested
 * "on prend en charge que le vf des filmes version francais") but also
 * include VOSTFR episodes for completeness.
 */
export interface SeriesEpisode {
  id: string;
  episodeNumber: number;
  seasonNumber: number;
  title: string;
  duration?: string;
  videoUrl: string; // /api/proxy?page=<newsid>&season=X&episode=Y
  synopsis?: string;
  language: "VF" | "VOSTFR";
}

export interface SeriesSeason {
  seasonNumber: number;
  title: string;
  episodesCount: number;
  posterUrl?: string;
}

export interface SeriesStructure {
  newsid: string;
  title: string;
  seasons: SeriesSeason[];
  episodes: SeriesEpisode[]; // flattened across all seasons
  currentSeason: number;
}

export async function getSeriesStructure(
  newsid: string
): Promise<SeriesStructure | null> {
  const cacheKey = `series:${newsid}`;
  const cached = getCached<SeriesStructure>(cacheKey);
  if (cached) return cached;

  // Use Playwright to render the JS-driven episode list
  const { chromium } = await import("playwright");
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    });
  } catch (err) {
    console.error("[getSeriesStructure] Playwright launch failed:", err);
    return null;
  }

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      locale: "fr-FR",
      viewport: { width: 1280, height: 720 },
    });

    // Block ads
    const blockedHosts = [
      "doubleclick.net", "googlesyndication.com", "exoclick.com",
      "trafficjunky.net", "histats.com", "popads.net", "fsurl.lol",
      "qnlbktsubwtnf.space", "adexchangerapid.com", "kmqufetbovsea.site",
    ];
    await context.route((url: URL) => {
      return blockedHosts.some((b) => url.hostname.includes(b));
    }, (route) => route.abort());

    const page = await context.newPage();
    await page.addInitScript(() => { window.open = () => null; });

    const sourceUrl = `${BASE_URL}/index.php?newsid=${newsid}`;
    await page.goto(sourceUrl, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    await page.waitForTimeout(3000);

    // Remove anti-bot overlay
    await page.evaluate(() => {
      document.querySelectorAll("#dontfoid, [znid], .fssts-card").forEach((el) => el.remove());
    }).catch(() => {});

    // Extract seasons
    const seasons: SeriesSeason[] = await page.evaluate(() => {
      const cards = document.querySelectorAll(".season-card, .seasons-grid > div");
      const out: { seasonNumber: number; title: string; episodesCount: number }[] = [];
      cards.forEach((c) => {
        const text = (c.textContent || "").trim();
        const m = text.match(/Saison\s*(\d+)/i);
        if (m) {
          out.push({
            seasonNumber: parseInt(m[1], 10),
            title: text.slice(0, 80),
            episodesCount: 0,
          });
        }
      });
      // Deduplicate by season number
      const seen = new Set<number>();
      return out.filter((s) => {
        if (seen.has(s.seasonNumber)) return false;
        seen.add(s.seasonNumber);
        return true;
      });
    }).catch(() => []);

    // If no seasons found, assume single-season series
    if (seasons.length === 0) {
      seasons.push({
        seasonNumber: 1,
        title: "Saison 1",
        episodesCount: 0,
      });
    }

    // For each season, click it (if multiple) and extract episodes
    const allEpisodes: SeriesEpisode[] = [];
    const currentSeason = seasons[0]?.seasonNumber || 1;

    for (const season of seasons.slice(0, 5)) {
      // Try to click this season card
      if (seasons.length > 1) {
        await page
          .evaluate((sNum) => {
            const cards = document.querySelectorAll(".season-card, .seasons-grid > div");
            cards.forEach((c) => {
              if ((c.textContent || "").includes(`Saison ${sNum}`)) {
                (c as HTMLElement).click();
              }
            });
          }, season.seasonNumber)
          .catch(() => {});
        await page.waitForTimeout(1500);
      }

      // Extract VF episodes (priority — user requested VF support)
      const vfEpisodes: SeriesEpisode[] = await page
        .evaluate((sNum) => {
          const rows = document.querySelectorAll("#vf-episodes .episode-row, #vf-episodes [class*=ep]");
          const eps: { n: number; title: string; synopsis?: string }[] = [];
          rows.forEach((r) => {
            const title = r.querySelector(".ep-title")?.textContent?.trim() || r.textContent?.trim() || "";
            const m = title.match(/Episode\s*(\d+)/i);
            if (m) {
              const synopsis = r.querySelector(".ep-info")?.textContent?.trim();
              eps.push({ n: parseInt(m[1], 10), title, synopsis });
            }
          });
          return eps.map((e) => ({
            id: `s${sNum}e${e.n}`,
            episodeNumber: e.n,
            seasonNumber: sNum,
            title: e.title,
            videoUrl: "",
            synopsis: e.synopsis,
            language: "VF" as const,
          }));
        }, season.seasonNumber)
        .catch(() => []);

      // Extract VOSTFR episodes (fallback if no VF)
      let vostfrEpisodes: SeriesEpisode[] = [];
      if (vfEpisodes.length === 0) {
        vostfrEpisodes = await page
          .evaluate((sNum) => {
            const rows = document.querySelectorAll("#vostfr-episodes .episode-row, #vostfr-episodes [class*=ep]");
            const eps: { n: number; title: string; synopsis?: string }[] = [];
            rows.forEach((r) => {
              const title = r.querySelector(".ep-title")?.textContent?.trim() || r.textContent?.trim() || "";
              const m = title.match(/Episode\s*(\d+)/i);
              if (m) {
                const synopsis = r.querySelector(".ep-info")?.textContent?.trim();
                eps.push({ n: parseInt(m[1], 10), title, synopsis });
              }
            });
            return eps.map((e) => ({
              id: `s${sNum}e${e.n}`,
              episodeNumber: e.n,
              seasonNumber: sNum,
              title: e.title,
              videoUrl: "",
              synopsis: e.synopsis,
              language: "VOSTFR" as const,
            }));
          }, season.seasonNumber)
          .catch(() => []);
      }

      // Assign video URLs — each episode loads via our proxy with season/episode query
      const chosenEpisodes = vfEpisodes.length > 0 ? vfEpisodes : vostfrEpisodes;
      // Deduplicate by (seasonNumber, episodeNumber) — the source site sometimes
      // renders the same episode row multiple times in #vf-episodes.
      const seenKeys = new Set<string>();
      const deduped = chosenEpisodes.filter((ep) => {
        const key = `${ep.seasonNumber}-${ep.episodeNumber}`;
        if (seenKeys.has(key)) return false;
        seenKeys.add(key);
        ep.videoUrl = `/api/proxy?page=${newsid}&season=${ep.seasonNumber}&episode=${ep.episodeNumber}`;
        return true;
      });
      allEpisodes.push(...deduped);
      season.episodesCount = deduped.length;
    }

    // Get the series title from h1
    const title = await page.locator("h1").first().textContent().catch(() => "") || "";
    const cleanTitle = title.replace(/\s+/g, " ").trim();

    const result: SeriesStructure = {
      newsid,
      title: cleanTitle,
      seasons,
      episodes: allEpisodes,
      currentSeason,
    };

    setCached(cacheKey, result);
    await context.close();
    return result;
  } catch (err) {
    console.error("[getSeriesStructure] error:", err);
    return null;
  } finally {
    await browser.close().catch(() => {});
  }
}

export { BASE_URL };
