"use client";

/**
 * BridgeScreen — guymaTV "Bridge" tab.
 *
 * Lists all 14 legal free streaming platforms (France.tv, Arte, Pluto TV, etc.)
 * grouped by category. Clicking a platform tile opens BridgeModal, which loads
 * the real platform inside our /api/bridge proxy iframe (X-Frame-Options
 * stripped), so the user navigates the real platform while we keep just the
 * guymaTV header and navigation.
 *
 * guymaTV is a "bridge" / "gateway" to legal platforms — not a host.
 */

import React from "react";
import {
  BRIDGE_PLATFORMS,
  CATEGORY_LABELS,
  getPlatformsByCategory,
  BridgePlatform,
} from "@/lib/bridge-platforms";

interface BridgeScreenProps {
  /** Called when the user clicks a platform tile. The parent opens BridgeModal. */
  onSelectPlatform: (platform: BridgePlatform) => void;
}

const CATEGORY_ORDER: BridgePlatform["category"][] = [
  "tv-replay",
  "live-tv",
  "vod",
  "anime",
  "docs",
  "sport",
];

export const BridgeScreen: React.FC<BridgeScreenProps> = ({ onSelectPlatform }) => {
  return (
    <div className="flex flex-col gap-space-lg pt-space-md pb-space-xl animate-fade-in">
      {/* ---------- Page header ---------- */}
      <header className="flex flex-col gap-space-md">
        <div className="flex items-start gap-space-md">
          <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center border border-primary/25 shadow-md">
            <span
              className="material-symbols-outlined text-[28px] sm:text-[32px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              live_tv
            </span>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <h1 className="font-headline-lg text-on-surface tracking-tight leading-tight">
              TV &amp; Plateformes Légales
            </h1>
            <p className="text-body-md text-on-surface-variant max-w-2xl">
              Accédez aux meilleures plateformes de streaming gratuit directement
              depuis guymaTV. 100% légal, sans pub.
            </p>
          </div>
        </div>

        {/* Info banner: explain the bridge concept */}
        <div className="flex items-start gap-space-sm rounded-2xl bg-secondary/10 border border-secondary/25 px-space-md py-space-sm">
          <span className="material-symbols-outlined text-secondary text-[20px] shrink-0 mt-0.5">
            info
          </span>
          <p className="text-body-sm text-on-surface-variant leading-relaxed">
            <span className="text-secondary font-semibold">guymaTV agit comme une passerelle</span>
            {" — "}
            vous naviguez sur la vraie plateforme, nous gardons juste le header et la navigation.
          </p>
        </div>
      </header>

      {/* ---------- Platforms grouped by category ---------- */}
      <div className="flex flex-col gap-space-xl">
        {CATEGORY_ORDER.map((cat) => {
          const platforms = getPlatformsByCategory(cat);
          if (platforms.length === 0) return null;
          const meta = CATEGORY_LABELS[cat];

          return (
            <section key={cat} className="flex flex-col gap-space-md">
              {/* Section header */}
              <div className="flex items-center justify-between gap-space-sm border-b border-outline-variant/20 pb-space-sm">
                <div className="flex items-center gap-space-sm min-w-0">
                  <span className="material-symbols-outlined text-primary text-[22px] shrink-0">
                    {meta.icon}
                  </span>
                  <h2 className="font-headline-sm text-on-surface truncate">
                    {meta.label}
                  </h2>
                </div>
                <span className="shrink-0 px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-semibold">
                  {platforms.length} plateforme{platforms.length > 1 ? "s" : ""}
                </span>
              </div>

              {/* Responsive grid of tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-space-md">
                {platforms.map((platform) => (
                  <PlatformTile
                    key={platform.id}
                    platform={platform}
                    onClick={() => onSelectPlatform(platform)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* ---------- Footer note ---------- */}
      <footer className="mt-space-md flex items-center justify-center gap-space-sm text-center">
        <span className="material-symbols-outlined text-outline text-[16px]">
          verified
        </span>
        <p className="text-body-sm text-outline">
          {BRIDGE_PLATFORMS.length} plateformes légales référencées • Sources : journaldugeek.com & vérification manuelle
        </p>
      </footer>
    </div>
  );
};

/**
 * Single platform tile (clickable card).
 * The whole tile is clickable and calls onSelectPlatform.
 */
interface PlatformTileProps {
  platform: BridgePlatform;
  onClick: () => void;
}

const PlatformTile: React.FC<PlatformTileProps> = ({ platform, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Accéder à ${platform.name}`}
      className="group relative flex flex-col gap-space-sm rounded-2xl bg-surface-container border border-outline-variant/20 shadow-md hover:shadow-xl p-space-md text-left transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 overflow-hidden"
    >
      {/* "Légal" badge (top-right) */}
      <span className="absolute top-2 right-2 z-10 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold border border-primary/30">
        <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          verified
        </span>
        Légal
      </span>

      {/* Colored icon circle (uses platform.color) */}
      <div className="flex items-center justify-center">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-110"
          style={{
            backgroundColor: `${platform.color}22`,
            color: platform.color,
            border: `1px solid ${platform.color}44`,
          }}
        >
          <span
            className="material-symbols-outlined text-[32px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {platform.icon}
          </span>
        </div>
      </div>

      {/* Platform name */}
      <h3 className="font-headline-sm text-on-surface leading-tight line-clamp-1">
        {platform.name}
      </h3>

      {/* Description */}
      <p className="text-body-sm text-on-surface-variant line-clamp-2 leading-relaxed flex-grow">
        {platform.description}
      </p>

      {/* "Accéder" button + proxy hint */}
      <div className="flex items-center justify-between gap-2 mt-1">
        <span className="inline-flex items-center gap-1 px-space-sm py-1 rounded-full bg-primary text-on-primary text-[12px] font-bold transition-colors group-hover:bg-primary-fixed">
          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
          Accéder
        </span>
        {platform.needsProxy && (
          <span
            className="inline-flex items-center gap-0.5 text-[10px] text-outline font-medium"
            title="Chargé via le proxy guymaTV (X-Frame-Options strippé)"
          >
            <span className="material-symbols-outlined text-[11px]">shield</span>
            via proxy
          </span>
        )}
      </div>
    </button>
  );
};

export default BridgeScreen;
