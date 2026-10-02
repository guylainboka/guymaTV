/**
 * guymaTV - Legal Streaming Platforms (Bridge)
 *
 * guymaTV acts as a "bridge" or "gateway" to legal free streaming platforms.
 * The user clicks a platform tile → guymaTV loads it in an iframe via our
 * /api/bridge proxy (which strips X-Frame-Options so the iframe can embed it).
 *
 * guymaTV keeps ONLY:
 *   - Its header (logo, navigation, search)
 *   - Its footer (CGU, mentions)
 *   - A floating "close" button to return to the catalog
 *
 * Everything else is the REAL platform's interface (France.tv, Arte, Pluto TV,
 * etc.) — we don't modify their content, just proxy it without the X-Frame
 * restriction.
 *
 * All platforms listed here are 100% LEGAL and FREE (ad-supported or public).
 * Source: journaldugeek.com "10 sites de streaming gratuits et légaux"
 */

export interface BridgePlatform {
  /** Unique id */
  id: string;
  /** Display name */
  name: string;
  /** Platform URL (the page that will be loaded in the iframe) */
  url: string;
  /** Material Symbols icon name */
  icon: string;
  /** Short description */
  description: string;
  /** Category for grouping */
  category: "tv-replay" | "live-tv" | "vod" | "anime" | "docs" | "sport";
  /** Accent color (hex) */
  color: string;
  /** Whether the platform sends X-Frame-Options (needs our proxy) */
  needsProxy: boolean;
  /** Logo URL (optional, for the tile) */
  logoUrl?: string;
}

/**
 * Registry of all legal free streaming platforms.
 *
 * Sources: journaldugeek.com, manual verification of X-Frame-Options headers.
 */
export const BRIDGE_PLATFORMS: BridgePlatform[] = [
  // === TV Replay (chaînes françaises) ===
  {
    id: "france-tv",
    name: "France.tv",
    url: "https://www.france.tv/",
    icon: "live_tv",
    description: "Replay et direct de France 2, France 3, France 5, Arte, LCP et plus. Gratuits et légaux.",
    category: "tv-replay",
    color: "#0066ff",
    needsProxy: true,
  },
  {
    id: "arte",
    name: "Arte.tv",
    url: "https://www.arte.tv/fr/",
    icon: "palette",
    description: "La chaîne culturelle européenne. Films, séries, documentaires d'auteur en HD, sans pub.",
    category: "tv-replay",
    color: "#fa5b46",
    needsProxy: true,
  },
  {
    id: "tf1",
    name: "TF1+",
    url: "https://www.tf1.fr/",
    icon: "tv_gen",
    description: "Replay et direct de TF1, TMC, TFX, LCI. Films, séries, infos et divertissement.",
    category: "tv-replay",
    color: "#e2001a",
    needsProxy: true,
  },
  {
    id: "m6",
    name: "M6+ (6play)",
    url: "https://www.6play.fr/",
    icon: "tv_gen",
    description: "Replay et direct de M6, W9, 6ter, Gulli. Films, séries, réalité TV.",
    category: "tv-replay",
    color: "#00b25f",
    needsProxy: true,
  },
  {
    id: "tv5monde",
    name: "TV5Monde Plus",
    url: "https://www.tv5mondeplus.com/",
    icon: "public",
    description: "Programmes francophones du monde entier. Films, séries, documentaires en VF.",
    category: "tv-replay",
    color: "#0099cc",
    needsProxy: true,
  },
  {
    id: "okoo",
    name: "Okoo (France TV Sport)",
    url: "https://okoo.fr/",
    icon: "sports",
    description: "Sport en direct et replay. Jeux Olympiques, football, rugby, tennis et plus.",
    category: "sport",
    color: "#ff6b35",
    needsProxy: true,
  },

  // === Live TV (gratuit avec pubs) ===
  {
    id: "pluto-tv",
    name: "Pluto TV",
    url: "https://pluto.tv/fr/live-tv",
    icon: "live_tv",
    description: "100+ chaînes TV en direct gratuites. Films, séries, news, musique, sans inscription.",
    category: "live-tv",
    color: "#ffe014",
    needsProxy: false,
  },
  {
    id: "samsung-tv-plus",
    name: "Samsung TV Plus",
    url: "https://www.samsungtvplus.com/fr",
    icon: "tv",
    description: "Chaînes TV en direct gratuites. Films, séries, documentaires, pas d'inscription requise.",
    category: "live-tv",
    color: "#1428a0",
    needsProxy: true,
  },
  {
    id: "molotov",
    name: "Molotov TV",
    url: "https://www.molotov.tv/",
    icon: "tv_gen",
    description: "Télé en direct et replay. TF1, France 2, M6, Canal+ et plus, gratuit avec inscription.",
    category: "live-tv",
    color: "#ffcc00",
    needsProxy: true,
  },

  // === VOD gratuite ===
  {
    id: "youtube",
    name: "YouTube Movies",
    url: "https://www.youtube.com/feed/movies",
    icon: "smart_display",
    description: "Films gratuits avec pubs sur YouTube. Grand catalogue de classiques et nouveautés.",
    category: "vod",
    color: "#ff0000",
    needsProxy: true,
  },
  {
    id: "plex",
    name: "Plex TV",
    url: "https://www.plex.tv/watch-free/",
    icon: "movie",
    description: "50 000+ films et séries gratuits avec pubs. Pas d'inscription requise pour regarder.",
    category: "vod",
    color: "#e5a00d",
    needsProxy: true,
  },
  {
    id: "rakuten",
    name: "Rakuten TV",
    url: "https://www.rakuten.tv/fr/movies/free",
    icon: "theaters",
    description: "Films gratuits avec pubs. Sélection variée de classiques et films récents.",
    category: "vod",
    color: "#bf0000",
    needsProxy: true,
  },

  // === Anime ===
  {
    id: "crunchyroll",
    name: "Crunchyroll (gratuit)",
    url: "https://www.crunchyroll.com/fr/videos/popular",
    icon: "animation",
    description: "Animés japonais en VOSTFR. Version gratuite avec pubs, inscription requise.",
    category: "anime",
    color: "#f47521",
    needsProxy: true,
  },

  // === Documentaires ===
  {
    id: "wikiflix",
    name: "Wikiflix",
    url: "https://wikiflix.toolforge.org/",
    icon: "school",
    description: "Films du domaine public hébergés sur Wikimedia Commons. 100% gratuit et légal.",
    category: "docs",
    color: "#006699",
    needsProxy: true,
  },
];

/**
 * Get platforms by category.
 */
export function getPlatformsByCategory(category: BridgePlatform["category"]): BridgePlatform[] {
  return BRIDGE_PLATFORMS.filter((p) => p.category === category);
}

/**
 * Get a platform by id.
 */
export function getPlatform(id: string): BridgePlatform | null {
  return BRIDGE_PLATFORMS.find((p) => p.id === id) || null;
}

/**
 * Category labels (French).
 */
export const CATEGORY_LABELS: Record<BridgePlatform["category"], { label: string; icon: string }> = {
  "tv-replay": { label: "TV Replay (chaînes françaises)", icon: "live_tv" },
  "live-tv": { label: "TV en Direct", icon: "tv" },
  "vod": { label: "Films & Séries à la demande", icon: "movie" },
  "anime": { label: "Animés", icon: "animation" },
  "docs": { label: "Documentaires & Classiques", icon: "school" },
  "sport": { label: "Sport", icon: "sports" },
};
