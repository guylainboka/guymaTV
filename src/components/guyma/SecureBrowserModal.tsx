"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { StreamItem, StreamServer, StreamEpisode } from "@/lib/types";
import { uBlockEngineInstance } from "@/lib/uBlockEngine";
import { apiUrl } from "@/lib/api-client";
import { UBlockModal } from "./UBlockModal";

// hls.js is loaded dynamically only when we need to play a .m3u8 stream.
// Native HLS is supported on Safari/iOS, so we only load hls.js for other browsers.
let HlsModule: typeof import("hls.js").default | null = null;

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

/**
 * Secure in-app stream player modal.
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
 *  - The maquette chrome (top action bar, uBlock badge, player stage, bottom
 *    control bar, server selector, episode selector, media details, uBlock
 *    protection banner) is preserved identically.
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
  const [selectedEpisodeIndex, setSelectedEpisodeIndex] = useState(0);
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

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

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
    setSelectedEpisodeIndex(0);
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

  const currentServer = servers[selectedServerIndex] || servers[0];
  const episodes: StreamEpisode[] = item.episodes || [];
  const currentEpisode = episodes[selectedEpisodeIndex];

  // Resolve the URL to actually play. Episode-specific videoUrl wins for
  // series, otherwise the current server's videoUrl, otherwise the proxy.
  const currentVideoUrl: string =
    currentEpisode?.videoUrl ||
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
    setSelectedEpisodeIndex(0);
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(0);
  };

  const handleEpisodeSwitch = (idx: number) => {
    if (idx === selectedEpisodeIndex) return;
    setSwitchingServer(true);
    setSelectedEpisodeIndex(idx);
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(0);
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

        {/* Modal Body — Player view only (Site Complet view removed) */}
        <div className="flex-1 overflow-y-auto flex flex-col bg-surface-container-low">
          <div className="flex flex-col flex-1">
            {/* Top Video Player Stage — native <video> or filtered <iframe> */}
            <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden group select-none max-h-[58vh]">
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
                  key={`video-${iframeKey}-${selectedServerIndex}-${selectedEpisodeIndex}`}
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
                  key={`iframe-${iframeKey}-${selectedServerIndex}-${selectedEpisodeIndex}`}
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
                  {currentServer.quality}
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
                      {currentServer && (
                        <span className="text-[11px] text-primary bg-primary/20 px-2 py-0.5 rounded font-bold">
                          {currentServer.hoster} ({currentServer.language})
                        </span>
                      )}
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

            {/* Streaming Controls Bar: Hosters & Episodes */}
            <div className="p-4 sm:p-6 space-y-5 flex-1">
              {/* Streaming Servers Selector (real extracted hosters) */}
              <div className="bg-surface-container rounded-xl p-3.5 border border-outline-variant/15 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-body-sm text-outline font-semibold">
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
                        onClick={() => handleEpisodeSwitch(idx)}
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
