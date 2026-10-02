"use client";

import React, { useState, useRef, useEffect } from "react";
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
  /**
   * Functional search callback — fired when the user types in the header
   * search input (debounced 500ms) or hits Enter. The parent should switch
   * to the Explorer tab and forward the query to ExplorerScreen.
   */
  onSearch?: (query: string) => void;
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
  onSearch,
}) => {
  const [searchValue, setSearchValue] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup the debounce timer on unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Fire onSearch (debounced 500ms) every time the user types.
  const handleSearchInput = (value: string) => {
    setSearchValue(value);
    if (!onSearch) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(value);
    }, 500);
  };

  // Fire onSearch immediately when Enter is pressed.
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!onSearch) return;
    if (e.key === "Enter") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onSearch(searchValue);
    }
  };

  // Clear the search input.
  const handleClearSearch = () => {
    setSearchValue("");
    if (onSearch) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onSearch("");
    }
  };

  const navTabs: { id: TabType; label: string; icon: string }[] = [
    { id: "accueil", label: "Accueil", icon: "home" },
    { id: "explorer", label: "Explorer", icon: "explore" },
    { id: "favoris", label: "Favoris", icon: "favorite" },
    { id: "telechargements", label: "Téléchargements", icon: "download" },
    { id: "parametres", label: "Paramètres", icon: "settings" },
  ];

  return (
    <header className="sticky top-0 inset-x-0 z-40 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/15 transition-all">
      <div className="w-full max-w-7xl mx-auto h-16 px-margin flex items-center justify-between gap-3 sm:gap-4">
        {/* Brand Left */}
        <div className="flex items-center gap-space-md shrink-0">
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

        {/* Center: Functional Search Input (visible sm+ to keep mobile header tidy) */}
        {onSearch && (
          <div className="flex-1 max-w-md hidden sm:block">
            <div
              className={`relative flex items-center transition-all ${
                searchFocused ? "scale-[1.01]" : ""
              }`}
            >
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
                search
              </span>
              <input
                value={searchValue}
                onChange={(e) => handleSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                type="text"
                placeholder="Tapez un Titre, un Acteur, un Genre..."
                className="w-full h-9 pl-9 pr-9 bg-surface-container-high text-on-surface text-body-sm rounded-full outline-none focus:ring-2 focus:ring-primary placeholder:text-outline transition-all border border-outline-variant/20"
              />
              {searchValue && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer"
                  title="Effacer la recherche"
                >
                  <span className="material-symbols-outlined text-[15px]">close</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mobile-only search icon button (expands by switching to Explorer tab) */}
        {onSearch && (
          <button
            onClick={() => onTabChange("explorer")}
            className="sm:hidden w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer shrink-0"
            title="Rechercher"
          >
            <span className="material-symbols-outlined text-[20px]">search</span>
          </button>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-space-sm sm:gap-space-md shrink-0">
          {/* uBlock Origin Shield quick launcher */}
          {onOpenUBlock && (
            <button
              onClick={onOpenUBlock}
              title="Panneau uBlock Origin (207k règles actives)"
              className="px-2.5 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 transition-all cursor-pointer flex items-center gap-1.5 text-label-sm"
            >
              <span className="material-symbols-outlined text-[17px]">shield</span>
              <span className="hidden lg:inline font-bold">uBlock 0 pub</span>
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
              <span className="hidden lg:inline font-medium">
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
