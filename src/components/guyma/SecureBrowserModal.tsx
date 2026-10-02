"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { StreamItem, StreamServer } from "@/lib/types";
import { uBlockEngineInstance } from "@/lib/uBlockEngine";
import { apiUrl } from "@/lib/api-client";
import { UBlockModal } from "./UBlockModal";

// hls.js is loaded dynamically only when we need to play a .m3u8 stream.
// Native HLS is supported on Safari/iOS, so we only load hls.js for other browsers.
let HlsModule: typeof import("hls.js").default | null = null;

// ----------------------------------------------------------------------------
// Series structure types (mirror of src/lib/scraper.ts SeriesStructure).
// Defined locally here to avoid importing the server-only scraper module on
// the client bundle.
// ----------------------------------------------------------------------------
interface SeriesEpisode {
  id: string;
  episodeNumber: number;
  seasonNumber: number;
  title: string;
  duration?: string;
  videoUrl: string;
  synopsis?: string;
  language: "VF" | "VOSTFR";
}

interface SeriesSeason {
  seasonNumber: number;
  title: string;
  episodesCount: number;
  posterUrl?: string;
}

interface SeriesStructure {
  newsid: string;
  title: string;
  seasons: SeriesSeason[];
  episodes: SeriesEpisode[];
  currentSeason: number;
}

// ----------------------------------------------------------------------------
// Comments API types (mirror of /api/comments route.ts CommentDTO).
// ----------------------------------------------------------------------------
interface CommentDTO {
  id: string;
  streamItemId: string;
  userName: string;
  rating: number;
  content: string;
  parentId: string | null;
  createdAt: string;
  replies?: CommentDTO[];
}

interface SecureBrowserModalProps {
  item: StreamItem;
  onClose: () => void;
  onStartDownload: (item: StreamItem) => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onSelectRelatedItem?: (item: StreamItem) => void;
}

/**
 * Returns true when `url` is a direct video file we can hand to a native
 * `<video>` element (.mp4 / .m3u8 / .webm, or any absolute http(s) URL that
 * isn't our own /api/proxy fallback). Returns false for the proxy URL.
 */
function isDirectVideo(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("/api/proxy")) return false;
  if (/^https?:\/\//i.test(url)) return true;
  return /\.(mp4|m3u8|webm)(\?|$)/i.test(url);
}

// ----------------------------------------------------------------------------
// Star rating display (read-only)
// ----------------------------------------------------------------------------
const StarRow: React.FC<{ rating: number; size?: number }> = ({
  rating,
  size = 12,
}) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <span
        key={i}
        className="material-symbols-outlined text-secondary"
        style={{
          fontSize: `${size}px`,
          fontVariationSettings: i <= Math.round(rating) ? "'FILL' 1" : undefined,
          opacity: i <= Math.round(rating) ? 1 : 0.3,
        }}
      >
        star
      </span>
    ))}
  </div>
);

// ----------------------------------------------------------------------------
// Single comment + nested replies (recursive)
// ----------------------------------------------------------------------------
interface CommentItemProps {
  comment: CommentDTO;
  isReply?: boolean;
  replyingTo: string | null;
  onToggleReply: (id: string) => void;
  onSubmitReply: (parentId: string, content: string) => void;
  onDelete: (id: string) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  isReply = false,
  replyingTo,
  onToggleReply,
  onSubmitReply,
  onDelete,
}) => {
  const [replyText, setReplyText] = useState("");
  const initials = (comment.userName || "A").charAt(0).toUpperCase();
  const formattedDate = new Date(comment.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const showReplyForm = replyingTo === comment.id;

  const handleSubmit = () => {
    if (!replyText.trim()) return;
    onSubmitReply(comment.id, replyText);
    setReplyText("");
  };

  return (
    <div className={isReply ? "ml-10 sm:ml-12" : ""}>
      <div className="bg-surface-container-low rounded-lg p-3 border border-outline-variant/10">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-body-sm shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-bold text-on-surface text-body-sm">
                  {comment.userName}
                </span>
                {comment.rating > 0 && <StarRow rating={comment.rating} size={11} />}
              </div>
              <span className="text-label-sm text-outline">{formattedDate}</span>
            </div>
            <p className="text-body-sm text-on-surface-variant mt-1 whitespace-pre-wrap break-words">
              {comment.content}
            </p>
            <div className="flex items-center gap-3 mt-2">
              {!isReply && (
                <button
                  onClick={() => onToggleReply(comment.id)}
                  className="text-label-sm text-primary font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">reply</span>
                  Répondre
                </button>
              )}
              <button
                onClick={() => onDelete(comment.id)}
                className="text-label-sm text-outline hover:text-error flex items-center gap-1 cursor-pointer ml-auto"
                title="Supprimer ce commentaire"
              >
                <span className="material-symbols-outlined text-[14px]">delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Inline reply form */}
      {showReplyForm && (
        <div className="mt-2 ml-11 bg-surface-container-low rounded-lg p-2 border border-outline-variant/10 flex gap-2 items-end">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Votre réponse..."
            rows={2}
            className="flex-1 p-2 bg-surface-container text-on-surface text-body-sm rounded outline-none focus:ring-2 focus:ring-primary border border-outline-variant/20 resize-none"
          />
          <button
            onClick={handleSubmit}
            disabled={!replyText.trim()}
            className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-label-sm font-bold flex items-center gap-1 hover:scale-105 transition-transform cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Publier la réponse"
          >
            <span className="material-symbols-outlined text-[14px]">send</span>
          </button>
        </div>
      )}

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              isReply
              replyingTo={replyingTo}
              onToggleReply={onToggleReply}
              onSubmitReply={onSubmitReply}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Secure in-app stream player modal — full reading page with hero, video
 * player, info section, series episodes section (if series), and comments &
 * reviews section.
 *
 * Ported from the original maquette with the following adjustments:
 *  - The fake URL/address bar (lock icon, domain, path, "SSL Sécurisé" badge)
 *    is REMOVED entirely so only the video and player controls remain.
 *  - On mount we fetch the real extracted servers from
 *    `GET /api/extract?id=${item.id}` (Playwright, cached 30 min server-side).
 *    A spinner with "Extraction des lecteurs en cours…" is shown while
 *    Playwright runs (~10-15s on first call).
 *  - Smart rendering: if `currentServer.videoUrl` is a direct video URL
 *    (mp4/m3u8/webm or any http(s) URL that isn't /api/proxy), we render a
 *    native `<video>` element and wire every player control to it via refs
 *    (play/pause, timeline scrub, volume, skip ±10s, fullscreen). If the URL
 *    is `/api/proxy?page=...` (extraction failed/empty), we fall back to the
 *    filtered `<iframe>` as before.
 *  - The "Site Complet (Nettoyé)" view mode toggle is removed — only the
 *    cinematic player view remains.
 *  - NEW: Series episodes section — if `item.category === "Séries"`, fetches
 *    `/api/series-structure?id=${item.id}` on mount and renders a season
 *    selector + episode list (VF episodes prioritized). Selecting an episode
 *    sets it as the current video source.
 *  - NEW: Comments & reviews section — always shows. Fetches
 *    `/api/comments?streamItemId=${item.id}`, supports star ratings, replies,
 *    and deletion. After POST, refreshes the list.
 *  - The maquette chrome (top action bar, uBlock badge, player stage, bottom
 *    control bar, server selector, media details, uBlock protection banner)
 *    is preserved identically.
 */
export const SecureBrowserModal: React.FC<SecureBrowserModalProps> = ({
  item,
  onClose,
  onStartDownload,
  isFavorite,
  onToggleFavorite,
  onSelectRelatedItem,
}) => {
  // ---- Server fetch state (populated from /api/extract on mount) ----
  const [servers, setServers] = useState<StreamServer[]>([]);
  const [serversLoading, setServersLoading] = useState(true);

  // ---- Player state ----
  const [selectedServerIndex, setSelectedServerIndex] = useState(0);
  const [selectedEpisode, setSelectedEpisode] = useState<SeriesEpisode | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(85);
  const [isMuted, setIsMuted] = useState(false);
  const [showUBlockModal, setShowUBlockModal] = useState(false);
  const [blockedAdsOnPage, setBlockedAdsOnPage] = useState(
    (item.blockedAdStats?.popups || 12) + (item.blockedAdStats?.adultBanners || 6)
  );
  const [iframeKey, setIframeKey] = useState(0);
  const [switchingServer, setSwitchingServer] = useState(false);

  // ---- Series structure state (fetched from /api/series-structure) ----
  const [seriesStructure, setSeriesStructure] = useState<SeriesStructure | null>(null);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);

  // ---- Comments state (fetched from /api/comments) ----
  const [comments, setComments] = useState<CommentDTO[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [newCommentName, setNewCommentName] = useState("");
  const [newCommentRating, setNewCommentRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [newCommentContent, setNewCommentContent] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Detect series: item.category === "Séries" OR item.episodes already populated.
  const isSeries =
    item.category === "Séries" ||
    item.category === "Animés" ||
    (Array.isArray(item.episodes) && item.episodes.length > 0);

  // Build the proxy fallback server (used when extraction fails or returns []).
  const buildProxyFallback = useCallback((): StreamServer => ({
    id: `srv-${item.id}-secure`,
    name: "Lecteur Sécurisé (proxy)",
    hoster: "Direct 4K",
    quality: item.quality,
    language: "VF",
    speed: "Ultra Rapide (sans pub)",
    videoUrl: apiUrl(`/api/proxy?page=${encodeURIComponent(item.id)}`),
  }), [item.id, item.quality]);

  // Fetch real extracted servers from /api/extract on mount (and when item.id changes).
  useEffect(() => {
    let cancelled = false;
    setServersLoading(true);
    setSwitchingServer(false);
    setSelectedServerIndex(0);
    setSelectedEpisode(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(true);

    fetch(apiUrl(`/api/extract?id=${encodeURIComponent(item.id)}`))
      .then((r) => {
        if (!r.ok) throw new Error(`extract failed: ${r.status}`);
        return r.json();
      })
      .then((data: StreamServer[] | { servers?: StreamServer[] }) => {
        if (cancelled) return;
        const list: StreamServer[] = Array.isArray(data)
          ? data
          : (data?.servers || []);
        if (list.length > 0) {
          setServers(list);
        } else {
          // Empty result — fall back to a single proxy server.
          setServers([buildProxyFallback()]);
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Network/extractor error — fall back to a single proxy server.
        setServers([buildProxyFallback()]);
      })
      .finally(() => {
        if (!cancelled) setServersLoading(false);
      });

    return () => { cancelled = true; };
  }, [item.id, buildProxyFallback]);

  // Fetch series structure (only if item is a series).
  useEffect(() => {
    if (!isSeries) {
      setSeriesStructure(null);
      return;
    }
    let cancelled = false;
    setSeriesLoading(true);

    fetch(apiUrl(`/api/series-structure?id=${encodeURIComponent(item.id)}`))
      .then((r) => {
        if (!r.ok) throw new Error(`series-structure failed: ${r.status}`);
        return r.json();
      })
      .then((data: SeriesStructure) => {
        if (cancelled) return;
        setSeriesStructure(data);
        // Default to the current season (or 1 if none)
        setSelectedSeason(data.currentSeason || data.seasons?.[0]?.seasonNumber || 1);
      })
      .catch(() => {
        if (cancelled) return;
        setSeriesStructure(null);
      })
      .finally(() => {
        if (!cancelled) setSeriesLoading(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, isSeries]);

  // Fetch comments on mount (always).
  // `refreshComments` is also called after every POST/DELETE to keep the list
  // in sync. The cancellation flag only applies to the most recent call, so
  // late state updates from a stale fetch are silently ignored.
  const commentsCancelRef = useRef<() => void>(() => {});
  const refreshComments = useCallback(() => {
    // Cancel any in-flight comment fetch first.
    commentsCancelRef.current();
    let cancelled = false;
    commentsCancelRef.current = () => { cancelled = true; };
    setCommentsLoading(true);
    fetch(apiUrl(`/api/comments?streamItemId=${encodeURIComponent(item.id)}`))
      .then((r) => {
        if (!r.ok) throw new Error(`comments failed: ${r.status}`);
        return r.json();
      })
      .then((data: { comments: CommentDTO[]; total: number; averageRating: number }) => {
        if (cancelled) return;
        setComments(data.comments || []);
        setAverageRating(data.averageRating || 0);
      })
      .catch(() => {
        if (cancelled) return;
        setComments([]);
        setAverageRating(0);
      })
      .finally(() => {
        if (!cancelled) setCommentsLoading(false);
      });
  }, [item.id]);

  useEffect(() => {
    refreshComments();
    // On unmount, cancel the in-flight comment fetch.
    return () => commentsCancelRef.current();
  }, [refreshComments]);

  const currentServer = servers[selectedServerIndex] || servers[0];

  // Resolve the URL to actually play. Selected episode wins (for series),
  // otherwise the current server's videoUrl, otherwise the proxy.
  const currentVideoUrl: string =
    selectedEpisode?.videoUrl ||
    currentServer?.videoUrl ||
    apiUrl(`/api/proxy?page=${encodeURIComponent(item.id)}`);

  const directVideo = isDirectVideo(currentVideoUrl);
  const isHlsStream = directVideo && /\.m3u8(\?|$)/i.test(currentVideoUrl);

  // Attach HLS.js to the <video> element when the stream is a .m3u8 URL.
  // Native HLS (Safari/iOS) doesn't need hls.js — it plays .m3u8 directly.
  useEffect(() => {
    if (!directVideo || !isHlsStream) return;
    const video = videoRef.current;
    if (!video) return;

    let hls: import("hls.js").default | null = null;

    // Native HLS support (Safari, iOS)
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = currentVideoUrl;
      video.play().catch(() => {});
      return () => {
        video.removeAttribute("src");
        video.load();
      };
    }

    // Other browsers → use hls.js
    let cancelled = false;
    (async () => {
      if (!HlsModule) {
        HlsModule = (await import("hls.js")).default;
      }
      if (cancelled || !HlsModule) return;
      if (!HlsModule.isSupported()) return;
      hls = new HlsModule({ enableWorker: true, lowLatencyMode: false });
      hls.loadSource(currentVideoUrl);
      hls.attachMedia(video);
      hls.on(HlsModule.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
        setSwitchingServer(false);
      });
      hls.on(HlsModule.Events.ERROR, (_evt, data) => {
        if (data.fatal) {
          console.error("[hls.js] fatal error:", data);
          setSwitchingServer(false);
        }
      });
    })();

    return () => {
      cancelled = true;
      if (hls) {
        hls.destroy();
      }
    };
  }, [currentVideoUrl, directVideo, isHlsStream]);

  const domain = item.sourceServiceId
    ? `${item.sourceServiceId}.net`
    : "french-stream.net";

  // =========================================================================
  // Native <video> controls — every control below is wired to videoRef.
  // =========================================================================

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) {
      setIsPlaying((prev) => !prev);
      return;
    }
    if (v.paused) {
      v.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      v.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current
        .requestFullscreen?.()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document.exitFullscreen?.()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  }, []);

  const skipBy = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    const target = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta));
    v.currentTime = target;
    setCurrentTime(target);
  }, []);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(v.duration, pos * v.duration));
    v.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = Number(e.target.value);
    setVolume(newVol);
    setIsMuted(false);
    const v = videoRef.current;
    if (v) {
      v.volume = newVol / 100;
      v.muted = false;
    }
  };

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) {
      setIsMuted((p) => !p);
      return;
    }
    v.muted = !v.muted;
  }, []);

  const formatSeconds = (sec: number) => {
    if (!sec || !isFinite(sec)) return "0:00";
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleServerSwitch = (idx: number) => {
    if (idx === selectedServerIndex) return;
    setSwitchingServer(true);
    setSelectedServerIndex(idx);
    setSelectedEpisode(null);
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(0);
  };

  const handleSelectEpisode = (episode: SeriesEpisode) => {
    setSwitchingServer(true);
    setSelectedEpisode(episode);
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(0);
  };

  const handleSelectSeason = (season: number) => {
    setSelectedSeason(season);
    // Don't clear selectedEpisode here — let the user keep their place if the
    // episode exists in the new season. Otherwise the episode list will just
    // not contain it.
  };

  const handleRefresh = () => {
    // Re-filter ads and reload the video/iframe.
    uBlockEngineInstance.inspectUrl("https://syndication.exoclick.com/splash.php?partner=french-stream");
    uBlockEngineInstance.inspectUrl("https://serve.popads.net/serve.js?partner=french-stream");
    setBlockedAdsOnPage((prev) => prev + 2);
    setIframeKey((k) => k + 1);
    setSwitchingServer(true);
    // For native video, force a reload by re-assigning src and calling load().
    if (videoRef.current && directVideo) {
      const v = videoRef.current;
      const src = v.src;
      v.removeAttribute("src");
      v.load();
      v.src = src;
      v.load();
      v.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // Track fullscreen changes (so Esc from fullscreen updates the icon).
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Keyboard navigation & remote-control shortcuts.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === "Escape") {
        // If we're in fullscreen, let the browser exit fullscreen first;
        // only close the modal when not in fullscreen.
        if (!document.fullscreenElement) {
          e.preventDefault();
          onClose();
        }
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const newVol = Math.min(100, volume + 10);
        setVolume(newVol);
        setIsMuted(false);
        if (videoRef.current) {
          videoRef.current.volume = newVol / 100;
          videoRef.current.muted = false;
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const newVol = Math.max(0, volume - 10);
        setVolume(newVol);
        if (videoRef.current) {
          videoRef.current.volume = newVol / 100;
        }
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        skipBy(-10);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        skipBy(10);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [volume, togglePlay, toggleFullscreen, toggleMute, skipBy, onClose]);

  // Server label: proxy fallbacks get the "Lecteur Sécurisé (proxy)" label,
  // direct-video servers show their hoster name.
  const serverLabel = (srv: StreamServer): string => {
    if (srv.videoUrl && !isDirectVideo(srv.videoUrl)) {
      return "Lecteur Sécurisé (proxy)";
    }
    return srv.name || srv.hoster;
  };

  // Timeline fill percentage (guard against div-by-zero before metadata loads).
  const timelinePct = duration > 0 ? (currentTime / duration) * 100 : 0;

  // =========================================================================
  // Series structure helpers
  // =========================================================================
  // Filter to VF episodes (per user spec — focus on VF). Fall back to all
  // episodes if no VF ones exist for this season.
  const vfEpisodes = (seriesStructure?.episodes || []).filter(
    (e) => e.language === "VF"
  );
  const allSeasonEpisodes = (seriesStructure?.episodes || []).filter(
    (e) => e.seasonNumber === selectedSeason
  );
  const seasonVfEpisodes = vfEpisodes.filter(
    (e) => e.seasonNumber === selectedSeason
  );
  const seasonEpisodes = seasonVfEpisodes.length > 0 ? seasonVfEpisodes : allSeasonEpisodes;

  // =========================================================================
  // Comments handlers
  // =========================================================================
  const handleSubmitComment = async () => {
    if (!newCommentContent.trim()) return;
    setSubmittingComment(true);
    try {
      await fetch(apiUrl("/api/comments"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamItemId: item.id,
          userName: newCommentName.trim() || "Anonyme",
          rating: newCommentRating,
          content: newCommentContent.trim(),
        }),
      });
      setNewCommentName("");
      setNewCommentRating(0);
      setNewCommentContent("");
      setHoverRating(0);
      refreshComments();
    } catch {
      /* silent */
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReplySubmit = async (parentId: string, content: string) => {
    if (!content.trim()) return;
    try {
      await fetch(apiUrl("/api/comments"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamItemId: item.id,
          userName: "Anonyme",
          content: content.trim(),
          parentId,
        }),
      });
      setReplyingTo(null);
      refreshComments();
    } catch {
      /* silent */
    }
  };

  const handleDeleteComment = async (id: string) => {
    try {
      await fetch(apiUrl(`/api/comments?id=${encodeURIComponent(id)}`), {
        method: "DELETE",
      });
      refreshComments();
    } catch {
      /* silent */
    }
  };

  const handleToggleReply = (id: string) => {
    setReplyingTo((prev) => (prev === id ? null : id));
  };

  const handleShare = async () => {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, url: shareUrl });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${item.title} — ${shareUrl}`);
      }
    } catch {
      /* silent */
    }
  };

  // Episode id used in the video/iframe key (so switching episode reloads the player).
  const episodeKeyFragment = selectedEpisode?.id || "default";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className="w-full max-w-6xl bg-surface-container-high rounded-2xl overflow-hidden shadow-2xl border border-outline-variant/20 flex flex-col h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Secure In-App Browser Top Action Bar (URL bar removed) */}
        <div className="bg-surface-container-highest px-3 py-2 border-b border-outline-variant/15 flex items-center justify-between gap-2 flex-wrap shrink-0">
          {/* Left: Navigation Controls (back & refresh) + uBlock blocked-ads pill */}
          <div className="flex items-center gap-1 text-on-surface-variant shrink-0">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors cursor-pointer"
              title="Fermer (Échap)"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </button>
            <button
              onClick={handleRefresh}
              className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors cursor-pointer"
              title="Actualiser et re-filtrer les pubs"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
            </button>
            <div className="flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-[11px] font-semibold">
              <span className="material-symbols-outlined text-[14px]">shield</span>
              <span className="font-bold">{blockedAdsOnPage} pubs bloquées</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            </div>
          </div>

          {/* Right: Action Buttons (uBlock, download, favorite, fullscreen, close) */}
          <div className="flex items-center gap-2">
            {/* uBlock Origin Shield Trigger */}
            <button
              onClick={() => setShowUBlockModal(true)}
              className="flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-semibold px-2.5 py-1.5 rounded-full border border-primary/30 transition-all cursor-pointer"
              title="Ouvrir le panneau uBlock Origin"
            >
              <span className="material-symbols-outlined text-[15px]">shield</span>
              <span className="font-bold hidden md:inline">uBlock</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            </button>

            {/* Direct Download button */}
            <button
              onClick={() => onStartDownload(item)}
              className="px-3 py-1.5 rounded-full bg-primary text-on-primary text-label-sm font-bold flex items-center gap-1 hover:scale-105 transition-all cursor-pointer shadow-sm"
              title="Télécharger directement la vidéo sans pub"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span className="hidden md:inline">Télécharger</span>
            </button>

            {/* Favorite toggle */}
            <button
              onClick={() => onToggleFavorite(item.id)}
              className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:text-primary transition-colors cursor-pointer"
              title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              <span
                className={`material-symbols-outlined text-[18px] ${
                  isFavorite ? "text-primary fill-current" : ""
                }`}
                style={isFavorite ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                favorite
              </span>
            </button>

            {/* Fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:text-primary transition-colors cursor-pointer"
              title="Plein écran (F)"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isFullscreen ? "fullscreen_exit" : "fullscreen"}
              </span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              title="Fermer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Modal Body — scrollable reading page */}
        <div className="flex-1 overflow-y-auto flex flex-col bg-surface-container-low guyma-scroll">
          {/* ============================================================= */}
          {/* 1. Hero section — backdrop + title overlay + action buttons   */}
          {/* ============================================================= */}
          <div className="relative aspect-video w-full bg-black overflow-hidden max-h-[42vh] shrink-0">
            {/* Backdrop image (use item.imageUrl, fall back to gradient) */}
            <img
              src={item.imageUrl}
              alt={item.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-60"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
            <div
              className={`absolute inset-0 bg-gradient-to-br ${item.fallbackGradient} -z-10`}
            />
            {/* Gradient scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-black/40 to-transparent" />

            {/* Title + badges overlay */}
            <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {item.isLive ? (
                  <span className="bg-error text-on-error text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-on-error animate-pulse" /> LIVE
                  </span>
                ) : (
                  item.quality && (
                    <span className="bg-primary text-on-primary text-[11px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">hd</span>
                      {item.quality}
                    </span>
                  )
                )}
                {item.releaseYear && (
                  <span className="bg-black/50 backdrop-blur-md text-on-surface text-[11px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                    {item.releaseYear}
                  </span>
                )}
                {item.rating && (
                  <span className="bg-secondary/20 backdrop-blur-md text-secondary text-[11px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <span
                      className="material-symbols-outlined text-[12px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    {item.rating}/10
                  </span>
                )}
                {item.duration && (
                  <span className="bg-black/50 backdrop-blur-md text-on-surface text-[11px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">schedule</span>
                    {item.duration}
                  </span>
                )}
              </div>
              <h1 className="text-headline-lg font-headline-lg text-on-surface text-[22px] sm:text-[28px] drop-shadow-lg">
                {item.title}
              </h1>
              {item.originalTitle && item.originalTitle !== item.title && (
                <p className="text-body-sm text-on-surface-variant italic">
                  Titre original : {item.originalTitle}
                </p>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <button
                  onClick={togglePlay}
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary text-body-sm font-bold flex items-center gap-1.5 hover:scale-105 transition-transform cursor-pointer shadow-md"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isPlaying ? "pause" : "play_arrow"}
                  </span>
                  Lecture
                </button>
                <button
                  onClick={() => onStartDownload(item)}
                  className="px-3 py-2 rounded-xl bg-surface-container-high/80 backdrop-blur-md text-on-surface text-body-sm font-bold flex items-center gap-1.5 hover:bg-surface-container-highest transition-colors cursor-pointer border border-outline-variant/20"
                  title="Télécharger"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  <span className="hidden sm:inline">Télécharger</span>
                </button>
                <button
                  onClick={() => onToggleFavorite(item.id)}
                  className={`px-3 py-2 rounded-xl backdrop-blur-md text-body-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-outline-variant/20 ${
                    isFavorite
                      ? "bg-primary/20 text-primary"
                      : "bg-surface-container-high/80 text-on-surface hover:bg-surface-container-highest"
                  }`}
                  title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                >
                  <span
                    className="material-symbols-outlined text-[18px]"
                    style={isFavorite ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    favorite
                  </span>
                  <span className="hidden sm:inline">{isFavorite ? "Favori" : "Favori"}</span>
                </button>
                <button
                  onClick={handleShare}
                  className="px-3 py-2 rounded-xl bg-surface-container-high/80 backdrop-blur-md text-on-surface text-body-sm font-bold flex items-center gap-1.5 hover:bg-surface-container-highest transition-colors cursor-pointer border border-outline-variant/20"
                  title="Partager"
                >
                  <span className="material-symbols-outlined text-[18px]">share</span>
                  <span className="hidden sm:inline">Partager</span>
                </button>
              </div>
            </div>
          </div>

          {/* ============================================================= */}
          {/* 2. Video Player Stage                                         */}
          {/* ============================================================= */}
          <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden group select-none max-h-[50vh] shrink-0">
            {serversLoading ? (
              /* ---- Extraction loading state ---- */
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-surface-container-low">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <div className="text-center px-4">
                  <p className="text-on-surface font-semibold text-body-md">
                    Extraction des lecteurs en cours…
                  </p>
                  <p className="text-on-surface-variant text-[12px] mt-1">
                    Analyse de la page source via Playwright (~10-15s au premier appel)
                  </p>
                </div>
              </div>
            ) : directVideo ? (
              /* ---- Native <video> player (direct mp4/m3u8/webm URL) ---- */
              <video
                ref={videoRef}
                key={`video-${iframeKey}-${selectedServerIndex}-${episodeKeyFragment}`}
                src={isHlsStream ? undefined : currentVideoUrl}
                autoPlay
                playsInline
                controls={false}
                className="w-full h-full object-contain bg-black"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                onDurationChange={(e) => setDuration(e.currentTarget.duration)}
                onVolumeChange={(e) => {
                  setVolume(Math.round(e.currentTarget.volume * 100));
                  setIsMuted(e.currentTarget.muted);
                }}
                onLoadedData={() => setSwitchingServer(false)}
                onCanPlay={() => setSwitchingServer(false)}
                onPlaying={() => setSwitchingServer(false)}
                onWaiting={() => setSwitchingServer(true)}
                onClick={togglePlay}
              />
            ) : (
              /* ---- Filtered <iframe> proxy fallback ---- */
              <iframe
                key={`iframe-${iframeKey}-${selectedServerIndex}-${episodeKeyFragment}`}
                src={currentVideoUrl}
                title={item.title}
                className="secure-iframe"
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-popups"
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                onLoad={() => setSwitchingServer(false)}
              />
            )}

            {/* Switching-server loading overlay (above the video, below the controls) */}
            {switchingServer && !serversLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-30 pointer-events-none">
                <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            )}

            {/* Direct Stream Protection Watermark */}
            {!serversLoading && (
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md border border-primary/30 text-primary text-[11px] px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md pointer-events-none z-10">
                <span className="material-symbols-outlined text-[14px]">shield</span>
                <span>
                  Flux {item.platform} • Filtré par uBlock Origin (Zéro Pub)
                </span>
              </div>
            )}

            {/* Video Quality Badge */}
            {!serversLoading && currentServer && (
              <div className="absolute top-3 right-3 bg-primary text-on-primary text-[11px] font-bold px-2 py-0.5 rounded shadow pointer-events-none z-10">
                {selectedEpisode ? `S${selectedEpisode.seasonNumber} E${selectedEpisode.episodeNumber}` : currentServer.quality}
              </div>
            )}

            {/* Big Center Play/Pause button */}
            {!serversLoading && (
              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-primary/90 text-on-primary flex items-center justify-center shadow-2xl transform active:scale-90 hover:scale-105 transition-all cursor-pointer z-20 opacity-0 group-hover:opacity-100 focus:opacity-100"
              >
                <span className="material-symbols-outlined text-[36px] ml-0.5">
                  {isPlaying ? "pause" : "play_arrow"}
                </span>
              </button>
            )}

            {/* Bottom video control overlay (wired to the native <video> element) */}
            {!serversLoading && (
              <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col gap-2 z-10 pointer-events-auto">
                {/* Timeline scrubber */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-on-surface-variant">
                    {formatSeconds(currentTime)}
                  </span>
                  <div
                    className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden cursor-pointer relative"
                    onClick={handleSeek}
                  >
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${timelinePct}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-on-surface-variant">
                    {formatSeconds(duration)}
                  </span>
                </div>

                {/* Player buttons */}
                <div className="flex items-center justify-between text-on-surface flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={togglePlay}
                      className="hover:text-primary transition-colors cursor-pointer"
                      title={isPlaying ? "Pause" : "Lecture"}
                    >
                      <span className="material-symbols-outlined text-[22px]">
                        {isPlaying ? "pause" : "play_arrow"}
                      </span>
                    </button>

                    {/* 10s backward */}
                    <button
                      onClick={() => skipBy(-10)}
                      className="hover:text-primary transition-colors cursor-pointer"
                      title="-10s"
                    >
                      <span className="material-symbols-outlined text-[20px]">replay_10</span>
                    </button>
                    {/* 10s forward */}
                    <button
                      onClick={() => skipBy(10)}
                      className="hover:text-primary transition-colors cursor-pointer"
                      title="+10s"
                    >
                      <span className="material-symbols-outlined text-[20px]">forward_10</span>
                    </button>

                    {/* Volume Slider */}
                    <div className="flex items-center gap-1.5 ml-2">
                      <button
                        onClick={toggleMute}
                        className="hover:text-primary transition-colors cursor-pointer"
                        title={isMuted ? "Réactiver le son" : "Couper le son"}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {isMuted || volume === 0 ? "volume_off" : "volume_up"}
                        </span>
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-18 h-1 accent-primary bg-white/20 rounded-full cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {selectedEpisode ? (
                      <span className="text-[11px] text-primary bg-primary/20 px-2 py-0.5 rounded font-bold">
                        S{selectedEpisode.seasonNumber}:E{selectedEpisode.episodeNumber} · VF
                      </span>
                    ) : currentServer ? (
                      <span className="text-[11px] text-primary bg-primary/20 px-2 py-0.5 rounded font-bold">
                        {currentServer.hoster} ({currentServer.language})
                      </span>
                    ) : null}
                    <button
                      onClick={toggleFullscreen}
                      className="hover:text-primary transition-colors cursor-pointer"
                      title="Plein écran (F)"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {isFullscreen ? "fullscreen_exit" : "fullscreen"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ============================================================= */}
          {/* 3. Streaming Controls Bar (servers selector + download)       */}
          {/* ============================================================= */}
          <div className="p-4 sm:p-6 space-y-5">
            <div className="bg-surface-container rounded-xl p-3.5 border border-outline-variant/15 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-body-sm text-outline font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">dns</span>
                  Serveurs de streaming :
                </span>
                <div className="flex gap-1.5 flex-wrap">
                  {serversLoading ? (
                    <>
                      {[0, 1, 2].map((i) => (
                        <div
                          key={`srv-skel-${i}`}
                          className="px-3 py-1.5 rounded-lg bg-surface-container-high animate-pulse h-8 w-28"
                        />
                      ))}
                    </>
                  ) : (
                    servers.map((srv, idx) => (
                      <button
                        key={srv.id}
                        onClick={() => handleServerSwitch(idx)}
                        className={`px-3 py-1.5 rounded-lg text-body-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                          selectedServerIndex === idx
                            ? "bg-primary text-on-primary font-bold shadow-sm"
                            : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
                        }`}
                        title={
                          isDirectVideo(srv.videoUrl)
                            ? `${srv.hoster} • ${srv.quality} • ${srv.language}`
                            : "Lecteur proxy filtré (repli)"
                        }
                      >
                        <span>{serverLabel(srv)}</span>
                        <span className="text-[10px] opacity-75 font-mono">[{srv.language}]</span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Instant Direct Download Button */}
              <button
                onClick={() => onStartDownload(item)}
                className="px-4 py-2 rounded-xl bg-secondary text-on-secondary font-bold text-body-sm flex items-center gap-1.5 hover:scale-105 transition-all cursor-pointer shadow-md shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">download_for_offline</span>
                <span>
                  Télécharger ({item.fileSizeMB ? `${(item.fileSizeMB / 1024).toFixed(1)} Go` : "HD"})
                </span>
              </button>
            </div>

            {/* ========================================================= */}
            {/* 4. Info section — poster + metadata + synopsis            */}
            {/* ========================================================= */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="w-32 sm:w-36 h-48 sm:h-52 rounded-xl overflow-hidden shadow-lg shrink-0 border border-outline-variant/15 relative">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
                <span className="absolute bottom-2 left-2 bg-primary text-on-primary text-[10px] font-bold px-1.5 py-0.5 rounded">
                  {item.quality}
                </span>
              </div>

              <div className="flex-1 space-y-2.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-primary/20 text-primary text-[11px] font-bold px-2 py-0.5 rounded">
                    {item.platform}
                  </span>
                  <span className="text-outline text-body-sm">•</span>
                  <span className="text-on-surface-variant text-body-sm">{item.category}</span>
                  {item.duration && (
                    <>
                      <span className="text-outline text-body-sm">•</span>
                      <span className="text-on-surface-variant text-body-sm">{item.duration}</span>
                    </>
                  )}
                  <span className="text-outline text-body-sm">•</span>
                  <span className="text-secondary text-body-sm font-semibold flex items-center gap-1">
                    <span
                      className="material-symbols-outlined text-[14px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    Note : {item.rating || "9.0"}/10
                  </span>
                  {item.releaseYear && (
                    <>
                      <span className="text-outline text-body-sm">•</span>
                      <span className="text-on-surface-variant text-body-sm font-mono">
                        {item.releaseYear}
                      </span>
                    </>
                  )}
                </div>

                <h2 className="text-headline-md font-headline-md text-on-surface text-[20px] sm:text-[22px]">
                  {item.title}
                </h2>

                {/* Genres / tags */}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.tags.slice(0, 6).map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant border border-outline-variant/15"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {item.director && (
                  <p className="text-[12px] text-outline font-medium">
                    Réalisé par <span className="text-on-surface">{item.director}</span>
                    {item.actors && item.actors.length > 0 && (
                      <>
                        {" "}
                        • Avec <span className="text-on-surface">
                          {item.actors.slice(0, 3).join(", ")}
                        </span>
                      </>
                    )}
                  </p>
                )}

                {item.description && (
                  <p className="text-body-md text-on-surface-variant leading-relaxed">
                    {item.description}
                  </p>
                )}

                {/* uBlock Protection Banner */}
                <div className="p-3 bg-surface-container rounded-xl border border-secondary/25 flex items-center justify-between gap-3 text-body-sm text-secondary">
                  <div className="flex items-center gap-2">
                    <span
                      className="material-symbols-outlined text-[20px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      security
                    </span>
                    <span>
                      <strong>Protection guymaTV & uBlock :</strong> Les pop-ups et fenêtres
                      adultes du site d'origine ont été filtrés.
                    </span>
                  </div>
                  <button
                    onClick={() => setShowUBlockModal(true)}
                    className="text-[11px] font-bold text-primary hover:underline shrink-0 cursor-pointer"
                  >
                    Inspecter uBlock
                  </button>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* 5. Series episodes section (only if series)               */}
            {/* ========================================================= */}
            {isSeries && (
              <div className="bg-surface-container rounded-xl p-3.5 border border-outline-variant/15 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-body-sm font-bold text-primary flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">subscriptions</span>
                    <span>Épisodes</span>
                  </span>
                  <span className="text-[11px] text-outline flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">volume_up</span>
                    Version Française (VF) uniquement
                  </span>
                </div>

                {seriesLoading ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <p className="text-body-sm text-on-surface-variant">
                      Chargement des épisodes...
                    </p>
                  </div>
                ) : !seriesStructure ? (
                  <div className="text-center py-6 text-on-surface-variant text-body-sm">
                    <span className="material-symbols-outlined text-[28px] text-outline mb-1 inline-block">
                      error
                    </span>
                    <p>Impossible de charger la structure des épisodes.</p>
                  </div>
                ) : seriesStructure.seasons.length === 0 && seasonEpisodes.length === 0 ? (
                  <div className="text-center py-6 text-on-surface-variant text-body-sm">
                    <span className="material-symbols-outlined text-[28px] text-outline mb-1 inline-block">
                      info
                    </span>
                    <p>Aucun épisode VF disponible pour le moment.</p>
                  </div>
                ) : (
                  <>
                    {/* Season selector (horizontal tabs) */}
                    {seriesStructure.seasons.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {seriesStructure.seasons.map((season) => {
                          const isActive = selectedSeason === season.seasonNumber;
                          return (
                            <button
                              key={season.seasonNumber}
                              onClick={() => handleSelectSeason(season.seasonNumber)}
                              className={`px-3 py-2 rounded-lg text-body-sm font-semibold shrink-0 transition-all cursor-pointer border flex items-center gap-1.5 ${
                                isActive
                                  ? "bg-primary text-on-primary border-primary font-bold shadow-sm"
                                  : "bg-surface-container-high border-outline-variant/15 text-on-surface-variant hover:text-on-surface"
                              }`}
                            >
                              <span className="material-symbols-outlined text-[14px]">tv</span>
                              <span>Saison {season.seasonNumber}</span>
                              <span className="text-[10px] opacity-80 font-normal">
                                ({season.episodesCount})
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Episode list (vertical, scrollable, max-h-96) */}
                    <div className="max-h-96 overflow-y-auto space-y-1.5 guyma-scroll pr-1">
                      {seasonEpisodes.length === 0 ? (
                        <div className="text-center py-4 text-on-surface-variant text-body-sm">
                          Aucun épisode VF pour cette saison.
                        </div>
                      ) : (
                        seasonEpisodes.map((ep) => {
                          const isSelected =
                            selectedEpisode?.id === ep.id;
                          return (
                            <button
                              key={ep.id}
                              onClick={() => handleSelectEpisode(ep)}
                              className={`w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-all cursor-pointer border ${
                                isSelected
                                  ? "bg-primary/15 border-primary/40"
                                  : "bg-surface-container-low border-outline-variant/10 hover:bg-surface-container-high"
                              }`}
                            >
                              {/* Episode number badge */}
                              <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-body-sm shrink-0 ${
                                  isSelected
                                    ? "bg-primary text-on-primary"
                                    : "bg-surface-container-highest text-on-surface"
                                }`}
                              >
                                {ep.episodeNumber}
                              </div>

                              {/* Episode info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-headline-sm text-body-sm text-on-surface truncate">
                                    {ep.title || `Épisode ${ep.episodeNumber}`}
                                  </span>
                                  {ep.duration && (
                                    <span className="text-label-sm text-outline shrink-0 flex items-center gap-0.5">
                                      <span className="material-symbols-outlined text-[12px]">
                                        schedule
                                      </span>
                                      {ep.duration}
                                    </span>
                                  )}
                                </div>
                                {ep.synopsis && (
                                  <p className="text-label-md text-on-surface-variant mt-0.5 line-clamp-2">
                                    {ep.synopsis}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/15 text-secondary font-bold">
                                    VF
                                  </span>
                                  {isSelected && (
                                    <span className="text-[10px] text-primary font-bold flex items-center gap-0.5">
                                      <span
                                        className="material-symbols-outlined text-[12px]"
                                        style={{ fontVariationSettings: "'FILL' 1" }}
                                      >
                                        play_circle
                                      </span>
                                      En lecture
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Play icon */}
                              <span
                                className={`material-symbols-outlined text-[24px] shrink-0 ${
                                  isSelected ? "text-primary" : "text-outline"
                                }`}
                              >
                                {isSelected ? "pause_circle" : "play_circle"}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* 6. Comments & reviews section (always show)               */}
            {/* ========================================================= */}
            <div className="bg-surface-container rounded-xl p-4 border border-outline-variant/15 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    reviews
                  </span>
                  <h3 className="font-headline-sm text-body-md text-on-surface">
                    Commentaires & Avis
                  </h3>
                </div>
                {averageRating > 0 && (
                  <div className="flex items-center gap-2">
                    <StarRow rating={averageRating} size={16} />
                    <span className="text-body-sm text-on-surface font-bold">
                      {averageRating.toFixed(1)}/5
                    </span>
                    <span className="text-label-sm text-on-surface-variant">
                      ({comments.length} avis)
                    </span>
                  </div>
                )}
              </div>

              {/* Add comment form */}
              <div className="bg-surface-container-low rounded-lg p-3 space-y-3 border border-outline-variant/10">
                {/* Name input + rating selector */}
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    value={newCommentName}
                    onChange={(e) => setNewCommentName(e.target.value)}
                    placeholder="Votre nom (optionnel)"
                    className="flex-1 min-w-[180px] h-9 px-3 bg-surface-container text-on-surface text-body-sm rounded-lg outline-none focus:ring-2 focus:ring-primary border border-outline-variant/20"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-label-sm text-on-surface-variant">Note :</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <button
                          key={i}
                          onClick={() => setNewCommentRating(i)}
                          onMouseEnter={() => setHoverRating(i)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="cursor-pointer p-0.5"
                          title={`${i} étoile${i > 1 ? "s" : ""}`}
                        >
                          <span
                            className="material-symbols-outlined text-secondary text-[20px]"
                            style={{
                              fontVariationSettings:
                                i <= (hoverRating || newCommentRating) ? "'FILL' 1" : undefined,
                              opacity: i <= (hoverRating || newCommentRating) ? 1 : 0.3,
                            }}
                          >
                            star
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Comment textarea */}
                <textarea
                  value={newCommentContent}
                  onChange={(e) => setNewCommentContent(e.target.value)}
                  placeholder="Partagez votre avis sur ce film..."
                  rows={3}
                  className="w-full p-3 bg-surface-container text-on-surface text-body-sm rounded-lg outline-none focus:ring-2 focus:ring-primary border border-outline-variant/20 resize-y"
                />

                {/* Submit button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleSubmitComment}
                    disabled={!newCommentContent.trim() || submittingComment}
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary text-body-sm font-bold flex items-center gap-1.5 hover:scale-105 transition-transform cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    {submittingComment ? "Publication…" : "Publier"}
                  </button>
                </div>
              </div>

              {/* Comments list */}
              {commentsLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-on-surface-variant text-body-sm">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  Chargement des commentaires...
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-6 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[36px] text-outline mb-2 inline-block">
                    forum
                  </span>
                  <p className="text-body-sm">Soyez le premier à laisser un avis</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      replyingTo={replyingTo}
                      onToggleReply={handleToggleReply}
                      onSubmitReply={handleReplySubmit}
                      onDelete={handleDeleteComment}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* uBlock Origin Interactive Modal */}
      {showUBlockModal && (
        <UBlockModal
          onClose={() => setShowUBlockModal(false)}
          currentPageDomain={domain}
        />
      )}
    </div>
  );
};
