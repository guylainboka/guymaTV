/**
 * guymaTV - Streaming Server Abstraction
 *
 * A "StreamingServer" is an external streaming site that guymaTV aggregates.
 * Each server provides:
 *   - A catalog of movies/series (scraped via scraper.ts)
 *   - A search endpoint
 *   - A native player interface (loaded via /api/proxy iframe)
 *
 * guymaTV's role:
 *   - Aggregate multiple servers into a single UI
 *   - Provide favorites, downloads, comments (own database)
 *   - Filter ads/popups via the proxy
 *   - Let the SERVER's native player handle the actual video playback
 *
 * Currently registered servers:
 *   1. French-Stream (french-stream.net + french-stream.one mirror)
 *
 * Future servers to integrate:
 *   - Wiflix
 *   - Empire Streaming
 *   - CPasMieux
 *   - Anime-Sama
 *   - StreamComplet
 */

export interface StreamingServer {
  /** Unique id (used in API URLs and favorites) */
  id: string;
  /** Display name */
  name: string;
  /** Primary domain */
  domain: string;
  /** Mirror domains (tried in order if primary is down) */
  mirrors: string[];
  /** Badge text shown in UI */
  badge: string;
  /** Material Symbols icon name */
  icon: string;
  /** Short description */
  description: string;
  /** Whether this server is currently enabled/active */
  enabled: boolean;
  /** Accent color (hex) */
  color: string;
  /** Categories available on this server */
  categories: string[];
}

/**
 * Registry of all streaming servers integrated into guymaTV.
 *
 * To add a new server:
 *   1. Add an entry here
 *   2. Create a scraper module in src/lib/servers/<id>.ts
 *   3. Wire it into the catalog/details API routes
 */
export const STREAMING_SERVERS: StreamingServer[] = [
  {
    id: "french-stream",
    name: "French-Stream",
    domain: "https://french-stream.net",
    mirrors: ["https://french-stream.net", "https://french-stream.one"],
    badge: "VF & VOSTFR",
    icon: "movie_filter",
    description:
      "Le site de streaming de référence en France pour films et séries VF/VOSTFR. Catalogue complet avec filtrage intégral des publicités et contenus adultes.",
    enabled: true,
    color: "#ccff80",
    categories: ["Cinéma", "Séries", "Animés"],
  },
  // Future servers (placeholders — not yet implemented):
  // {
  //   id: "wiflix",
  //   name: "Wiflix HD",
  //   domain: "https://wiflix.voto",
  //   mirrors: ["https://wiflix.voto"],
  //   badge: "Films Récents",
  //   icon: "local_movies",
  //   description: "Exclusivités cinéma et séries haute définition.",
  //   enabled: false,
  //   color: "#4edea3",
  //   categories: ["Cinéma", "Séries", "Sports"],
  // },
];

/**
 * Get a server by id.
 */
export function getServer(id: string): StreamingServer | null {
  return STREAMING_SERVERS.find((s) => s.id === id) || null;
}

/**
 * Get all enabled servers.
 */
export function getEnabledServers(): StreamingServer[] {
  return STREAMING_SERVERS.filter((s) => s.enabled);
}
