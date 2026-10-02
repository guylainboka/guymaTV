/**
 * guymaTV - French Stream Filters Definition
 *
 * Mirrors the full filter system of french-stream.net so users can browse
 * the catalog EXACTLY like on the source site (by genre, language, country,
 * theme, year, selections). The URLs are the real paths from the source site.
 *
 * Used by:
 *   - /api/filters        → returns this catalog of filters
 *   - /api/catalog        → accepts ?filter=<id> to scrape the corresponding page
 *   - ExplorerScreen.tsx  → renders the filter UI
 */

export interface FilterOption {
  id: string;
  label: string;
  /** Path on french-stream.net (relative to BASE_URL) */
  path: string;
  /** Optional icon name (Material Symbols Outlined) for the UI */
  icon?: string;
}

export interface FilterGroup {
  id: string;
  label: string;
  icon: string;
  options: FilterOption[];
}

/**
 * Filtres "Par Genre" — /films/<slug>/ or /<slug>/ for some
 */
const GENRES: FilterOption[] = [
  { id: "action", label: "Action", path: "/films/actions/", icon: "sports_mma" },
  { id: "aventure", label: "Aventure", path: "/films/aventures/", icon: "explore" },
  { id: "animation", label: "Animation", path: "/films/animations/", icon: "animation" },
  { id: "arts-martiaux", label: "Arts Martiaux", path: "/art-martiaux/", icon: "sports_kabaddi" },
  { id: "biopic", label: "Biopic", path: "/films/biopics/", icon: "person" },
  { id: "comedie", label: "Comédie", path: "/films/comedies/", icon: "theater_comedy" },
  { id: "drame", label: "Drame", path: "/films/drames/", icon: "theater_comedy" },
  { id: "documentaire", label: "Documentaire", path: "/films/documentaires/", icon: "video_camera_front" },
  { id: "horreur", label: "Horreur", path: "/films/epouvante-horreurs/", icon: "ghost" },
  { id: "historique", label: "Historique", path: "/films/historiques/", icon: "landmark" },
  { id: "espionnage", label: "Espionnage", path: "/films/espionnages/", icon: "person_search" },
  { id: "famille", label: "Famille", path: "/films/familles/", icon: "family_restroom" },
  { id: "fantastique", label: "Fantastique", path: "/films/fantastiques/", icon: "auto_awesome" },
  { id: "guerre", label: "Guerre", path: "/films/guerres/", icon: "military_tech" },
  { id: "policier", label: "Policier", path: "/films/policiers/", icon: "local_police" },
  { id: "romance", label: "Romance", path: "/films/romances/", icon: "favorite" },
  { id: "scifi", label: "Science Fiction", path: "/films/science-fictions/", icon: "rocket_launch" },
  { id: "thriller", label: "Thriller", path: "/films/thrillers/", icon: "visibility" },
  { id: "western", label: "Western", path: "/films/westerns/", icon: "agriculture" },
];

/**
 * Filtres "Par Langue"
 */
const LANGUES: FilterOption[] = [
  { id: "all-films", label: "Tous les Films", path: "/films/", icon: "movie" },
  { id: "vf", label: "Films avec VF", path: "/films/vf/", icon: "volume_up" },
  { id: "vostfr", label: "Avec VOSTFR", path: "/xfsearch/version-film/VOSTFR/", icon: "closed_caption" },
];

/**
 * Filtres "Films par Pays"
 */
const PAYS: FilterOption[] = [
  { id: "anglais", label: "Anglophones", path: "/xfsearch/lang/Anglais/", icon: "public" },
  { id: "francais", label: "Français", path: "/xfsearch/lang/Français/", icon: "flag" },
  { id: "espagnol", label: "Espagnols", path: "/xfsearch/lang/Espagnol/", icon: "flag" },
  { id: "japonais", label: "Japonais", path: "/xfsearch/lang/Japonais/", icon: "flag" },
  { id: "allemand", label: "Allemands", path: "/xfsearch/lang/Allemand/", icon: "flag" },
  { id: "italien", label: "Italiens", path: "/xfsearch/lang/Italien/", icon: "flag" },
  { id: "coreen", label: "Coréens", path: "/xfsearch/lang/Coréen/", icon: "flag" },
  { id: "chinois", label: "Chinois", path: "/xfsearch/lang/Chinois/", icon: "flag" },
  { id: "russe", label: "Russes", path: "/xfsearch/lang/Russe/", icon: "flag" },
  { id: "neerlandais", label: "Néerlandais", path: "/xfsearch/lang/Néerlandais/", icon: "flag" },
  { id: "norvegien", label: "Norvégiens", path: "/xfsearch/lang/Norvégien/", icon: "flag" },
  { id: "portugais", label: "Portugais", path: "/xfsearch/lang/Portugais/", icon: "flag" },
  { id: "danois", label: "Danois", path: "/xfsearch/lang/Danois/", icon: "flag" },
  { id: "polonais", label: "Polonais", path: "/xfsearch/lang/Polonais/", icon: "flag" },
  { id: "hindi", label: "Indiens", path: "/xfsearch/lang/Hindi/", icon: "flag" },
  { id: "suedois", label: "Suédois", path: "/xfsearch/lang/Suédois/", icon: "flag" },
  { id: "thai", label: "Thaïlandais", path: "/xfsearch/lang/Thaï/", icon: "flag" },
  { id: "turc", label: "Turcs", path: "/xfsearch/lang/Turc/", icon: "flag" },
  { id: "arabe", label: "Arabes", path: "/xfsearch/lang/Arabe/", icon: "flag" },
];

/**
 * Filtres "Par Thème"
 */
const THEMES: FilterOption[] = [
  { id: "aliens", label: "Aliens", path: "/xfsearch/ftagz/alien/", icon: "rocket" },
  { id: "ai", label: "Intelligence Artificielle", path: "/xfsearch/ftagz/artificial+intelligence+%28a.i.%29/", icon: "smart_toy" },
  { id: "autisme", label: "Autisme", path: "/xfsearch/ftagz/autism/", icon: "psychology" },
  { id: "true-story", label: "Inspiré d'une histoire vraie", path: "/xfsearch/ftagz/based+on+true+story/", icon: "history_edu" },
  { id: "coming-of-age", label: "Passage à l'âge adulte", path: "/xfsearch/ftagz/coming+of+age/", icon: "cake" },
  { id: "drug", label: "Trafic de drogue", path: "/xfsearch/ftagz/drug+trafficking/", icon: "medication" },
  { id: "disaster", label: "Catastrophe", path: "/xfsearch/ftagz/disaster/", icon: "storm" },
  { id: "dystopia", label: "Dystopie", path: "/xfsearch/ftagz/dystopia/", icon: "location_city" },
  { id: "friendship", label: "Amitié", path: "/xfsearch/ftagz/friendship/", icon: "handshake" },
  { id: "heist", label: "Braquage", path: "/xfsearch/ftagz/heist/", icon: "masks" },
  { id: "secret-agent", label: "Espionnage", path: "/xfsearch/ftagz/secret+agent/", icon: "person_search" },
  { id: "lgbt", label: "LGBT", path: "/xfsearch/ftagz/lgbt/", icon: "rainbow" },
  { id: "martial", label: "La Bagarre", path: "/xfsearch/ftagz/martial+arts/", icon: "sports_mma" },
  { id: "haunted", label: "Maison hantée", path: "/xfsearch/ftagz/haunted+house/", icon: "house" },
  { id: "love", label: "Romance", path: "/xfsearch/ftagz/love/", icon: "favorite" },
  { id: "love-triangle", label: "Triangle amoureux", path: "/xfsearch/ftagz/love+triangle/", icon: "heart_broken" },
  { id: "religion", label: "Religion", path: "/xfsearch/ftagz/religion/", icon: "church" },
  { id: "revenge", label: "Vengeance", path: "/xfsearch/ftagz/revenge/", icon: "gavel" },
  { id: "serial-killer", label: "Tueur en série", path: "/xfsearch/ftagz/serial+killer/", icon: "person_search" },
  { id: "slasher", label: "Slasher", path: "/xfsearch/ftagz/slasher/", icon: "cut" },
  { id: "space-travel", label: "Voyage spatial", path: "/xfsearch/ftagz/space+travel/", icon: "rocket" },
  { id: "superhero", label: "Super-héros", path: "/xfsearch/ftagz/superhero/", icon: "shield" },
  { id: "survival", label: "Survie", path: "/xfsearch/ftagz/survival/", icon: "emergency" },
  { id: "time-loop", label: "Boucle temporelle", path: "/xfsearch/ftagz/time+loop/", icon: "sync" },
  { id: "time-travel", label: "Voyage temporel", path: "/xfsearch/ftagz/time%20travel/", icon: "schedule" },
  { id: "vampire", label: "Vampires", path: "/xfsearch/ftagz/vampire/", icon: "bedtime" },
  { id: "zombie", label: "Zombies", path: "/xfsearch/ftagz/zombie/", icon: "dangerous" },
];

/**
 * Filtres "Sélections"
 */
const SELECTIONS: FilterOption[] = [
  { id: "moment", label: "Les Films du moment", path: "/films-du-moment/", icon: "trending_up" },
  { id: "selection", label: "Notre sélection", path: "/notre-selection/", icon: "star" },
];

/**
 * Filtres "Par Année" — dynamic list, plus a custom year input
 */
const YEARS: FilterOption[] = [
  { id: "2026", label: "Films 2026", path: "/films-2026/", icon: "new_releases" },
  { id: "2025", label: "Films 2025", path: "/films-2025/", icon: "calendar_today" },
  { id: "2024", label: "Films 2024", path: "/films-2024/", icon: "calendar_today" },
  { id: "2023", label: "Films 2023", path: "/films-2023/", icon: "calendar_today" },
  { id: "2022", label: "Films 2022", path: "/films-2022/", icon: "calendar_today" },
  { id: "2021", label: "Films 2021", path: "/films-2021/", icon: "calendar_today" },
  { id: "2020", label: "Films 2020", path: "/films-2020/", icon: "calendar_today" },
  { id: "2019", label: "Films 2019", path: "/films-2019/", icon: "calendar_today" },
  { id: "2018", label: "Films 2018", path: "/films-2018/", icon: "calendar_today" },
  { id: "2010s", label: "Années 2010", path: "/films-2010-2019/", icon: "calendar_month" },
  { id: "2000s", label: "Années 2000", path: "/films-2000-2009/", icon: "calendar_month" },
  { id: "1990s", label: "Années 90", path: "/films-1990-1999/", icon: "calendar_month" },
  { id: "1980s", label: "Années 80", path: "/films-1980-1989/", icon: "calendar_month" },
  { id: "old", label: "Avant 1980", path: "/films-old/", icon: "history" },
];

/**
 * Types de contenu (Films / Séries / Animés)
 */
const TYPES: FilterOption[] = [
  { id: "films", label: "Films", path: "/films/", icon: "movie" },
  { id: "series", label: "Séries", path: "/series/", icon: "tv" },
  { id: "animes", label: "Animés", path: "/animes/", icon: "auto_awesome" },
];

/**
 * Toutes les catégories de filtres, organisées comme le menu déroulant de french-stream.net
 */
export const FILTER_GROUPS: FilterGroup[] = [
  { id: "type", label: "Type", icon: "category", options: TYPES },
  { id: "genre", label: "Par Genre", icon: "theater_comedy", options: GENRES },
  { id: "langue", label: "Par Langue", icon: "translate", options: LANGUES },
  { id: "pays", label: "Par Pays", icon: "public", options: PAYS },
  { id: "theme", label: "Par Thème", icon: "auto_awesome", options: THEMES },
  { id: "selection", label: "Sélections", icon: "star", options: SELECTIONS },
  { id: "annee", label: "Par Année", icon: "calendar_today", options: YEARS },
];

/**
 * Helper: find a filter option by id across all groups.
 */
export function findFilterOption(
  id: string
): FilterOption | null {
  for (const g of FILTER_GROUPS) {
    const opt = g.options.find((o) => o.id === id);
    if (opt) return opt;
  }
  return null;
}

/**
 * Helper: build a custom year filter path (for the "Tapez une année" input).
 * The source site accepts /films-YYYY/ for years 1980 onward.
 */
export function buildYearFilter(year: number): FilterOption | null {
  if (year < 1900 || year > new Date().getFullYear() + 1) return null;
  return {
    id: `year-${year}`,
    label: `Films ${year}`,
    path: `/films-${year}/`,
    icon: "calendar_today",
  };
}
