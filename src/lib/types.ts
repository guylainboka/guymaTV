/**
 * guymaTV - Shared types (no IA, no mock data).
 * Adapted from the original maquette but backed by real scraping.
 */

export type TabType =
  | "accueil"
  | "explorer"
  | "plateformes"
  | "favoris"
  | "telechargements"
  | "parametres";

export type CategoryType =
  | "Tous"
  | "Cinéma"
  | "Séries"
  | "Live TV"
  | "Animés"
  | "Sports";

export interface StreamServer {
  id: string;
  name: string;
  hoster: "Uqload" | "Vidoza" | "Streamtape" | "Doodstream" | "Mixdrop" | "Direct 4K";
  quality: string;
  language: "VF" | "VOSTFR" | "Multi";
  speed: string;
  videoUrl: string;
}

export interface StreamEpisode {
  id: string;
  episodeNumber: number;
  seasonNumber: number;
  title: string;
  duration: string;
  videoUrl: string;
}

export interface StreamService {
  id: string;
  name: string;
  domain: string;
  badge: string;
  badgeClass: string;
  icon: string;
  description: string;
  blockedAdsCount: number;
  blockedRedirectsCount: number;
  isVerified: boolean;
  categories: CategoryType[];
  color: string;
}

export interface StreamItem {
  id: string;
  title: string;
  originalTitle?: string;
  category: CategoryType;
  platform: string;
  sourceServiceId?: string;
  sourceUrl?: string;
  badgeClass: string;
  imageUrl: string;
  fallbackGradient: string;
  description: string;
  videoUrl?: string;
  rating?: string;
  duration?: string;
  quality: "4K HDR" | "1080p" | "HD";
  fileSizeMB?: number;
  isLive?: boolean;
  viewers?: string;
  tags?: string[];
  releaseYear?: number;
  director?: string;
  actors?: string[];
  servers?: StreamServer[];
  episodes?: StreamEpisode[];
  blockedAdStats?: {
    popups: number;
    adultBanners: number;
    redirects: number;
    trackers: number;
  };
}

export interface DownloadItem {
  id: string;
  streamItemId: string;
  title: string;
  platform: string;
  imageUrl: string;
  quality: string;
  progress: number;
  status: "downloading" | "completed" | "paused";
  sizeMB: number;
  downloadedMB: number;
  speed: string;
  date: string;
}

export interface UBlockFilterList {
  id: string;
  name: string;
  group: "uBlock" | "EasyList" | "Privacy" | "Annoyances" | "Adult";
  ruleCount: number;
  enabled: boolean;
  description: string;
  updatedAt: string;
}

export interface BlockedRequest {
  id: string;
  url: string;
  filterRule: string;
  listName: string;
  type: "script" | "popup" | "banner" | "redirect" | "tracker" | "adult";
  timestamp: string;
}

export interface UserSettings {
  name: string;
  email: string;
  isPro: boolean;
  adBlockerActive: boolean;
  antiNudityFilter: boolean;
  videoQuality: string;
  losslessAudio: boolean;
  downloadQuality: string;
  cacheSizeMB: number;
  theme: "neon-olive" | "deep-emerald";
  tvMode: boolean;
  uBlockRulesCount?: number;
}
