"use client";

import React from "react";
import { DownloadItem } from "@/lib/types";

interface DownloadsScreenProps {
  downloads: DownloadItem[];
  onPlayDownloadedItem: (download: DownloadItem) => void;
  onDeleteDownload: (downloadId: string) => void;
  onGoToExplorer: () => void;
}

export const DownloadsScreen: React.FC<DownloadsScreenProps> = ({
  downloads,
  onPlayDownloadedItem,
  onDeleteDownload,
  onGoToExplorer,
}) => {
  const completedDownloads = downloads.filter((d) => d.status === "completed");
  const activeDownloads = downloads.filter((d) => d.status === "downloading");

  const totalSizeGB = (
    downloads.reduce((acc, curr) => acc + (curr.downloadedMB || curr.sizeMB), 0) / 1024
  ).toFixed(2);

  return (
    <div className="flex flex-col w-full gap-space-lg pb-14">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <span className="text-on-surface-variant text-body-md">Lecture Hors-Ligne</span>
          <h1 className="text-headline-md font-headline-md text-on-surface">Téléchargements</h1>
        </div>
        <div className="flex items-center gap-2 bg-surface-container-high px-space-md py-1.5 rounded-full border border-outline-variant/10 text-body-sm">
          <span className="material-symbols-outlined text-[18px] text-primary">download_done</span>
          <span>
            {downloads.length} fichier{downloads.length > 1 ? "s" : ""} ({totalSizeGB} Go)
          </span>
        </div>
      </div>

      {/* Zero Ads Notice */}
      <div className="flex items-center gap-3 p-3 bg-surface-container rounded-xl border border-primary/20 text-body-sm text-primary">
        <span
          className="material-symbols-outlined text-[20px]"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          shield
        </span>
        <span>
          Tous les fichiers téléchargés depuis French-Stream et les autres sites sont nettoyés de
          toute pub et lisibles hors-connexion.
        </span>
      </div>

      {/* Active Downloads if any */}
      {activeDownloads.length > 0 && (
        <div className="space-y-space-sm">
          <h3 className="font-label-lg text-primary">Téléchargements en cours</h3>
          <div className="space-y-2">
            {activeDownloads.map((item) => (
              <div
                key={item.id}
                className="bg-surface-container-low p-space-md rounded-xl border border-outline-variant/10 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-headline-sm text-on-surface text-[15px] truncate">
                    {item.title}
                  </h4>
                  <span className="text-label-sm text-primary font-mono">{item.speed}</span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300 rounded-full"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-body-sm text-on-surface-variant">
                  <span>
                    {(item.downloadedMB / 1024).toFixed(1)} Go / {(item.sizeMB / 1024).toFixed(1)} Go
                  </span>
                  <span>{item.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Downloads */}
      {downloads.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-surface-container-low rounded-2xl border border-outline-variant/10 gap-4 mt-6">
          <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center text-outline">
            <span className="material-symbols-outlined text-[36px]">download_for_offline</span>
          </div>
          <div>
            <h3 className="font-headline-sm text-on-surface mb-1">Aucun téléchargement</h3>
            <p className="text-body-md text-on-surface-variant max-w-sm">
              Téléchargez des films et séries depuis French-Stream, Wiflix ou tout autre site pour
              les regarder sans connexion et sans publicité.
            </p>
          </div>
          <button
            onClick={onGoToExplorer}
            className="mt-2 px-space-lg py-3 rounded-full bg-primary text-on-primary font-label-lg shadow-[0_1px_8px_rgba(163,230,53,0.3)] hover:scale-105 transition-all cursor-pointer"
          >
            Parcourir les films & séries
          </button>
        </div>
      ) : (
        <div className="space-y-space-sm">
          <h3 className="font-label-lg text-on-surface">
            Prêts à regarder ({completedDownloads.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
            {completedDownloads.map((item) => (
              <div
                key={item.id}
                onClick={() => onPlayDownloadedItem(item)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onPlayDownloadedItem(item);
                }}
                className="flex items-center gap-space-md p-space-sm bg-surface-container-low hover:bg-surface-container rounded-xl relative group cursor-pointer transition-all border border-outline-variant/10 focus:ring-4 focus:ring-primary outline-none"
              >
                <div className="w-28 h-20 rounded-lg relative flex-shrink-0 overflow-hidden bg-surface-container-high">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1 left-1 bg-black/70 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded">
                    {item.quality}
                  </div>
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-primary text-[28px]">
                      play_circle
                    </span>
                  </div>
                </div>

                <div className="flex flex-col flex-grow min-w-0 pr-1">
                  <span className="text-[11px] text-primary font-medium truncate">
                    {item.platform}
                  </span>
                  <h4 className="text-on-surface text-label-lg font-headline-sm truncate">
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-2 text-on-surface-variant text-body-sm mt-0.5">
                    <span>{(item.sizeMB / 1024).toFixed(1)} Go</span>
                    <span>•</span>
                    <span className="text-secondary font-medium flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[13px]">offline_pin</span>
                      Hors-ligne
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteDownload(item.id);
                  }}
                  className="p-2 text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                  title="Supprimer le fichier"
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
