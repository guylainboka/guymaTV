"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { StreamItem, StreamService } from "@/lib/types";
import { apiUrl } from "@/lib/api-client";
import {
  FILTER_GROUPS,
  FilterGroup,
  FilterOption,
  findFilterOption,
  buildYearFilter,
} from "@/lib/filters";

interface ExplorerScreenProps {
  onSelectItem: (item: StreamItem) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onStartDownload: (item: StreamItem) => void;
  services: StreamService[];
  /**
   * Search query forwarded from the Header. When this prop changes, we sync
   * it to the internal searchInput/searchQuery state and trigger a fetch.
   */
  initialSearch?: string;
}

// ----------------------------------------------------------------------------
// Loading skeleton for catalog cards
// ----------------------------------------------------------------------------
const GridCardSkeleton: React.FC = () => (
  <div className="rounded-xl overflow-hidden bg-surface-container-low border border-outline-variant/10 animate-pulse">
    <div className="aspect-[4/5] w-full bg-surface-container" />
    <div className="p-2 space-y-1.5">
      <div className="h-2 bg-surface-container-highest rounded w-1/3" />
      <div className="h-3 bg-surface-container-highest rounded w-2/3" />
    </div>
  </div>
);

// ----------------------------------------------------------------------------
// Star rating display (out of 5)
// ----------------------------------------------------------------------------
const StarRating: React.FC<{ rating: number; size?: number }> = ({
  rating,
  size = 12,
}) => {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="material-symbols-outlined text-secondary"
          style={{
            fontSize: `${size}px`,
            fontVariationSettings: i <= Math.round(rating) ? "'FILL' 1" : undefined,
            opacity: i <= Math.round(rating) ? 1 : 0.3,
          }}
        >
          star
        </span>
      ))}
    </div>
  );
};

// ----------------------------------------------------------------------------
// Filter dropdown button + panel
// ----------------------------------------------------------------------------
interface FilterDropdownProps {
  group: FilterGroup;
  selectedOptionId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelectOption: (groupId: string, optionId: string) => void;
  onCustomYearSubmit: (year: number) => void;
  customYear: string;
  onCustomYearChange: (value: string) => void;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  group,
  selectedOptionId,
  isOpen,
  onToggle,
  onSelectOption,
  onCustomYearSubmit,
  customYear,
  onCustomYearChange,
}) => {
  const selectedOption = selectedOptionId
    ? group.options.find((o) => o.id === selectedOptionId) || null
    : null;

  // Check if this group is the "Par Année" group (id === "annee").
  const isYearGroup = group.id === "annee";

  const handleYearKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const year = parseInt(customYear, 10);
      if (!isNaN(year) && year >= 1900 && year <= new Date().getFullYear() + 1) {
        onCustomYearSubmit(year);
      }
    }
  };

  const handleYearButtonClick = () => {
    const year = parseInt(customYear, 10);
    if (!isNaN(year) && year >= 1900 && year <= new Date().getFullYear() + 1) {
      onCustomYearSubmit(year);
    }
  };

  return (
    <div className="relative shrink-0">
      {/* Trigger button */}
      <button
        onClick={onToggle}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-body-sm font-semibold transition-all cursor-pointer border whitespace-nowrap ${
          selectedOption
            ? "bg-primary/15 text-primary border-primary/40 font-bold"
            : "bg-surface-container-high text-on-surface-variant border-outline-variant/20 hover:text-on-surface"
        }`}
      >
        <span
          className="material-symbols-outlined text-[16px]"
          style={selectedOption ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          {selectedOption?.icon || group.icon}
        </span>
        <span>{selectedOption ? selectedOption.label : group.label}</span>
        <span
          className={`material-symbols-outlined text-[16px] transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          expand_more
        </span>
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 w-64 max-h-80 overflow-y-auto bg-surface-container-high rounded-xl border border-outline-variant/30 shadow-2xl guyma-scroll animate-fade-in">
          {/* Group header */}
          <div className="sticky top-0 bg-surface-container-high px-3 py-2 border-b border-outline-variant/20 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">
              {group.icon}
            </span>
            <span className="text-label-md font-bold text-on-surface">{group.label}</span>
            <span className="ml-auto text-[10px] text-outline">
              {group.options.length} options
            </span>
          </div>

          {/* Custom year input (only for the "Par Année" group) */}
          {isYearGroup && (
            <div className="sticky top-[37px] bg-surface-container-high px-3 py-2.5 border-b border-outline-variant/20">
              <label className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider">
                Année personnalisée
              </label>
              <div className="flex gap-1 mt-1">
                <input
                  type="number"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  value={customYear}
                  onChange={(e) => onCustomYearChange(e.target.value)}
                  onKeyDown={handleYearKeyDown}
                  placeholder="Ex: 1995"
                  className="flex-1 min-w-0 h-8 px-2 bg-surface-container text-on-surface text-body-sm rounded-lg outline-none focus:ring-2 focus:ring-primary border border-outline-variant/20"
                />
                <button
                  onClick={handleYearButtonClick}
                  className="px-2 h-8 rounded-lg bg-primary text-on-primary text-label-sm font-bold flex items-center gap-1 hover:scale-105 transition-transform cursor-pointer"
                  title="Rechercher cette année"
                >
                  <span className="material-symbols-outlined text-[14px]">search</span>
                </button>
              </div>
              <div className="h-px bg-outline-variant/15 mt-2.5" />
            </div>
          )}

          {/* Options list */}
          <div className="py-1">
            {group.options.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => onSelectOption(group.id, opt.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-body-sm transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-primary/15 text-primary font-bold"
                      : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[16px] shrink-0"
                    style={isSelected ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {opt.icon || "label"}
                  </span>
                  <span className="flex-1 truncate">{opt.label}</span>
                  {isSelected && (
                    <span className="material-symbols-outlined text-[16px] text-primary">
                      check
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------------
// Main ExplorerScreen
// ----------------------------------------------------------------------------
export const ExplorerScreen: React.FC<ExplorerScreenProps> = ({
  onSelectItem,
  favorites,
  onToggleFavorite,
  onStartDownload,
  services,
  initialSearch,
}) => {
  // ---- Search state (controlled input + debounced query) ----
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAppliedSearchRef = useRef<string>("");

  // ---- Filter state ----
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [lastChangedGroup, setLastChangedGroup] = useState<string | null>(null);
  const [activePath, setActivePath] = useState<string | null>(null); // for custom year
  const [customYear, setCustomYear] = useState("");
  const [randomTrigger, setRandomTrigger] = useState(0);

  // ---- Pagination + results state ----
  const [currentPage, setCurrentPage] = useState(1);
  const [items, setItems] = useState<StreamItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---- UI state ----
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);

  // ---- Sync external search (from Header) into internal state ----
  useEffect(() => {
    if (
      initialSearch !== undefined &&
      initialSearch !== lastAppliedSearchRef.current
    ) {
      lastAppliedSearchRef.current = initialSearch;
      setSearchInput(initialSearch);
      setSearchQuery(initialSearch);
      setCurrentPage(1);
    }
  }, [initialSearch]);

  // ---- Close dropdown on outside click ----
  useEffect(() => {
    if (!openDropdown) return;
    const handler = (e: MouseEvent) => {
      if (
        filterBarRef.current &&
        !filterBarRef.current.contains(e.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openDropdown]);

  // ---- Compute the active filter option (the last selected) ----
  const activeFilterOption: FilterOption | null = lastChangedGroup
    ? findFilterOption(activeFilters[lastChangedGroup])
    : null;

  // ---- Determine if any filter is active (for showing reset button) ----
  const hasActiveFilters =
    Object.keys(activeFilters).length > 0 || activePath !== null;

  // ---- Debounced search input → searchQuery ----
  const handleSearchInput = (value: string) => {
    setSearchInput(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchQuery(value);
      setCurrentPage(1);
    }, 500);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }
  };

  const handleClearSearch = () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setSearchInput("");
    setSearchQuery("");
    setCurrentPage(1);
  };

  // ---- Filter selection ----
  const handleSelectOption = (groupId: string, optionId: string) => {
    setActiveFilters((prev) => ({ ...prev, [groupId]: optionId }));
    setLastChangedGroup(groupId);
    setActivePath(null);
    setCurrentPage(1);
    setOpenDropdown(null);
  };

  const handleCustomYearSubmit = (year: number) => {
    const opt = buildYearFilter(year);
    if (!opt) return;
    setActiveFilters((prev) => ({ ...prev, annee: opt.id }));
    setLastChangedGroup("annee");
    setActivePath(opt.path);
    setCurrentPage(1);
    setOpenDropdown(null);
  };

  const handleReset = () => {
    setActiveFilters({});
    setLastChangedGroup(null);
    setActivePath(null);
    setCustomYear("");
    setCurrentPage(1);
    setOpenDropdown(null);
  };

  const handleRandom = () => {
    setActiveFilters({});
    setLastChangedGroup(null);
    setActivePath(null);
    setCustomYear("");
    setSearchInput("");
    setSearchQuery("");
    setCurrentPage(1);
    setOpenDropdown(null);
    setRandomTrigger((t) => t + 1);
  };

  const handleToggleDropdown = (groupId: string) => {
    setOpenDropdown((prev) => (prev === groupId ? null : groupId));
  };

  // ---- Fetch catalog whenever search/filter/page changes ----
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("page", String(currentPage));

    const trimmedSearch = searchQuery.trim();
    if (trimmedSearch) {
      params.set("type", "all");
      params.set("search", trimmedSearch);
    } else if (activePath) {
      params.set("path", activePath);
    } else if (activeFilterOption) {
      params.set("filter", activeFilterOption.id);
    } else if (randomTrigger > 0) {
      params.set("random", "1");
    } else {
      params.set("type", "all");
    }

    const url = apiUrl(`/api/catalog?${params.toString()}`);

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(
        (data: {
          items: StreamItem[];
          totalPages: number;
          currentPage: number;
        }) => {
          if (cancelled) return;
          setItems(data.items || []);
          setTotalPages(data.totalPages || 1);
          setLoading(false);
        }
      )
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Erreur de chargement");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, activePath, activeFilterOption?.id, currentPage, randomTrigger]);

  // ---- Pagination helpers ----
  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    setCurrentPage(p);
    // Scroll to top of grid
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // ---- Retry on error ----
  const handleRetry = useCallback(() => {
    setRandomTrigger((t) => t + 1); // forces effect re-run
  }, []);

  // ---- Compute current results header text ----
  const resultsLabel = (() => {
    if (loading) return "Chargement…";
    if (error) return "Erreur";
    if (searchQuery.trim()) return `Résultats pour « ${searchQuery.trim()} »`;
    if (activeFilterOption) return activeFilterOption.label;
    if (activePath) return `Année ${customYear}`;
    if (randomTrigger > 0) return "Découverte aléatoire";
    return "Catalogue complet";
  })();

  return (
    <div className="flex flex-col w-full gap-space-lg pb-14">
      {/* Header */}
      <div className="flex flex-col">
        <span className="text-on-surface-variant text-body-md">
          Catalogue Universel Multi-Sites
        </span>
        <h1 className="text-headline-md font-headline-md text-on-surface">Explorer</h1>
      </div>

      {/* Top Search Bar — prominent, full-width */}
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <span className="material-symbols-outlined text-outline text-[22px]">search</span>
        </div>
        <input
          value={searchInput}
          onChange={(e) => handleSearchInput(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="w-full pl-12 pr-12 py-3.5 bg-surface-container-low text-on-surface text-body-md rounded-2xl outline-none focus:ring-2 focus:ring-primary placeholder:text-outline transition-all shadow-md border border-outline-variant/15"
          placeholder="Tapez un Titre, un Acteur, un Genre..."
          type="text"
        />
        {searchInput && (
          <button
            onClick={handleClearSearch}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-outline hover:text-on-surface transition-colors cursor-pointer"
            title="Effacer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        )}
      </div>

      {/* Filter Bar — horizontal scroll of dropdown buttons on mobile, wrap on desktop */}
      <div
        ref={filterBarRef}
        className="relative flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none -mx-margin px-margin lg:overflow-visible lg:flex-wrap"
      >
        {FILTER_GROUPS.map((group) => (
          <FilterDropdown
            key={group.id}
            group={group}
            selectedOptionId={activeFilters[group.id] || null}
            isOpen={openDropdown === group.id}
            onToggle={() => handleToggleDropdown(group.id)}
            onSelectOption={handleSelectOption}
            onCustomYearSubmit={handleCustomYearSubmit}
            customYear={customYear}
            onCustomYearChange={setCustomYear}
          />
        ))}

        {/* Reset button (visible when any filter is active) */}
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-body-sm font-semibold bg-error/15 text-error border border-error/30 hover:bg-error/25 transition-all cursor-pointer whitespace-nowrap shrink-0"
            title="Réinitialiser tous les filtres"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Réinitialiser</span>
          </button>
        )}

        {/* Random button */}
        <button
          onClick={handleRandom}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-body-sm font-semibold bg-secondary/15 text-secondary border border-secondary/30 hover:bg-secondary/25 transition-all cursor-pointer whitespace-nowrap shrink-0"
          title="Découverte aléatoire"
        >
          <span className="material-symbols-outlined text-[16px]">shuffle</span>
          <span>Aléatoire</span>
        </button>
      </div>

      {/* Results header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">
            movie
          </span>
          <span className="text-body-md font-headline-sm text-on-surface">
            {resultsLabel}
          </span>
        </div>
        {!loading && !error && items.length > 0 && (
          <span className="text-label-sm text-on-surface-variant">
            {items.length} résultat{items.length > 1 ? "s" : ""}
            {totalPages > 1 && ` · Page ${currentPage}/${totalPages}`}
          </span>
        )}
      </div>

      {/* Error state */}
      {error ? (
        <div className="bg-surface-container-low p-8 rounded-2xl text-center text-error">
          <span className="material-symbols-outlined text-[36px] mb-2 inline-block">
            cloud_off
          </span>
          <p className="font-headline-sm text-body-md">Impossible de charger le catalogue.</p>
          <p className="text-outline text-[12px] mt-1">{error}</p>
          <button
            onClick={handleRetry}
            className="mt-4 px-4 py-2 rounded-xl bg-primary text-on-primary text-body-sm font-bold flex items-center gap-1.5 hover:scale-105 transition-transform cursor-pointer mx-auto"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Réessayer
          </button>
        </div>
      ) : loading ? (
        /* Loading skeletons */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-space-md">
          {Array.from({ length: 12 }).map((_, i) => (
            <GridCardSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        /* Empty state */
        <div className="bg-surface-container-low p-8 rounded-2xl text-center text-on-surface-variant">
          <span className="material-symbols-outlined text-[36px] text-outline mb-2">
            search_off
          </span>
          <p className="font-headline-sm text-body-md text-on-surface">Aucun résultat</p>
          <p className="text-outline text-[12px] mt-1">
            Essayez un autre titre ou modifiez vos filtres.
          </p>
          <button
            onClick={handleReset}
            className="mt-4 px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-body-sm font-bold flex items-center gap-1.5 hover:bg-surface-container-highest transition-colors cursor-pointer mx-auto"
          >
            <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        /* Results grid */
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-space-md">
            {items.map((item) => {
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
                  {/* Poster image */}
                  <div className="aspect-[4/5] w-full relative overflow-hidden bg-surface-container">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${item.fallbackGradient} -z-10`}
                    />

                    {/* Gradient scrim */}
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent opacity-90" />

                    {/* Quality badge (top-left) */}
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

                    {/* Action buttons (top-right) */}
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

                    {/* Title (bottom) */}
                    <div className="absolute bottom-0 inset-x-0 p-space-sm flex flex-col gap-1 z-10">
                      <span className="text-primary text-[11px] font-semibold truncate">
                        {item.platform}
                      </span>
                      <h3 className="text-on-surface text-label-md font-headline-sm truncate">
                        {item.title}
                      </h3>
                      {item.rating && (
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-secondary text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            star
                          </span>
                          <span className="text-on-surface-variant text-[10px] font-semibold">
                            {item.rating}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-space-sm flex items-center justify-between text-body-sm text-on-surface-variant bg-surface-container">
                    <span className="text-label-sm truncate flex items-center gap-1">
                      {item.isLive ? (
                        <>
                          <span className="material-symbols-outlined text-[12px]">visibility</span>
                          {item.viewers}
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[12px]">schedule</span>
                          {item.duration || item.releaseYear || "—"}
                        </>
                      )}
                    </span>
                    <span className="material-symbols-outlined text-primary text-[18px] group-hover:translate-x-0.5 transition-transform">
                      play_circle
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-body-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-container-highest transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                Précédent
              </button>

              <span className="text-body-sm text-on-surface-variant px-3 py-2 bg-surface-container-low rounded-xl border border-outline-variant/15">
                Page <span className="text-primary font-bold">{currentPage}</span> sur {totalPages}
              </span>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-body-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-container-highest transition-colors cursor-pointer"
              >
                Suivant
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* Services chips footer (kept from original) */}
      {services.length > 0 && (
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-margin px-margin">
          <span className="text-label-sm text-outline shrink-0 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">public</span>
            Sources :
          </span>
          {services.map((svc) => (
            <span
              key={svc.id}
              className="px-3 py-1 rounded-full text-label-sm font-semibold shrink-0 bg-surface-container text-on-surface-variant border border-outline-variant/15 flex items-center gap-1"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: svc.color }}
              />
              {svc.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
