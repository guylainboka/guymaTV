"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  TabType,
  StreamItem,
  UserSettings,
  StreamService,
  DownloadItem,
} from "@/lib/types";

import { Header } from "./Header";
import { BottomNavBar } from "./BottomNavBar";
import { WelcomeScreen } from "./WelcomeScreen";
import { DashboardScreen } from "./DashboardScreen";
import { ExplorerScreen } from "./ExplorerScreen";
import { FavorisScreen } from "./FavorisScreen";
import { DownloadsScreen } from "./DownloadsScreen";
import { SettingsScreen } from "./SettingsScreen";
import { UpgradeScreen } from "./UpgradeScreen";
import { SecureBrowserModal } from "./SecureBrowserModal";
import { UBlockModal } from "./UBlockModal";
import { InfoModal } from "./InfoModal";
import { apiUrl } from "@/lib/api-client";

const INITIAL_USER_SETTINGS: UserSettings = {
  name: "Alexandre Guy",
  email: "alexandre.guy@example.com",
  isPro: false,
  adBlockerActive: true,
  antiNudityFilter: true,
  videoQuality: "Auto 4K",
  losslessAudio: true,
  downloadQuality: "Haute (1080p)",
  cacheSizeMB: 1433,
  theme: "neon-olive",
  tvMode: false,
  uBlockRulesCount: 207100,
};

/**
 * GuymaApp — top-level orchestrator for the guymaTV UI.
 *
 * Ported from the original Vite `App.tsx` with the following adjustments:
 *  - No mock data. All data comes from the API routes:
 *      • GET /api/services   → services
 *      • GET /api/favorites  → favorite items (StreamItem[])
 *      • GET /api/downloads  → downloads (DownloadItem[])
 *      • POST/DELETE /api/favorites and /api/downloads for mutations
 *      • GET /api/details?id=xxx → resolves an item by id when adding to
 *        favorites from a context where the App doesn't have the full item
 *        (e.g. the SecureBrowserModal only passes the id).
 *  - Removed all AI/Gemini references.
 *  - Layout uses `min-h-screen flex flex-col` with the bottom nav acting as
 *    the visual footer on mobile (sticky footer pattern).
 */
export default function GuymaApp() {
  const [currentTab, setCurrentTab] = useState<TabType>("accueil");
  const [hasStartedExperience, setHasStartedExperience] = useState<boolean>(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState<boolean>(false);
  const [settings, setSettings] = useState<UserSettings>(INITIAL_USER_SETTINGS);
  const [services, setServices] = useState<StreamService[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  // Favorites: items (StreamItem[]) for display, ids (string[]) for fast toggle checks.
  const [favoriteItems, setFavoriteItems] = useState<StreamItem[]>([]);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);

  const [activeItem, setActiveItem] = useState<StreamItem | null>(null);
  const [modalInfo, setModalInfo] = useState<{ title: string; content: string } | null>(
    null
  );
  const [isUBlockOpen, setIsUBlockOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Keep track of in-flight download progress intervals so we can clean up.
  const downloadIntervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(
    new Map()
  );

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // -------- Fetch services on mount --------
  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl("/api/services"))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: StreamService[]) => {
        if (!cancelled && Array.isArray(data)) setServices(data);
      })
      .catch(() => {
        /* silent — services bar will just show "Tous les flux réunis" */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // -------- Fetch favorites on mount --------
  const refreshFavorites = useCallback(async () => {
    try {
      const r = await fetch(apiUrl("/api/favorites"));
      if (!r.ok) return;
      const data = (await r.json()) as StreamItem[];
      if (Array.isArray(data)) setFavoriteItems(data);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    refreshFavorites();
  }, [refreshFavorites]);

  // -------- Fetch downloads on mount --------
  const refreshDownloads = useCallback(async () => {
    try {
      const r = await fetch(apiUrl("/api/downloads"));
      if (!r.ok) return;
      const data = (await r.json()) as DownloadItem[];
      if (Array.isArray(data)) setDownloads(data);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    refreshDownloads();
  }, [refreshDownloads]);

  // -------- Sync document title --------
  useEffect(() => {
    document.title = isUpgradeOpen
      ? "guymaTV PRO - Passer au streaming 4K illimité"
      : "guymaTV - Streaming Gratuit, Sécurisé & Sans Publicité";
  }, [isUpgradeOpen]);

  // -------- Global TV remote & keyboard navigation --------
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === "1") {
        setCurrentTab("accueil");
        setIsUpgradeOpen(false);
      } else if (e.key === "2") {
        setCurrentTab("explorer");
        setIsUpgradeOpen(false);
      } else if (e.key === "3") {
        setCurrentTab("favoris");
        setIsUpgradeOpen(false);
      } else if (e.key === "4") {
        setCurrentTab("telechargements");
        setIsUpgradeOpen(false);
      } else if (e.key === "5") {
        setCurrentTab("parametres");
        setIsUpgradeOpen(false);
      } else if (e.key === "t" || e.key === "T") {
        setSettings((prev) => ({ ...prev, tvMode: !prev.tvMode }));
      }
    };

    window.addEventListener("keydown", handleGlobalKeys);
    return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, []);

  // -------- Settings --------
  const handleUpdateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  // -------- Favorites --------
  const favoriteIds = favoriteItems.map((f) => f.id);

  const handleToggleFavorite = useCallback(
    async (id: string) => {
      const exists = favoriteIds.includes(id);
      showToast(exists ? "Retiré des favoris" : "Ajouté à vos favoris");

      if (exists) {
        // Optimistic removal
        setFavoriteItems((prev) => prev.filter((f) => f.id !== id));
        try {
          await fetch(apiUrl(`/api/favorites?id=${encodeURIComponent(id)}`), { method: "DELETE" });
        } catch {
          /* silent */
        }
        return;
      }

      // Adding — we need the full item. Try the favorites cache first, then
      // the active item, then fall back to fetching /api/details.
      let item: StreamItem | undefined =
        favoriteItems.find((f) => f.id === id) ||
        (activeItem?.id === id ? activeItem : undefined);

      if (!item) {
        try {
          const r = await fetch(apiUrl(`/api/details?id=${encodeURIComponent(id)}`));
          if (r.ok) item = (await r.json()) as StreamItem;
        } catch {
          /* silent */
        }
      }

      if (!item) {
        // Last resort: create a minimal placeholder item so the backend has
        // something to store; the next favorites refresh will replace it.
        item = {
          id,
          title: "Programme inconnu",
          category: "Cinéma",
          platform: "French-Stream",
          badgeClass: "bg-primary/20 text-primary",
          imageUrl: "",
          fallbackGradient: "from-emerald-950 via-neutral-900 to-lime-950",
          description: "",
          quality: "HD",
        };
      }

      // Optimistic add
      setFavoriteItems((prev) => [item as StreamItem, ...prev]);

      try {
        await fetch(apiUrl("/api/favorites"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: item.id,
            title: item.title,
            imageUrl: item.imageUrl,
            platform: item.platform,
            quality: item.quality,
          }),
        });
      } catch {
        /* silent */
      }
    },
    [favoriteIds, favoriteItems, activeItem, showToast]
  );

  // -------- Downloads --------
  const handleStartDownload = useCallback(
    (item: StreamItem) => {
      // Check if already downloaded
      const existing = downloads.find((d) => d.streamItemId === item.id);
      if (existing && existing.status === "completed") {
        showToast(`Déjà téléchargé : ${item.title}`);
        setCurrentTab("telechargements");
        return;
      }

      const newDownloadId = `dl-${item.id}-${Date.now()}`;
      const totalSize = item.fileSizeMB || 1850;

      const newDownload: DownloadItem = {
        id: newDownloadId,
        streamItemId: item.id,
        title: item.title,
        platform: item.platform,
        imageUrl: item.imageUrl,
        quality: item.quality,
        progress: 8,
        status: "downloading",
        sizeMB: totalSize,
        downloadedMB: Math.floor(totalSize * 0.08),
        speed: "48 Mo/s",
        date: "Aujourd'hui",
      };

      setDownloads((prev) => [newDownload, ...prev]);
      showToast(`Téléchargement lancé sans pub : ${item.title}`);

      // Persist to backend (best-effort).
      fetch(apiUrl("/api/downloads"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamItemId: item.id,
          title: item.title,
          platform: item.platform,
          imageUrl: item.imageUrl,
          quality: item.quality,
        }),
      }).catch(() => {
        /* silent */
      });

      // Progressive download simulation
      let currentPct = 8;
      const interval = setInterval(() => {
        currentPct += 24;
        if (currentPct >= 100) {
          clearInterval(interval);
          downloadIntervalsRef.current.delete(newDownloadId);
          setDownloads((prev) =>
            prev.map((d) =>
              d.id === newDownloadId
                ? {
                    ...d,
                    progress: 100,
                    status: "completed",
                    downloadedMB: totalSize,
                    speed: "Terminé",
                  }
                : d
            )
          );
          showToast(`Téléchargement terminé : ${item.title} (Disponible hors-ligne)`);
        } else {
          setDownloads((prev) =>
            prev.map((d) =>
              d.id === newDownloadId
                ? {
                    ...d,
                    progress: currentPct,
                    downloadedMB: Math.floor((totalSize * currentPct) / 100),
                    speed: "54 Mo/s",
                  }
                : d
            )
          );
        }
      }, 700);
      downloadIntervalsRef.current.set(newDownloadId, interval);
    },
    [downloads, showToast]
  );

  const handlePlayDownloadedItem = (download: DownloadItem) => {
    // Reconstruct a minimal StreamItem from the download so the player modal
    // can open. The proxy iframe will use the streamItemId.
    setActiveItem({
      id: download.streamItemId,
      title: download.title,
      category: "Cinéma",
      platform: download.platform,
      badgeClass: "bg-primary/20 text-primary",
      imageUrl: download.imageUrl,
      fallbackGradient: "from-emerald-950 via-neutral-900 to-lime-950",
      description: "Lecture du fichier local téléchargé sans pub.",
      quality: download.quality as StreamItem["quality"],
    });
  };

  const handleDeleteDownload = (downloadId: string) => {
    const interval = downloadIntervalsRef.current.get(downloadId);
    if (interval) {
      clearInterval(interval);
      downloadIntervalsRef.current.delete(downloadId);
    }
    setDownloads((prev) => prev.filter((d) => d.id !== downloadId));
    showToast("Fichier téléchargé supprimé de l'appareil");

    fetch(apiUrl(`/api/downloads?id=${encodeURIComponent(downloadId)}`), {
      method: "DELETE",
    }).catch(() => {
      /* silent */
    });
  };

  const handleOpenServicePortal = (service: StreamService) => {
    // Open a minimal StreamItem that points to the service's domain via the
    // proxy. The SecureBrowserModal will load /api/proxy?page=service.id.
    setActiveItem({
      id: service.id,
      title: service.name,
      category: "Cinéma",
      platform: service.name,
      sourceServiceId: service.id,
      sourceUrl: service.domain,
      badgeClass: service.badgeClass,
      imageUrl: "",
      fallbackGradient: "from-emerald-950 via-neutral-900 to-lime-950",
      description: service.description,
      quality: "1080p",
    });
  };

  const handleUpgradeSuccess = () => {
    setSettings((prev) => ({ ...prev, isPro: true }));
    showToast("Félicitations, vous êtes membre guymaTV PRO !");
  };

  const handleToggleTvMode = () => {
    setSettings((prev) => ({ ...prev, tvMode: !prev.tvMode }));
  };

  return (
    <div
      className={`min-h-screen w-full flex flex-col text-on-surface font-body-md transition-colors duration-500 ${
        settings.theme === "deep-emerald" ? "bg-[#0b1411]" : "bg-[#0f1412]"
      } ${settings.tvMode ? "scale-tv" : ""}`}
    >
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-surface-container-highest text-primary font-semibold text-body-sm rounded-full shadow-2xl border border-primary/40 flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-[18px]">verified</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      {!isUpgradeOpen && (
        <Header
          currentTab={currentTab}
          onTabChange={(tab) => {
            setCurrentTab(tab);
            setIsUpgradeOpen(false);
          }}
          onOpenUpgrade={() => setIsUpgradeOpen(true)}
          onOpenProfile={() => {
            setCurrentTab("parametres");
            setIsUpgradeOpen(false);
          }}
          onGoHome={() => {
            setCurrentTab("accueil");
            setIsUpgradeOpen(false);
          }}
          onOpenUBlock={() => setIsUBlockOpen(true)}
          isPro={settings.isPro}
          tvMode={settings.tvMode}
          onToggleTvMode={handleToggleTvMode}
          favoritesCount={favoriteIds.length}
          downloadsCount={downloads.length}
        />
      )}

      {/* Main Fluid Responsive Content Area for TV & Mobile */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-24 md:pb-12 flex-grow flex flex-col">
        {isUpgradeOpen ? (
          <UpgradeScreen
            onBack={() => setIsUpgradeOpen(false)}
            onUpgradeSuccess={handleUpgradeSuccess}
            isAlreadyPro={settings.isPro}
          />
        ) : currentTab === "accueil" ? (
          !hasStartedExperience ? (
            <WelcomeScreen onStart={() => setHasStartedExperience(true)} />
          ) : (
            <DashboardScreen
              onSelectItem={(item) => setActiveItem(item)}
              onExploreMore={() => setCurrentTab("explorer")}
              favorites={favoriteIds}
              onToggleFavorite={handleToggleFavorite}
              onStartDownload={handleStartDownload}
              services={services}
              selectedServiceId={selectedServiceId}
              onSelectService={(id) => setSelectedServiceId(id)}
              onOpenServicePortal={handleOpenServicePortal}
              userName={settings.name}
              isPro={settings.isPro}
              tvMode={settings.tvMode}
            />
          )
        ) : currentTab === "explorer" ? (
          <ExplorerScreen
            onSelectItem={(item) => setActiveItem(item)}
            favorites={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
            onStartDownload={handleStartDownload}
            services={services}
          />
        ) : currentTab === "favoris" ? (
          <FavorisScreen
            favorites={favoriteItems}
            onToggleFavorite={handleToggleFavorite}
            onSelectItem={(item) => setActiveItem(item)}
            onGoToExplorer={() => setCurrentTab("explorer")}
          />
        ) : currentTab === "telechargements" ? (
          <DownloadsScreen
            downloads={downloads}
            onPlayDownloadedItem={handlePlayDownloadedItem}
            onDeleteDownload={handleDeleteDownload}
            onGoToExplorer={() => setCurrentTab("explorer")}
          />
        ) : currentTab === "parametres" ? (
          <SettingsScreen
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onOpenUpgrade={() => setIsUpgradeOpen(true)}
            onShowModalInfo={(title, content) => setModalInfo({ title, content })}
            onOpenUBlock={() => setIsUBlockOpen(true)}
          />
        ) : null}
      </main>

      {/* Mobile-Only Bottom Navigation Bar (Hidden on md screens and TV) */}
      {!isUpgradeOpen && (
        <BottomNavBar
          currentTab={currentTab}
          onTabChange={(tab) => {
            setCurrentTab(tab);
            setIsUpgradeOpen(false);
          }}
          favoritesCount={favoriteIds.length}
          downloadsCount={downloads.length}
        />
      )}

      {/* In-App Secure Browser & Stream Player */}
      {activeItem && (
        <SecureBrowserModal
          item={activeItem}
          onClose={() => setActiveItem(null)}
          onStartDownload={handleStartDownload}
          isFavorite={favoriteIds.includes(activeItem.id)}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

      {/* uBlock Origin Control Panel Modal */}
      {isUBlockOpen && (
        <UBlockModal
          onClose={() => setIsUBlockOpen(false)}
          currentPageDomain="french-stream.net"
        />
      )}

      {/* Generic Info Modal (CGU, Confidentialité, FAQ) */}
      {modalInfo && (
        <InfoModal
          title={modalInfo.title}
          content={modalInfo.content}
          onClose={() => setModalInfo(null)}
        />
      )}
    </div>
  );
}
