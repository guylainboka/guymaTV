"use client";

import React, { useState, useRef, useEffect } from "react";
import { StreamItem, CategoryType, StreamService } from "@/lib/types";
import { ServicesBar } from "./ServicesBar";
import { apiUrl } from "@/lib/api-client";

interface DashboardScreenProps {
  onSelectItem: (item: StreamItem) => void;
  onExploreMore: () => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onStartDownload: (item: StreamItem) => void;
  services: StreamService[];
  selectedServiceId: string | null;
  onSelectService: (serviceId: string | null) => void;
  onOpenServicePortal: (service: StreamService) => void;
  userName?: string;
  isPro?: boolean;
  tvMode?: boolean;
}

/**
 * Card skeleton for loading state.
 */
const CardSkeleton: React.FC = () => (
  <div className="flex-shrink-0 w-44 sm:w-48 md:w-52 h-64 sm:h-72 rounded-xl bg-surface-container border border-outline-variant/10 overflow-hidden animate-pulse">
    <div className="w-full h-3/4 bg-surface-container-high" />
    <div className="p-3 space-y-2">
      <div className="h-3 bg-surface-container-highest rounded w-1/3" />
      <div className="h-4 bg-surface-container-highest rounded w-2/3" />
    </div>
  </div>
);

const ChannelSkeleton: React.FC = () => (
  <div className="flex items-center gap-space-md p-space-sm bg-surface-container-low rounded-xl border border-outline-variant/10 animate-pulse">
    <div className="w-32 h-20 rounded-lg bg-surface-container-high" />
    <div className="flex-1 space-y-2">
      <div className="h-3 bg-surface-container-highest rounded w-1/4" />
      <div className="h-4 bg-surface-container-highest rounded w-2/3" />
      <div className="h-3 bg-surface-container-highest rounded w-1/2" />
    </div>
  </div>
);

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onSelectItem,
  onExploreMore,
  favorites,
  onToggleFavorite,
  onStartDownload,
  services,
  selectedServiceId,
  onSelectService,
  onOpenServicePortal,
  userName = "Utilisateur",
  isPro = false,
  tvMode = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("Tous");
  const [searchQuery, setSearchQuery] = useState("");
  const platformCarouselRef = useRef<HTMLDivElement>(null);

  // Fetch state for popular films
  const [films, setFilms] = useState<StreamItem[]>([]);
  const [filmsLoading, setFilmsLoading] = useState(true);
  const [filmsError, setFilmsError] = useState<string | null>(null);

  // Fetch state for series (acts as the "channels" section)
  const [series, setSeries] = useState<StreamItem[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(true);
  const [seriesError, setSeriesError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setFilmsLoading(true);
    setFilmsError(null);
    fetch(apiUrl("/api/catalog?type=films&page=1"))
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: { items: StreamItem[] }) => {
        if (!cancelled) {
          setFilms(data.items || []);
          setFilmsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setFilmsError(err.message || "Erreur de chargement");
          setFilmsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSeriesLoading(true);
    setSeriesError(null);
    fetch(apiUrl("/api/catalog?type=series&page=1"))
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: { items: StreamItem[] }) => {
        if (!cancelled) {
          setSeries(data.items || []);
          setSeriesLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setSeriesError(err.message || "Erreur de chargement");
          setSeriesLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categories: CategoryType[] = [
    "Tous",
    "Cinéma",
    "Séries",
    "Live TV",
    "Animés",
    "Sports",
  ];

  const scrollCarousel = (direction: "left" | "right") => {
    if (platformCarouselRef.current) {
      const scrollAmount = direction === "left" ? -320 : 320;
      platformCarouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Filter films based on category, search query, and selected streaming service
  const filteredPlatforms = films.filter((item) => {
    const matchesCategory =
      selectedCategory === "Tous" || item.category === selectedCategory;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.platform.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesService =
      !selectedServiceId ||
      item.sourceServiceId === selectedServiceId ||
      item.platform.toLowerCase().includes(selectedServiceId.toLowerCase());
    return matchesCategory && matchesSearch && matchesService;
  });

  // Filter series based on category, search query, and selected streaming service
  const filteredChannels = series.filter((item) => {
    const matchesCategory =
      selectedCategory === "Tous" ||
      selectedCategory === "Live TV" ||
      item.category === selectedCategory;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.platform.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesService =
      !selectedServiceId ||
      item.sourceServiceId === selectedServiceId ||
      item.platform.toLowerCase().includes(selectedServiceId.toLowerCase());
    return matchesCategory && matchesSearch && matchesService;
  });

  const featuredHero = films[0];

  const activeService = services.find((s) => s.id === selectedServiceId);

  return (
    <div className="flex flex-col w-full gap-space-lg pb-14">
      {/* TV / Large Screen Hero Spotlight */}
      {(featuredHero || filmsLoading) && (
        <div
          className={`hidden md:block relative w-full rounded-2xl overflow-hidden bg-surface-container-high border border-outline-variant/15 shadow-2xl ${
            tvMode ? "!block mb-2" : ""
          }`}
        >
          <div className="relative h-64 lg:h-80 w-full overflow-hidden">
            {filmsLoading ? (
              <div className="w-full h-full bg-surface-container-high animate-pulse" />
            ) : featuredHero ? (
              <>
                <img
                  src={featuredHero.imageUrl}
                  alt={featuredHero.title}
                  className="w-full h-full object-cover object-center scale-105 filter brightness-75"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/40 to-transparent" />

                {/* Hero Content Overlay */}
                <div className="absolute bottom-6 left-6 lg:left-8 right-6 z-10 flex flex-col gap-2 max-w-xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-primary/25 text-primary text-label-sm px-2.5 py-0.5 rounded font-label-lg backdrop-blur-md border border-primary/30">
                      {featuredHero.platform}
                    </span>
                    <span className="text-secondary text-label-sm font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">hd</span>
                      {featuredHero.quality}
                    </span>
                    {featuredHero.duration && (
                      <span className="text-on-surface-variant text-[12px]">
                        • {featuredHero.duration}
                      </span>
                    )}
                    <span className="text-primary text-[11px] font-semibold flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded">
                      <span className="material-symbols-outlined text-[13px]">shield</span>
                      0 Pub
                    </span>
                  </div>

                  <h2 className="text-headline-lg font-headline-lg text-on-surface tracking-tight text-[28px] lg:text-[34px]">
                    {featuredHero.title}
                  </h2>

                  <p className="text-body-md text-on-surface-variant line-clamp-2 leading-relaxed">
                    {featuredHero.description}
                  </p>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => onSelectItem(featuredHero)}
                      className="px-6 py-2.5 rounded-full bg-primary text-on-primary font-headline-sm text-body-md flex items-center gap-2 shadow-[0_0_20px_rgba(163,230,53,0.35)] hover:scale-105 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                      <span>Lancer le stream</span>
                    </button>

                    <button
                      onClick={() => onStartDownload(featuredHero)}
                      className="px-4 py-2.5 rounded-full bg-surface-container/80 backdrop-blur-md text-on-surface hover:text-primary transition-colors cursor-pointer border border-outline-variant/20 flex items-center gap-1.5 text-body-md"
                      title="Télécharger en 4K"
                    >
                      <span className="material-symbols-outlined text-[18px]">download</span>
                      <span className="hidden sm:inline">Télécharger</span>
                    </button>

                    <button
                      onClick={() => onToggleFavorite(featuredHero.id)}
                      className="p-2.5 rounded-full bg-surface-container/80 backdrop-blur-md text-on-surface hover:text-primary transition-colors cursor-pointer border border-outline-variant/20"
                      title="Favoris"
                    >
                      <span
                        className={`material-symbols-outlined text-[20px] ${
                          favorites.includes(featuredHero.id)
                            ? "text-primary fill-current"
                            : ""
                        }`}
                        style={
                          favorites.includes(featuredHero.id)
                            ? { fontVariationSettings: "'FILL' 1" }
                            : undefined
                        }
                      >
                        favorite
                      </span>
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Greeting & Ad-free Badge Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-col">
          <span className="text-on-surface-variant text-body-md">Bienvenue sur guymaTV</span>
          <h1 className="text-headline-md font-headline-md text-on-surface">
            Bonjour, {userName}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-space-xs bg-surface-container-high px-space-md py-space-xs rounded-full border border-outline-variant/10 shadow-sm">
            <span
              className="material-symbols-outlined text-primary text-[18px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified
            </span>
            <span className="text-label-sm font-label-lg text-primary">
              {isPro ? "VIP 4K Illimité" : "Sans Publicité"}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1 bg-surface-container-high px-3 py-1 rounded-full border border-outline-variant/10 text-[11px] text-secondary">
            <span className="material-symbols-outlined text-[15px]">no_adult_content</span>
            <span>Filtre Adulte Actif</span>
          </div>
        </div>
      </div>

      {/* Streaming Sites & Services Integration Bar */}
      <ServicesBar
        services={services}
        selectedServiceId={selectedServiceId}
        onSelectService={onSelectService}
        onOpenServicePortal={onOpenServicePortal}
      />

      {/* Active Service Filter Banner if filtered */}
      {activeService && (
        <div className="flex items-center justify-between p-3 bg-surface-container-high rounded-xl border border-primary/30 text-body-sm">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-primary text-[20px]">filter_alt</span>
            <span>
              Filtré sur le site : <strong className="text-primary">{activeService.name}</strong>{" "}
              ({activeService.domain})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenServicePortal(activeService)}
              className="px-2.5 py-1 rounded bg-primary text-on-primary text-[11px] font-bold cursor-pointer"
            >
              Portail Nettoyé
            </button>
            <button
              onClick={() => onSelectService(null)}
              className="text-on-surface-variant hover:text-on-surface cursor-pointer text-[12px] underline"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <span className="material-symbols-outlined text-outline">search</span>
        </div>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-10 py-3 bg-surface-container-low text-on-surface text-body-md rounded-full outline-none focus:ring-2 focus:ring-primary placeholder:text-outline transition-all shadow-sm border border-outline-variant/10"
          placeholder="Rechercher films, séries sur French-Stream, Wiflix, etc..."
          type="text"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-outline hover:text-on-surface cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {/* Horizontal Category Selector */}
      <div className="flex gap-space-sm overflow-x-auto pb-space-xs scrollbar-none -mx-margin px-margin">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-space-lg py-2 rounded-full font-label-lg text-body-md whitespace-nowrap transition-all cursor-pointer focus:ring-2 focus:ring-primary outline-none ${
                isActive
                  ? "bg-primary text-on-primary shadow-[0_1px_8px_rgba(163,230,53,0.3)] scale-102 font-bold"
                  : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Featured Top Streaming Platforms Carousel */}
      <div className="flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-headline-sm font-headline-sm text-on-surface">
              Films & Séries Populaires
            </h2>
            {/* Scroll navigation arrows for TV / desktop */}
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={() => scrollCarousel("left")}
                className="w-7 h-7 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest cursor-pointer transition-colors"
                title="Défiler à gauche"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>
              <button
                onClick={() => scrollCarousel("right")}
                className="w-7 h-7 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest cursor-pointer transition-colors"
                title="Défiler à droite"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>
          <button
            onClick={onExploreMore}
            className="text-label-md text-primary font-label-lg hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>Tout voir</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>

        {filmsError ? (
          <div className="bg-surface-container-low p-6 rounded-2xl text-center text-error text-body-sm">
            <span className="material-symbols-outlined text-[28px] mb-2 inline-block">cloud_off</span>
            <p>Impossible de charger les films depuis French-Stream.</p>
            <p className="text-outline text-[12px] mt-1">{filmsError}</p>
          </div>
        ) : filmsLoading ? (
          <div
            ref={platformCarouselRef}
            className="flex gap-space-md overflow-x-auto pb-space-xs scrollbar-none -mx-margin px-margin scroll-smooth"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : filteredPlatforms.length === 0 ? (
          <div className="bg-surface-container-low p-6 rounded-2xl text-center text-on-surface-variant">
            Aucun programme trouvé pour ce filtre de recherche.
          </div>
        ) : (
          <div
            ref={platformCarouselRef}
            className="flex gap-space-md overflow-x-auto pb-space-xs scrollbar-none -mx-margin px-margin scroll-smooth"
          >
            {filteredPlatforms.map((item) => {
              const isFav = favorites.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSelectItem(item);
                  }}
                  className="flex-shrink-0 w-44 sm:w-48 md:w-52 h-64 sm:h-72 rounded-xl overflow-hidden relative group shadow-lg bg-surface-container cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl border border-outline-variant/10 focus:ring-4 focus:ring-primary outline-none"
                >
                  {/* Background Image with Fallback gradient */}
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${item.fallbackGradient} -z-10`}
                  />

                  {/* Gradient Scrim */}
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-black/30 to-black/10 group-hover:from-black group-hover:via-black/50 transition-colors" />

                  {/* Top quick action buttons (Favorite & Download) */}
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartDownload(item);
                      }}
                      className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-on-surface hover:text-primary transition-all cursor-pointer"
                      title="Télécharger pour lecture hors-ligne"
                    >
                      <span className="material-symbols-outlined text-[16px]">download</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(item.id);
                      }}
                      className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-on-surface hover:text-primary transition-all cursor-pointer"
                      title={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
                    >
                      <span
                        className={`material-symbols-outlined text-[16px] ${
                          isFav ? "text-primary fill-current" : "text-on-surface"
                        }`}
                        style={isFav ? { fontVariationSettings: "'FILL' 1" } : undefined}
                      >
                        favorite
                      </span>
                    </button>
                  </div>

                  {/* Play hover badge */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                    <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform">
                      <span className="material-symbols-outlined text-[28px] ml-0.5">play_arrow</span>
                    </div>
                  </div>

                  {/* Bottom details */}
                  <div className="absolute bottom-0 inset-x-0 p-space-md flex flex-col gap-space-xs z-10">
                    <div className="flex items-center gap-1">
                      <span
                        className={`${item.badgeClass} px-2 py-0.5 rounded text-label-sm w-fit font-label-lg backdrop-blur-md`}
                      >
                        {item.platform}
                      </span>
                      <span className="text-[10px] text-white/80 bg-black/50 px-1 rounded">
                        {item.quality}
                      </span>
                    </div>
                    <span className="text-on-surface text-label-lg font-headline-sm truncate">
                      {item.title}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Chaînes Recommandées & Flux Directs */}
      <div className="flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <h2 className="text-headline-sm font-headline-sm text-on-surface">
            Chaînes Recommandées & Directs
          </h2>
          <button
            onClick={onExploreMore}
            className="text-label-md text-primary font-label-lg hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>En direct</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>

        {seriesError ? (
          <div className="bg-surface-container-low p-6 rounded-2xl text-center text-error text-body-sm">
            <span className="material-symbols-outlined text-[28px] mb-2 inline-block">cloud_off</span>
            <p>Impossible de charger les séries depuis French-Stream.</p>
            <p className="text-outline text-[12px] mt-1">{seriesError}</p>
          </div>
        ) : seriesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
            {Array.from({ length: 3 }).map((_, i) => (
              <ChannelSkeleton key={i} />
            ))}
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="bg-surface-container-low p-6 rounded-2xl text-center text-on-surface-variant">
            Aucune série disponible pour ce filtre.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
            {filteredChannels.map((item) => {
              const isFav = favorites.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSelectItem(item);
                  }}
                  className="flex items-center gap-space-md p-space-sm bg-surface-container-low hover:bg-surface-container rounded-xl relative group cursor-pointer transition-all duration-200 border border-outline-variant/10 focus:ring-4 focus:ring-primary outline-none"
                >
                  {/* Channel preview thumbnail */}
                  <div className="w-32 h-20 rounded-lg relative flex-shrink-0 overflow-hidden bg-surface-container-high">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${item.fallbackGradient} -z-10`}
                    />

                    {/* LIVE badge */}
                    <div className="absolute top-2 left-2 bg-error text-on-error text-label-sm px-2 py-0.5 rounded-full flex items-center gap-1 font-label-lg shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-on-error animate-pulse" /> LIVE
                    </div>

                    {/* Play overlay on hover */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-primary text-[28px]">
                        play_circle
                      </span>
                    </div>
                  </div>

                  {/* Information */}
                  <div className="flex flex-col flex-grow min-w-0 pr-1">
                    <div className="flex items-center justify-between">
                      <span className="text-label-md text-primary font-label-lg truncate">
                        {item.platform}
                      </span>
                      <div className="flex items-center gap-1 text-on-surface-variant text-body-sm shrink-0">
                        <span className="material-symbols-outlined text-[14px]">visibility</span>
                        <span>{item.viewers || "—"}</span>
                      </div>
                    </div>
                    <h3 className="text-on-surface text-label-lg font-headline-sm truncate mt-0.5">
                      {item.title}
                    </h3>
                    <p className="text-on-surface-variant text-body-sm truncate mt-0.5">
                      {item.description}
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    {/* Download button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartDownload(item);
                      }}
                      className="p-1.5 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                      title="Télécharger"
                    >
                      <span className="material-symbols-outlined text-[18px]">download</span>
                    </button>

                    {/* Favorite button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(item.id);
                      }}
                      className="p-1.5 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                      title={isFav ? "Retirer" : "Favori"}
                    >
                      <span
                        className={`material-symbols-outlined text-[18px] ${
                          isFav ? "text-primary fill-current" : ""
                        }`}
                        style={isFav ? { fontVariationSettings: "'FILL' 1" } : undefined}
                      >
                        favorite
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
