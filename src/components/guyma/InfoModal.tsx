"use client";

import React from "react";

interface InfoModalProps {
  title: string;
  content: string;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ title, content, onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-surface-container-high rounded-2xl p-space-lg border border-outline-variant/20 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-space-sm border-b border-outline-variant/10 mb-space-md">
          <h3 className="font-headline-sm text-on-surface text-headline-sm">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:text-primary transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="text-body-md text-on-surface-variant whitespace-pre-line leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
          {content}
        </div>

        <div className="mt-space-lg pt-space-sm flex justify-end">
          <button
            onClick={onClose}
            className="px-space-lg py-2 rounded-full bg-primary text-on-primary font-label-lg shadow-sm hover:scale-105 transition-transform cursor-pointer"
          >
            Compris
          </button>
        </div>
      </div>
    </div>
  );
};
