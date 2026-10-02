"use client";

import React from "react";
import { StreamItem } from "@/lib/types";

interface FavorisScreenProps {
  /** Full list of favorited StreamItems (fetched from /api/favorites by the App). */
  favorites: StreamItem[];
  onToggleFavorite: (id: string) => void;
  onSelectItem: (item: StreamItem) => void;
  onGoToExplorer: () => void;
}

export const FavorisScreen: React.FC<FavorisScreenProps> = ({
  favorites,
  onToggleFavorite,
  onSelectItem,
  onGoToExplorer,
}) => {
  return (
    <div className="flex flex-col w-full gap-space-lg pb-14">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-on-surface-variant text-body-md">Votre bibliothèque</span>
          <h1 className="text-headline-md font-headline-md text-on-surface">Favoris</h1>
        </div>
        <span className="text-label-md bg-surface-container-high px-space-md py-1 rounded-full text-primary border border-outline-variant/10">
          {favorites.length} {favorites.length <= 1 ? "programme" : "programmes"}
        </span>
      </div>

      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-surface-container-low rounded-2xl border border-outline-variant/10 gap-4 mt-6">
          <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center text-outline">
            <span className="material-symbols-outlined text-[32px]">favorite_border</span>
          </div>
          <div>
            <h3 className="font-headline-sm text-on-surface mb-1">Aucun favori pour le moment</h3>
            <p className="text-body-md text-on-surface-variant max-w-xs">
              Ajoutez vos films, séries et chaînes préférés pour y accéder rapidement même
              hors-ligne.
            </p>
          </div>
          <button
            onClick={onGoToExplorer}
            className="mt-2 px-space-lg py-3 rounded-full bg-primary text-on-primary font-label-lg shadow-[0_1px_8px_rgba(163,230,53,0.3)] hover:scale-105 transition-all cursor-pointer"
          >
            Explorer les programmes
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
          {favorites.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectItem(item)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSelectItem(item);
              }}
              className="flex items-center gap-space-md p-space-sm bg-surface-container-low hover:bg-surface-container rounded-xl relative group cursor-pointer transition-all border border-outline-variant/10 focus:ring-4 focus:ring-primary outline-none"
            >
              <div className="w-28 h-20 rounded-lg relative flex-shrink-0 overflow-hidden bg-surface-container-high">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${item.fallbackGradient} -z-10`}
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-primary text-[24px]">
                    play_arrow
                  </span>
                </div>
              </div>

              <div className="flex flex-col flex-grow min-w-0 pr-1">
                <span className="text-label-sm text-primary font-medium truncate">
                  {item.platform}
                </span>
                <h3 className="text-on-surface text-label-lg font-headline-sm truncate">
                  {item.title}
                </h3>
                <span className="text-on-surface-variant text-body-sm truncate">
                  {item.description}
                </span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(item.id);
                }}
                className="p-2 text-primary hover:text-error transition-colors cursor-pointer"
                title="Supprimer des favoris"
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  favorite
                </span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
