"use client";

import React from "react";
import { TabType } from "@/lib/types";

interface HeaderProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  onOpenUpgrade: () => void;
  onOpenProfile: () => void;
  onGoHome: () => void;
  onOpenUBlock?: () => void;
  isPro?: boolean;
  tvMode?: boolean;
  onToggleTvMode?: () => void;
  favoritesCount?: number;
  downloadsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  onOpenUpgrade,
  onOpenProfile,
  onGoHome,
  onOpenUBlock,
  isPro,
  tvMode = false,
  onToggleTvMode,
  favoritesCount = 0,
  downloadsCount = 0,
}) => {
  const navTabs: { id: TabType; label: string; icon: string }[] = [
    { id: "accueil", label: "Accueil", icon: "home" },
    { id: "explorer", label: "Explorer", icon: "explore" },
    { id: "favoris", label: "Favoris", icon: "favorite" },
    { id: "telechargements", label: "Téléchargements", icon: "download" },
    { id: "parametres", label: "Paramètres", icon: "settings" },
  ];

  return (
    <header className="sticky top-0 inset-x-0 z-40 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/15 transition-all">
      <div className="w-full max-w-7xl mx-auto h-16 px-margin flex items-center justify-between gap-4">
        {/* Brand Left */}
        <div className="flex items-center gap-space-md">
          <button
            onClick={onGoHome}
            className="flex items-center gap-2 text-left focus:outline-none group cursor-pointer"
          >
            <span className="font-headline-md text-primary tracking-tight transition-transform group-active:scale-95 text-[22px] sm:text-[26px]">
              guyma<span className="text-on-surface">TV</span>
            </span>
            {tvMode && (
              <span className="hidden sm:inline-flex items-center gap-1 bg-surface-container-highest px-2 py-0.5 rounded text-[10px] text-primary font-bold tracking-wider border border-primary/20">
                <span className="material-symbols-outlined text-[12px]">tv</span>
                TV OS
              </span>
            )}
          </button>

          {/* Desktop & TV Navigation Menu Links */}
          <nav className="hidden md:flex items-center gap-1 ml-4 lg:ml-8">
            {navTabs.map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`px-4 py-2 rounded-full font-label-lg text-body-md flex items-center gap-2 transition-all cursor-pointer focus:ring-2 focus:ring-primary outline-none ${
                    isActive
                      ? "bg-primary-container/20 text-primary font-bold shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[18px]"
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                  {tab.id === "favoris" && favoritesCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-primary text-on-primary text-[10px] font-bold rounded-full">
                      {favoritesCount}
                    </span>
                  )}
                  {tab.id === "telechargements" && downloadsCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-secondary text-on-secondary text-[10px] font-bold rounded-full">
                      {downloadsCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-space-sm sm:gap-space-md">
          {/* uBlock Origin Shield quick launcher */}
          {onOpenUBlock && (
            <button
              onClick={onOpenUBlock}
              title="Panneau uBlock Origin (207k règles actives)"
              className="px-2.5 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 transition-all cursor-pointer flex items-center gap-1.5 text-label-sm"
            >
              <span className="material-symbols-outlined text-[17px]">shield</span>
              <span className="hidden sm:inline font-bold">uBlock 0 pub</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            </button>
          )}

          {/* TV Mode Quick Toggle button */}
          {onToggleTvMode && (
            <button
              onClick={onToggleTvMode}
              title={tvMode ? "Désactiver le Mode TV" : "Activer le Mode TV plein écran"}
              className={`p-2 rounded-full transition-all cursor-pointer flex items-center gap-1 text-label-sm ${
                tvMode
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">tv</span>
              <span className="hidden sm:inline font-medium">
                {tvMode ? "Mode TV" : "TV"}
              </span>
            </button>
          )}

          {/* PRO Button */}
          <button
            onClick={onOpenUpgrade}
            className={`px-space-md py-space-xs rounded-full font-label-lg flex items-center gap-space-xs transition-all transform active:scale-95 cursor-pointer focus:ring-2 focus:ring-primary ${
              isPro
                ? "bg-secondary text-on-secondary shadow-[0_1px_8px_rgba(78,222,163,0.3)]"
                : "bg-primary text-on-primary shadow-[0_1px_8px_rgba(163,230,53,0.3)] hover:scale-105"
            }`}
          >
            <span
              className="material-symbols-outlined text-[18px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              workspace_premium
            </span>
            <span className="whitespace-nowrap">{isPro ? "VIP PRO" : "PRO"}</span>
          </button>

          {/* User Profile */}
          <button
            onClick={onOpenProfile}
            title="Paramètres du compte"
            className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface hover:ring-2 hover:ring-primary/40 transition-all cursor-pointer overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <span className="material-symbols-outlined text-on-surface text-[18px]">person</span>
          </button>
        </div>
      </div>
    </header>
  );
};
