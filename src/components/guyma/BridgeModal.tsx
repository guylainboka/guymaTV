"use client";

/**
 * BridgeModal — full-screen iframe overlay for the guymaTV "bridge".
 *
 * When the user picks a platform on BridgeScreen, this modal opens and loads
 * the REAL platform's website inside an iframe, served via our /api/bridge
 * proxy (which strips X-Frame-Options / CSP frame-ancestors so the iframe can
 * embed it).
 *
 * guymaTV keeps ONLY:
 *   - A slim top bar (logo + platform name + refresh / open-in-new / close)
 *   - That's it — no footer, no bottom nav. The platform's own UI lives inside
 *     the iframe.
 *
 * The iframe sandbox allows scripts, same-origin (so the platform's own
 * storage/cookies work), forms, popups, and presentation (fullscreen).
 *
 * Keyboard: Escape closes the modal.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { BridgePlatform } from "@/lib/bridge-platforms";
import { apiUrl } from "@/lib/api-client";

interface BridgeModalProps {
  platform: BridgePlatform;
  onClose: () => void;
}

export const BridgeModal: React.FC<BridgeModalProps> = ({ platform, onClose }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  // Bumping this key forces the iframe to reload (refresh button).
  const [reloadKey, setReloadKey] = useState<number>(0);

  // ---------- Keyboard: Escape → onClose ----------
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    // Lock body scroll while the modal is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // ---------- Reload the iframe (refresh button) ----------
  const handleRefresh = useCallback(() => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  // ---------- Open the real platform URL in a new tab ----------
  const handleOpenInNew = useCallback(() => {
    if (typeof window !== "undefined") {
      window.open(platform.url, "_blank", "noopener,noreferrer");
    }
  }, [platform.url]);

  // ---------- iframe onLoad ----------
  const handleIframeLoad = useCallback(() => {
    setLoading(false);
  }, []);

  // The proxy URL (apiUrl handles the API base).
  const proxySrc = apiUrl(
    "/api/bridge?url=" + encodeURIComponent(platform.url)
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#0f1412] flex flex-col">
      {/* ---------- Top bar (guymaTV header — sticky, h-14) ---------- */}
      <header
        className="shrink-0 h-14 flex items-center justify-between gap-2 px-2 sm:px-4 bg-surface/95 backdrop-blur-xl border-b border-outline-variant/25"
        role="toolbar"
        aria-label="Barre de navigation guymaTV (bridge)"
      >
        {/* Left: logo + chevron + platform name */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="font-headline-md text-primary tracking-tight text-[18px] sm:text-[20px] whitespace-nowrap">
            guyma<span className="text-on-surface">TV</span>
          </span>
          <span className="material-symbols-outlined text-outline text-[18px] hidden sm:inline">
            chevron_right
          </span>
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="hidden sm:inline-flex w-6 h-6 rounded-md items-center justify-center shrink-0"
              style={{
                backgroundColor: `${platform.color}22`,
                color: platform.color,
              }}
            >
              <span
                className="material-symbols-outlined text-[14px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {platform.icon}
              </span>
            </span>
            <span className="font-headline-sm text-on-surface truncate text-[14px] sm:text-[16px]">
              {platform.name}
            </span>
          </div>
        </div>

        {/* Center: URL display (muted) */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-outline text-[11px] font-medium max-w-[40%]">
          <span className="material-symbols-outlined text-[12px] text-secondary shrink-0">
            link
          </span>
          <span className="truncate">via guymaTV • {platform.url}</span>
        </div>

        {/* Right: badge + action buttons */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Légal badge */}
          <span className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold border border-primary/30 mr-1">
            <span
              className="material-symbols-outlined text-[11px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified
            </span>
            Légal
          </span>

          {/* Refresh */}
          <button
            type="button"
            onClick={handleRefresh}
            title="Recharger la plateforme"
            aria-label="Recharger"
            className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <span className="material-symbols-outlined text-[20px]">refresh</span>
          </button>

          {/* Open in new tab */}
          <button
            type="button"
            onClick={handleOpenInNew}
            title="Ouvrir dans un nouvel onglet"
            aria-label="Ouvrir dans un nouvel onglet"
            className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <span className="material-symbols-outlined text-[20px]">open_in_new</span>
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            title="Fermer et revenir au catalogue (Échap)"
            aria-label="Fermer"
            className="w-9 h-9 rounded-full hover:bg-error-container/30 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      </header>

      {/* ---------- Iframe container (flex-1, relative) ---------- */}
      <div className="relative flex-1 bg-[#0f1412] overflow-hidden">
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#0f1412] pointer-events-none">
            <div className="relative w-14 h-14">
              {/* Spinner ring */}
              <div className="absolute inset-0 rounded-full border-2 border-surface-container-highest" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
              {/* Center icon */}
              <div
                className="absolute inset-2 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: `${platform.color}22`,
                  color: platform.color,
                }}
              >
                <span
                  className="material-symbols-outlined text-[22px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {platform.icon}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="font-headline-sm text-on-surface">
                Chargement de {platform.name}…
              </p>
              <p className="text-body-sm text-outline">
                via le proxy guymaTV • sans pub
              </p>
            </div>
          </div>
        )}

        <iframe
          key={reloadKey}
          ref={iframeRef}
          src={proxySrc}
          title={`${platform.name} — via guymaTV`}
          onLoad={handleIframeLoad}
          className="w-full h-full border-0 bg-[#0f1412]"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
};

export default BridgeModal;
