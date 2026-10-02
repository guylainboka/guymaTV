"use client";

import React from "react";
import { TabType } from "@/lib/types";

interface BottomNavBarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  favoritesCount?: number;
  downloadsCount?: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentTab,
  onTabChange,
  favoritesCount = 0,
  downloadsCount = 0,
}) => {
  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: "accueil", label: "Accueil", icon: "home" },
    { id: "explorer", label: "Explorer", icon: "explore" },
    { id: "plateformes", label: "TV", icon: "live_tv" },
    { id: "favoris", label: "Favoris", icon: "favorite" },
    { id: "telechargements", label: "Offline", icon: "download" },
    { id: "parametres", label: "Réglages", icon: "settings" },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 pb-safe bg-surface/90 backdrop-blur-xl border-t border-outline-variant/20 md:hidden">
      <div className="max-w-2xl mx-auto flex justify-around items-center h-20 px-space-xs">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-space-xs w-12 sm:w-14 h-14 rounded-full transition-all cursor-pointer relative ${
                isActive
                  ? "text-primary bg-primary-container/10 scale-105"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span
                className="material-symbols-outlined transition-transform active:scale-90 text-[20px] sm:text-[22px]"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {tab.icon}
              </span>
              <span className="text-[10px] font-medium">{tab.label}</span>

              {tab.id === "favoris" && favoritesCount > 0 && (
                <span className="absolute top-1 right-2 w-4 h-4 bg-primary text-on-primary text-[10px] font-bold rounded-full flex items-center justify-center">
                  {favoritesCount}
                </span>
              )}
              {tab.id === "telechargements" && downloadsCount > 0 && (
                <span className="absolute top-1 right-2 w-4 h-4 bg-secondary text-on-secondary text-[10px] font-bold rounded-full flex items-center justify-center">
                  {downloadsCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
