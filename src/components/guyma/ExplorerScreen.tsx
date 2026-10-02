"use client";

import React, { useState, useEffect } from "react";
import { StreamItem, CategoryType, StreamService } from "@/lib/types";

interface ExplorerScreenProps {
  onSelectItem: (item: StreamItem) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onStartDownload: (item: StreamItem) => void;
  services: StreamService[];
}

const GridCardSkeleton: React.FC = () => (
  <div className="rounded-xl overflow-hidden bg-surface-container-low border border-outline-variant/10 animate-pulse">
    <div className="aspect-[4/5] w-full bg-surface-container" />
    <div className="p-2 space-y-1.5">
      <div className="h-2 bg-surface-container-highest rounded w-1/3" />
      <div className="h-3 bg-surface-container-highest rounded w-2/3" />
    </div>
  </div>
);

export const ExplorerScreen: React.FC<ExplorerScreenProps> = ({
  onSelectItem,
  favorites,
  onToggleFavorite,
  onStartDownload,
  services,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("Tous");
  const [selectedService, setSelectedService] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [qualityFilter, setQualityFilter] = useState<string>("all");

  // Catalog state (fetched from API)
  const [allItems, setAllItems] = useState<StreamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch from /api/catalog. We fetch films+series, or by search query if any.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const url = searchQuery
      ? `/api/catalog?type=all&page=1&search=${encodeURIComponent(searchQuery)}`
      : `/api/catalog?type=all&page=1`;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: { items: StreamItem[] }) => {
        if (!cancelled) {
          setAllItems(data.items || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Erreur de chargement");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [searchQuery]);

  const categories: CategoryType[] = [
    "Tous",
    "Cinéma",
    "Séries",
    "Live TV",
    "Animés",
    "Sports",
  ];

  // Client-side filtering (search is also server-side, but we still apply
  // category/quality/service filters locally).
  const filteredItems = allItems.filter((item) => {
    const matchesCategory =
      selectedCategory === "Tous" || item.category === selectedCategory;
    const matchesService =
      selectedService === "all" ||
      item.sourceServiceId === selectedService ||
      item.platform.toLowerCase().includes(selectedService.toLowerCase());
    const matchesQuality =
      qualityFilter === "all" ||
      (qualityFilter === "4k" && item.quality.includes("4K")) ||
      (qualityFilter === "live" && item.isLive);
    return matchesCategory && matchesService && matchesQuality;
  });

  return (
    <div className="flex flex-col w-full gap-space-lg pb-14">
      {/* Header */}
      <div className="flex flex-col">
        <span className="text-on-surface-variant text-body-md">
          Catalogue Universel Multi-Sites
        </span>
        <h1 className="text-headline-md font-headline-md text-on-surface">Explorer</h1>
      </div>

      {/* Search Input */}
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <span className="material-symbols-outlined text-outline">search</span>
        </div>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-10 py-3 bg-surface-container-low text-on-surface text-body-md rounded-full outline-none focus:ring-2 focus:ring-primary placeholder:text-outline transition-all shadow-sm border border-outline-variant/10"
          placeholder="Rechercher par titre, genre ou site (French-Stream, Wiflix...)"
          type="text"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-outline hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {/* Streaming Site Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-margin px-margin">
        <span className="text-label-sm text-outline shrink-0">Sites :</span>
        <button
          onClick={() => setSelectedService("all")}
          className={`px-3 py-1 rounded-full text-label-sm font-semibold cursor-pointer transition-colors shrink-0 ${
            selectedService === "all"
              ? "bg-primary text-on-primary font-bold"
              : "bg-surface-container text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Tous les sites
        </button>
        {services.map((svc) => (
          <button
            key={svc.id}
            onClick={() => setSelectedService(svc.id)}
            className={`px-3 py-1 rounded-full text-label-sm font-semibold cursor-pointer transition-colors shrink-0 ${
              selectedService === svc.id
                ? "bg-primary text-on-primary font-bold"
                : "bg-surface-container text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {svc.name}
          </button>
        ))}
      </div>

      {/* Category Pills */}
      <div className="flex gap-space-sm overflow-x-auto pb-space-xs scrollbar-none -mx-margin px-margin">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-space-lg py-2 rounded-full font-label-lg text-body-md whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-primary text-on-primary shadow-[0_1px_8px_rgba(163,230,53,0.3)]"
                  : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Format Filter Bar */}
      <div className="flex items-center gap-space-sm flex-wrap">
        <span className="text-label-sm text-on-surface-variant">Filtre qualité :</span>
        <div className="flex gap-2">
          <button
            onClick={() => setQualityFilter("all")}
            className={`px-3 py-1 rounded-full text-label-sm cursor-pointer transition-colors ${
              qualityFilter === "all"
                ? "bg-surface-container-highest text-primary font-bold"
                : "bg-surface-container text-on-surface-variant"
            }`}
          >
            Tous les formats
          </button>
          <button
            onClick={() => setQualityFilter("4k")}
            className={`px-3 py-1 rounded-full text-label-sm cursor-pointer transition-colors ${
              qualityFilter === "4k"
                ? "bg-surface-container-highest text-primary font-bold"
                : "bg-surface-container text-on-surface-variant"
            }`}
          >
            4K HDR
          </button>
          <button
            onClick={() => setQualityFilter("live")}
            className={`px-3 py-1 rounded-full text-label-sm cursor-pointer transition-colors ${
              qualityFilter === "live"
                ? "bg-surface-container-highest text-error font-bold"
                : "bg-surface-container text-on-surface-variant"
            }`}
          >
            En direct (Live)
          </button>
        </div>
      </div>

      {/* Grid of Results */}
      {error ? (
        <div className="bg-surface-container-low p-8 rounded-2xl text-center text-error">
          <span className="material-symbols-outlined text-[36px] mb-2 inline-block">cloud_off</span>
          <p>Impossible de charger le catalogue.</p>
          <p className="text-outline text-[12px] mt-1">{error}</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-space-md">
          {Array.from({ length: 12 }).map((_, i) => (
            <GridCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-surface-container-low p-8 rounded-2xl text-center text-on-surface-variant">
          <span className="material-symbols-outlined text-[36px] text-outline mb-2">
            search_off
          </span>
          <p>Aucun résultat pour ce site ou cette recherche.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-space-md">
          {filteredItems.map((item) => {
            const isFav = favorites.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSelectItem(item);
                }}
                className="group relative rounded-xl overflow-hidden bg-surface-container-low border border-outline-variant/10 shadow-md hover:shadow-xl transition-all cursor-pointer flex flex-col focus:ring-4 focus:ring-primary outline-none"
              >
                {/* Image Container with 16:10 or 3:4 aspect */}
                <div className="aspect-[4/5] w-full relative overflow-hidden bg-surface-container">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${item.fallbackGradient} -z-10`}
                  />

                  {/* Gradient Scrim */}
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent opacity-90" />

                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                    {item.isLive ? (
                      <span className="bg-error text-on-error text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-on-error animate-pulse" /> LIVE
                      </span>
                    ) : (
                      <span className="bg-black/50 backdrop-blur-md text-primary text-[10px] font-bold px-2 py-0.5 rounded">
                        {item.quality}
                      </span>
                    )}
                  </div>

                  {/* Favorite & Download buttons */}
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartDownload(item);
                      }}
                      className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-on-surface hover:text-primary transition-all cursor-pointer"
                      title="Télécharger"
                    >
                      <span className="material-symbols-outlined text-[15px]">download</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(item.id);
                      }}
                      className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-on-surface hover:text-primary transition-all cursor-pointer"
                      title="Favori"
                    >
                      <span
                        className={`material-symbols-outlined text-[15px] ${
                          isFav ? "text-primary fill-current" : ""
                        }`}
                        style={isFav ? { fontVariationSettings: "'FILL' 1" } : undefined}
                      >
                        favorite
                      </span>
                    </button>
                  </div>

                  {/* Bottom title & platform */}
                  <div className="absolute bottom-0 inset-x-0 p-space-sm flex flex-col gap-1 z-10">
                    <span className="text-primary text-[11px] font-semibold truncate">
                      {item.platform}
                    </span>
                    <h3 className="text-on-surface text-label-md font-headline-sm truncate">
                      {item.title}
                    </h3>
                  </div>
                </div>

                <div className="p-space-sm flex items-center justify-between text-body-sm text-on-surface-variant bg-surface-container">
                  <span className="text-label-sm truncate">
                    {item.isLive ? `${item.viewers} spectateurs` : item.duration || "—"}
                  </span>
                  <span className="material-symbols-outlined text-primary text-[18px] group-hover:translate-x-0.5 transition-transform">
                    play_circle
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
