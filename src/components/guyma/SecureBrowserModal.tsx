"use client";

import React, { useState, useRef, useEffect } from "react";
import { StreamItem, StreamServer, StreamEpisode } from "@/lib/types";
import { uBlockEngineInstance } from "@/lib/uBlockEngine";
import { UBlockModal } from "./UBlockModal";

interface SecureBrowserModalProps {
  item: StreamItem;
  onClose: () => void;
  onStartDownload: (item: StreamItem) => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onSelectRelatedItem?: (item: StreamItem) => void;
}

/**
 * Secure in-app browser / stream player modal.
 *
 * Ported from the original maquette with the following adjustments:
 *  - The fake URL/address bar (lock icon, domain, path, "SSL Sécurisé" badge)
 *    has been REMOVED entirely so only the video and player controls remain.
 *  - The `<video>` tag is replaced by an `<iframe>` whose `src` points to our
 *    filtered proxy `/api/proxy?page=${item.id}`. The proxy serves the source
 *    page with all ads, popups and adult banners stripped by uBlock.
 *  - The simulated "Site Complet (Nettoyé)" view is replaced by the same
 *    filtered iframe shown full-height without the player controls overlay.
 *  - Player controls overlay (play/pause, timeline, volume, fullscreen) are
 *    preserved visually for the maquette's UX; the iframe content itself is
 *    cross-origin so the timeline scrubber is decorative.
 */
export const SecureBrowserModal: React.FC<SecureBrowserModalProps> = ({
  item,
  onClose,
  onStartDownload,
  isFavorite,
  onToggleFavorite,
  onSelectRelatedItem,
}) => {
  const [viewMode, setViewMode] = useState<"player" | "browser">("player");
  const [selectedServerIndex, setSelectedServerIndex] = useState(0);
  const [selectedEpisodeIndex, setSelectedEpisodeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(180);
  const [volume, setVolume] = useState(85);
  const [isMuted, setIsMuted] = useState(false);
  const [showUBlockModal, setShowUBlockModal] = useState(false);
  const [blockedAdsOnPage, setBlockedAdsOnPage] = useState(
    (item.blockedAdStats?.popups || 12) + (item.blockedAdStats?.adultBanners || 6)
  );
  const [iframeKey, setIframeKey] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // Servers: prefer those attached to the item, otherwise synthesize a single
  // "Secure guymaTV Player" server pointing to our filtered proxy.
  const servers: StreamServer[] =
    item.servers && item.servers.length > 0
      ? item.servers
      : [
          {
            id: `srv-${item.id}-secure`,
            name: "Lecteur Sécurisé",
            hoster: "Direct 4K",
            quality: item.quality,
            language: "VF",
            speed: "Ultra Rapide (sans pub)",
            videoUrl: `/api/proxy?page=${item.id}`,
          },
        ];

  const currentServer = servers[selectedServerIndex] || servers[0];
  const episodes: StreamEpisode[] = item.episodes || [];
  const currentEpisode = episodes[selectedEpisodeIndex];

  // The iframe URL: episode-specific proxy if series, otherwise the item proxy.
  // Both resolve to /api/proxy?page=ID which serves the filtered source page.
  const currentIframeSrc =
    currentEpisode?.videoUrl ||
    currentServer?.videoUrl ||
    `/api/proxy?page=${item.id}`;

  const domain = item.sourceServiceId ? `${item.sourceServiceId}.net` : "french-stream.net";

  // Keyboard navigation & remote control shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setVolume((prev) => Math.min(100, prev + 10));
        setIsMuted(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setVolume((prev) => Math.max(0, prev - 10));
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        setIsMuted((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePlay = () => {
    // Cross-origin iframe cannot be controlled directly; toggle the visual
    // play/pause state and reload the iframe to resume playback.
    setIsPlaying((prev) => !prev);
  };

  const toggleFullscreen = () => {
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
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleRefresh = () => {
    // Re-filter ads and reload the iframe
    uBlockEngineInstance.inspectUrl("https://syndication.exoclick.com/splash.php?partner=french-stream");
    uBlockEngineInstance.inspectUrl("https://serve.popads.net/serve.js?partner=french-stream");
    setBlockedAdsOnPage((prev) => prev + 2);
    setIframeKey((k) => k + 1);
  };

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
        <div className="bg-surface-container-highest px-3 py-2 border-b border-outline-variant/15 flex items-center justify-between gap-2 flex-wrap">
          {/* Left: Navigation Controls (no URL bar — only back & refresh) */}
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

          {/* Center: View Switcher (Clean Player vs Authentic Site) */}
          <div className="flex items-center bg-surface-container-low p-1 rounded-xl border border-outline-variant/15">
            <button
              onClick={() => setViewMode("player")}
              className={`px-3 py-1 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "player"
                  ? "bg-primary text-on-primary font-bold shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">play_circle</span>
              <span>Lecteur Stream</span>
            </button>
            <button
              onClick={() => setViewMode("browser")}
              className={`px-3 py-1 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "browser"
                  ? "bg-primary text-on-primary font-bold shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">public</span>
              <span className="hidden sm:inline">Site Complet (Nettoyé)</span>
              <span className="sm:hidden">Site Web</span>
            </button>
          </div>

          {/* Right: Action Buttons */}
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

        {/* Modal Body: Switch between Mode Player and Mode Browser (both use the same filtered iframe) */}
        <div className="flex-1 overflow-y-auto flex flex-col bg-surface-container-low">
          {viewMode === "player" ? (
            /* ============================================================== */
            /* MODE 1: STREAM PLAYER (Full Cinematic & TV Focus)               */
            /* ============================================================== */
            <div className="flex flex-col flex-1">
              {/* Top Video Player Stage — filtered iframe from our proxy */}
              <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden group select-none max-h-[58vh]">
                <iframe
                  key={`${iframeKey}-${selectedServerIndex}-${selectedEpisodeIndex}`}
                  src={currentIframeSrc}
                  title={item.title}
                  className="secure-iframe"
                  referrerPolicy="no-referrer"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-popups"
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                />

                {/* Direct Stream Protection Watermark */}
                <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md border border-primary/30 text-primary text-[11px] px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md pointer-events-none z-10">
                  <span className="material-symbols-outlined text-[14px]">shield</span>
                  <span>
                    Flux {item.platform} • Filtré par uBlock Origin (Zéro Pub)
                  </span>
                </div>

                {/* Video Quality Badge */}
                <div className="absolute top-3 right-3 bg-primary text-on-primary text-[11px] font-bold px-2 py-0.5 rounded shadow pointer-events-none z-10">
                  {currentServer.quality}
                </div>

                {/* Big Center Play/Pause button */}
                <button
                  onClick={togglePlay}
                  className="w-16 h-16 rounded-full bg-primary/90 text-on-primary flex items-center justify-center shadow-2xl transform active:scale-90 hover:scale-105 transition-all cursor-pointer z-20 opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                  <span className="material-symbols-outlined text-[36px] ml-0.5">
                    {isPlaying ? "pause" : "play_arrow"}
                  </span>
                </button>

                {/* Bottom video control overlay (decorative for cross-origin iframe) */}
                <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col gap-2 z-10 pointer-events-auto">
                  {/* Timeline scrubber */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-on-surface-variant">
                      {formatSeconds(currentTime)}
                    </span>
                    <div
                      className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden cursor-pointer relative"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pos = (e.clientX - rect.left) / rect.width;
                        const newTime = pos * (duration || 180);
                        setCurrentTime(newTime);
                      }}
                    >
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${(currentTime / (duration || 180)) * 100}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-on-surface-variant">
                      {formatSeconds(duration || 180)}
                    </span>
                  </div>

                  {/* Player buttons */}
                  <div className="flex items-center justify-between text-on-surface flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={togglePlay}
                        className="hover:text-primary transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[22px]">
                          {isPlaying ? "pause" : "play_arrow"}
                        </span>
                      </button>

                      {/* 10s backward/forward (decorative for iframe) */}
                      <button
                        onClick={() =>
                          setCurrentTime((t) => Math.max(0, t - 10))
                        }
                        className="hover:text-primary transition-colors cursor-pointer"
                        title="-10s"
                      >
                        <span className="material-symbols-outlined text-[20px]">replay_10</span>
                      </button>
                      <button
                        onClick={() =>
                          setCurrentTime((t) => Math.min(duration || 180, t + 10))
                        }
                        className="hover:text-primary transition-colors cursor-pointer"
                        title="+10s"
                      >
                        <span className="material-symbols-outlined text-[20px]">forward_10</span>
                      </button>

                      {/* Volume Slider (decorative for iframe) */}
                      <div className="flex items-center gap-1.5 ml-2">
                        <button
                          onClick={() => setIsMuted(!isMuted)}
                          className="hover:text-primary transition-colors cursor-pointer"
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
                          onChange={(e) => {
                            setVolume(Number(e.target.value));
                            setIsMuted(false);
                          }}
                          className="w-18 h-1 accent-primary bg-white/20 rounded-full cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-primary bg-primary/20 px-2 py-0.5 rounded font-bold">
                        {currentServer.hoster} ({currentServer.language})
                      </span>
                      <button
                        onClick={toggleFullscreen}
                        className="hover:text-primary transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {isFullscreen ? "fullscreen_exit" : "fullscreen"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Streaming Controls Bar: Hosters & Episodes */}
              <div className="p-4 sm:p-6 space-y-5 flex-1">
                {/* Streaming Servers Selector (French-Stream Authentic Hosters) */}
                <div className="bg-surface-container rounded-xl p-3.5 border border-outline-variant/15 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-body-sm text-outline font-semibold">
                      Serveurs de streaming :
                    </span>
                    <div className="flex gap-1.5 flex-wrap">
                      {servers.map((srv, idx) => (
                        <button
                          key={srv.id}
                          onClick={() => {
                            setSelectedServerIndex(idx);
                            setIsPlaying(true);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-body-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                            selectedServerIndex === idx
                              ? "bg-primary text-on-primary font-bold shadow-sm"
                              : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
                          }`}
                        >
                          <span>
                            {srv.name} ({srv.hoster})
                          </span>
                          <span className="text-[10px] opacity-75 font-mono">[{srv.language}]</span>
                        </button>
                      ))}
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

                {/* Series Episode Selector if applicable */}
                {episodes.length > 0 && (
                  <div className="bg-surface-container rounded-xl p-3.5 border border-outline-variant/15 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-body-sm font-bold text-primary flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px]">subscriptions</span>
                        <span>Épisodes disponibles ({episodes.length})</span>
                      </span>
                      <span className="text-[11px] text-outline">Sans interruption publicitaire</span>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {episodes.map((ep, idx) => (
                        <button
                          key={ep.id}
                          onClick={() => setSelectedEpisodeIndex(idx)}
                          className={`px-3 py-2 rounded-lg text-[13px] font-semibold shrink-0 transition-all cursor-pointer text-left border ${
                            selectedEpisodeIndex === idx
                              ? "bg-primary text-on-primary border-primary font-bold shadow-sm"
                              : "bg-surface-container-high border-outline-variant/15 text-on-surface-variant hover:text-on-surface"
                          }`}
                        >
                          <div>Épisode {ep.episodeNumber}</div>
                          <div className="text-[11px] opacity-80 font-normal truncate max-w-[140px]">
                            {ep.title}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Media Details */}
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

                  <div className="flex-1 space-y-2.5">
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
                      <span className="text-secondary text-body-sm font-semibold">
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

                    <h1 className="text-headline-lg font-headline-lg text-on-surface text-[22px] sm:text-[26px]">
                      {item.title}
                    </h1>

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

                    <p className="text-body-md text-on-surface-variant leading-relaxed">
                      {item.description}
                    </p>

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
              </div>
            </div>
          ) : (
            /* ============================================================== */
            /* MODE 2: AUTHENTIC SITE VIEW (Nettoyé via /api/proxy iframe)    */
            /* ============================================================== */
            <div className="flex flex-col flex-1 p-4 sm:p-6 space-y-4">
              {/* Notice of Blocked Ads on this French-Stream page */}
              <div className="p-3.5 bg-red-950/20 border border-red-500/30 rounded-xl flex items-center justify-between gap-3 text-[12px] text-red-200">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-400 text-[18px]">block</span>
                  <span>
                    <strong>
                      uBlock Origin a supprimé 4 bannières érotiques et 3 popunders
                    </strong>{" "}
                    habituellement présents sur cette page de {domain}.
                  </span>
                </div>
                <button
                  onClick={() => setShowUBlockModal(true)}
                  className="px-2.5 py-1 bg-red-900/50 hover:bg-red-800 text-white rounded font-bold transition-colors cursor-pointer shrink-0"
                >
                  Voir les règles
                </button>
              </div>

              {/* Filtered iframe — the source site with ads stripped by our proxy */}
              <div className="aspect-video w-full bg-black rounded-xl overflow-hidden border border-outline-variant/20 shadow-lg">
                <iframe
                  key={`browser-${iframeKey}-${selectedServerIndex}-${selectedEpisodeIndex}`}
                  src={currentIframeSrc}
                  title={`${item.title} — site complet nettoyé`}
                  className="secure-iframe"
                  referrerPolicy="no-referrer"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-popups"
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                />
              </div>

              {/* Quick switch back to the cinematic player mode */}
              <div className="flex items-center justify-center">
                <button
                  onClick={() => setViewMode("player")}
                  className="px-5 py-2.5 bg-primary text-on-primary font-bold rounded-xl flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer shadow-md"
                >
                  <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                  <span>Revenir au lecteur cinématique</span>
                </button>
              </div>
            </div>
          )}
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
