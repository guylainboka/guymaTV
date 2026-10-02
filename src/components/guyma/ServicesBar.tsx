"use client";

import React from "react";
import { StreamService } from "@/lib/types";

interface ServicesBarProps {
  services: StreamService[];
  selectedServiceId: string | null;
  onSelectService: (serviceId: string | null) => void;
  onOpenServicePortal: (service: StreamService) => void;
}

export const ServicesBar: React.FC<ServicesBarProps> = ({
  services,
  selectedServiceId,
  onSelectService,
  onOpenServicePortal,
}) => {
  return (
    <div className="flex flex-col gap-space-sm w-full my-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">hub</span>
          <h2 className="text-headline-sm font-headline-sm text-on-surface text-[17px] sm:text-headline-sm">
            Catalogues Directs des Sites de Streaming
          </h2>
          <span className="hidden sm:inline-flex items-center gap-1 bg-primary/10 text-primary text-[11px] font-semibold px-2 py-0.5 rounded-full border border-primary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Sources Gérées au Back • 0 Pub
          </span>
        </div>

        <span className="text-[11px] text-outline hidden md:inline">
          french-stream.net & hébergeurs intégrés
        </span>
      </div>

      {/* Horizontal row of streaming data sources */}
      <div className="flex gap-space-sm overflow-x-auto pb-space-xs scrollbar-none -mx-margin px-margin">
        {/* "Tous les flux" button */}
        <button
          onClick={() => onSelectService(null)}
          className={`flex items-center gap-2 px-space-md py-2.5 rounded-xl text-body-md font-label-lg whitespace-nowrap transition-all cursor-pointer border ${
            selectedServiceId === null
              ? "bg-primary text-on-primary border-primary shadow-[0_1px_8px_rgba(163,230,53,0.3)] font-bold"
              : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant border-outline-variant/15"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">apps</span>
          <span>Tous les flux réunis</span>
        </button>

        {services.map((service) => {
          const isSelected = selectedServiceId === service.id;
          return (
            <div
              key={service.id}
              className={`flex items-center gap-2 p-1 pl-3 pr-2 rounded-xl text-body-md font-label-lg whitespace-nowrap transition-all border cursor-pointer ${
                isSelected
                  ? "bg-surface-container-high border-primary text-primary shadow-[0_0_12px_rgba(163,230,53,0.25)]"
                  : "bg-surface-container hover:bg-surface-container-high text-on-surface border-outline-variant/15"
              }`}
            >
              <button
                onClick={() => onSelectService(isSelected ? null : service.id)}
                className="flex items-center gap-2 cursor-pointer focus:outline-none"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">
                  {service.icon}
                </span>
                <span className="font-semibold">{service.name}</span>
                <span className="text-[10px] bg-black/40 text-on-surface-variant px-1.5 py-0.5 rounded font-mono">
                  {service.badge}
                </span>
              </button>

              {/* In-app secure browser preview trigger */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenServicePortal(service);
                }}
                className="p-1 rounded-lg hover:bg-surface-container-highest text-on-surface-variant hover:text-primary transition-colors"
                title={`Ouvrir dans le navigateur sécurisé anti-pub`}
              >
                <span className="material-symbols-outlined text-[16px]">open_in_browser</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
