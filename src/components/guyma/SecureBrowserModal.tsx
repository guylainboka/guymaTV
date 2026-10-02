"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { StreamItem } from "@/lib/types";
import { uBlockEngineInstance } from "@/lib/uBlockEngine";
import { apiUrl } from "@/lib/api-client";
import { UBlockModal } from "./UBlockModal";

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
 * Secure in-app stream reading page.
 *
 * ARCHITECTURE (refactor — task 11-native-player-refactor):
 * The reading is now handled entirely by French-Stream's NATIVE player
 * interface, embedded through our `/api/proxy?page=ID` endpoint. guymaTV no
 * longer ships a custom `<video>` element, hls.js, or the Playwright-based
 * `/api/extract` flow. French-Stream is treated as a server that provides
 * films, search results, AND its own reading interface (server tabs, quality
 * selector, episode list, native player controls). guymaTV keeps the chrome
 * AROUND the iframe: header bar, hero, info, episode picker (also reloads the
 * iframe), and comments.
 *
 * Layout (top → bottom):
 *   1. Sticky top action bar (back, refresh, uBlock badge, fullscreen, close)
 *   2. Compact hero (backdrop + title + badges + actions — no "Lecture" button)
 *   3. Video area — ALWAYS an `<iframe>` pointing to /api/proxy?page=ID
 *   4. Info section (poster + metadata + synopsis + uBlock banner)
 *   5. Series episodes section (only if series) — clicking reloads the iframe
 *   6. Comments & reviews section
 */
export const SecureBrowserModal: React.FC<SecureBrowserModalProps> = ({
  item,
  onClose,
  onStartDownload,
  isFavorite,
  onToggleFavorite,
  onSelectRelatedItem,
}) => {
  // ---- Iframe / player state ----
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showUBlockModal, setShowUBlockModal] = useState(false);
  const [blockedAdsOnPage, setBlockedAdsOnPage] = useState(
    (item.blockedAdStats?.popups || 12) + (item.blockedAdStats?.adultBanners || 6)
  );

  // ---- Series structure state (fetched from /api/series-structure) ----
  const [seriesStructure, setSeriesStructure] = useState<SeriesStructure | null>(null);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState<SeriesEpisode | null>(null);

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

  // Detect series: item.category === "Séries" OR item.episodes already populated.
  const isSeries =
    item.category === "Séries" ||
    item.category === "Animés" ||
    (Array.isArray(item.episodes) && item.episodes.length > 0);

  // Build the French-Stream proxy URL.
  // - Films: /api/proxy?page=ID
  // - Series with a selected episode: /api/proxy?page=ID&season=X&episode=Y
  // The `iframeKey` and episode id both feed the iframe's React `key` so
  // changing episode or hitting "Refresh" forces a fresh iframe mount.
  const proxyUrl = React.useMemo(() => {
    const base = `/api/proxy?page=${encodeURIComponent(item.id)}`;
    if (selectedEpisode) {
      return apiUrl(
        `${base}&season=${selectedEpisode.seasonNumber}&episode=${selectedEpisode.episodeNumber}`
      );
    }
    return apiUrl(base);
  }, [item.id, selectedEpisode]);

  // Whenever the proxy URL changes (new item or new episode), mark the iframe
  // as loading again. The `onLoad` handler flips it back to false.
  useEffect(() => {
    setIframeLoading(true);
  }, [proxyUrl, iframeKey]);

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

  const domain = item.sourceServiceId
    ? `${item.sourceServiceId}.net`
    : "french-stream.net";

  // =========================================================================
  // Iframe controls
  // =========================================================================

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

  const handleRefresh = () => {
    // Re-filter ads and reload the iframe (fresh mount via key bump).
    uBlockEngineInstance.inspectUrl("https://syndication.exoclick.com/splash.php?partner=french-stream");
    uBlockEngineInstance.inspectUrl("https://serve.popads.net/serve.js?partner=french-stream");
    setBlockedAdsOnPage((prev) => prev + 2);
    setIframeLoading(true);
    setIframeKey((k) => k + 1);
  };

  const handleSelectEpisode = (episode: SeriesEpisode) => {
    setSelectedEpisode(episode);
    // The iframe URL changes, so it remounts automatically. We also bump
    // `iframeKey` to guarantee a fresh load even if the URL string somehow
    // collides.
    setIframeLoading(true);
    setIframeKey((k) => k + 1);
  };

  const handleSelectSeason = (season: number) => {
    setSelectedSeason(season);
    // Don't clear selectedEpisode here — let the user keep their place if the
    // episode exists in the new season. Otherwise the episode list will just
    // not contain it.
  };

  // Track fullscreen changes (so Esc from fullscreen updates the icon).
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Keyboard shortcuts (simplified — video control removed, French-Stream's
  // native player handles play/pause/seek itself).
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
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleFullscreen, onClose]);

  // =========================================================================
  // Series structure helpers
  // =========================================================================
  // Show ALL episodes (VF + VOSTFR) — user requested all versions available.
  // The UI shows a language badge (VF/VOSTFR) next to each episode so the
  // user can choose which version to watch.
  const allEpisodes = seriesStructure?.episodes || [];
  const seasonEpisodes = allEpisodes.filter(
    (e) => e.seasonNumber === selectedSeason
  );

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

  // Episode id used in the iframe key (so switching episode reloads the player).
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
        {/* ============================================================= */}
        {/* 1. Sticky top action bar                                       */}
        {/* ============================================================= */}
        <div className="bg-surface-container-highest px-3 py-2 border-b border-outline-variant/15 flex items-center justify-between gap-2 flex-wrap shrink-0 sticky top-0 z-40">
          {/* Left: Navigation Controls (back & refresh) + uBlock blocked-ads pill */}
          <div className="flex items-center gap-1 text-on-surface-variant shrink-0">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors cursor-pointer"
              title="Retour (Échap)"
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

          {/* Right: Action buttons (uBlock, fullscreen, close) */}
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

            {/* Fullscreen toggle (requests fullscreen on the iframe container) */}
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
          {/* 2. Hero section — backdrop + title overlay + action buttons   */}
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
              <h1 className="text-headline-md font-headline-md text-on-surface text-[22px] sm:text-[28px] drop-shadow-lg">
                {item.title}
              </h1>
              {item.originalTitle && item.originalTitle !== item.title && (
                <p className="text-body-sm text-on-surface-variant italic">
                  Titre original : {item.originalTitle}
                </p>
              )}

              {/* Action buttons (no "Lecture" — the iframe IS the player) */}
              <div className="flex items-center gap-2 flex-wrap mt-1">
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
                  onClick={() => onStartDownload(item)}
                  className="px-3 py-2 rounded-xl bg-surface-container-high/80 backdrop-blur-md text-on-surface text-body-sm font-bold flex items-center gap-1.5 hover:bg-surface-container-highest transition-colors cursor-pointer border border-outline-variant/20"
                  title="Télécharger"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  <span className="hidden sm:inline">Télécharger</span>
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
          {/* 3. Video player area — French-Stream native player (iframe)   */}
          {/* ============================================================= */}
          <div
            className="relative w-full bg-black overflow-hidden select-none shrink-0"
            style={{ minHeight: "320px", height: "60vh", backgroundColor: "#0f1412" }}
          >
            {/* Loading overlay shown until the iframe's onLoad fires */}
            {iframeLoading && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 pointer-events-none" style={{ backgroundColor: "#0f1412" }}>
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <div className="text-center px-4">
                  <p className="text-on-surface font-semibold text-body-md">
                    Chargement du lecteur French-Stream…
                  </p>
                  <p className="text-on-surface-variant text-[12px] mt-1">
                    Récupération de l'interface native via proxy filtrant uBlock
                  </p>
                </div>
              </div>
            )}

            {/* French-Stream native player (always shown, never the custom video) */}
            <iframe
              key={`iframe-${iframeKey}-${episodeKeyFragment}`}
              src={proxyUrl}
              title={item.title}
              className="secure-iframe w-full h-full"
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-popups"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              onLoad={() => setIframeLoading(false)}
            />

            {/* uBlock protection watermark (top-left) */}
            <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md border border-primary/30 text-primary text-[11px] px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md pointer-events-none z-10">
              <span className="material-symbols-outlined text-[14px]">shield</span>
              <span>
                Flux {item.platform} • Filtré par uBlock Origin (Zéro Pub)
              </span>
            </div>

            {/* Episode/quality badge (top-right) */}
            <div className="absolute top-3 right-3 bg-primary text-on-primary text-[11px] font-bold px-2 py-0.5 rounded shadow pointer-events-none z-10">
              {selectedEpisode
                ? `S${selectedEpisode.seasonNumber} E${selectedEpisode.episodeNumber}`
                : item.quality}
            </div>

            {/* Fullscreen overlay button (bottom-right corner of the iframe container) */}
            <button
              onClick={toggleFullscreen}
              className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-black/70 backdrop-blur-md border border-primary/30 text-on-surface hover:text-primary flex items-center justify-center transition-colors cursor-pointer z-10"
              title="Plein écran (F)"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isFullscreen ? "fullscreen_exit" : "fullscreen"}
              </span>
            </button>

            {/* Native interface hint (bottom-left) */}
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-on-surface-variant text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 pointer-events-none z-10">
              <span className="material-symbols-outlined text-[12px]">smart_display</span>
              <span>Interface native French-Stream</span>
            </div>
          </div>

          {/* ============================================================= */}
          {/* 4. Info section — poster + metadata + synopsis                */}
          {/* ============================================================= */}
          <div className="p-4 sm:p-6 space-y-5">
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
                    Toutes versions (VF + VOSTFR)
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
                    <p>Aucun épisode disponible pour le moment.</p>
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
                          Aucun épisode pour cette saison.
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
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                      ep.language === "VOSTFR"
                                        ? "bg-secondary/15 text-secondary"
                                        : "bg-primary/15 text-primary"
                                    }`}
                                  >
                                    {ep.language || "VF"}
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
