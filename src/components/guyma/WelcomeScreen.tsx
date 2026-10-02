"use client";

import React, { useState } from "react";

interface WelcomeScreenProps {
  onStart: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleStartClick = () => {
    setIsExiting(true);
    setTimeout(() => {
      onStart();
    }, 280);
  };

  return (
    <div
      className={`flex flex-col relative w-full items-center justify-between min-h-[calc(100vh-180px)] py-space-md transition-all duration-300 ${
        isExiting ? "opacity-0 scale-95" : "opacity-100 scale-100"
      }`}
    >
      {/* Glowing background ambient effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-0 w-60 h-60 bg-secondary/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Top Hero / Logo Area */}
      <div className="flex flex-col items-center text-center z-10 w-full mt-space-lg">
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-high/80 backdrop-blur-md mb-space-lg shadow-sm">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-label-md text-surface-tint tracking-wider uppercase font-headline-sm">
            Expérience 2.0
          </span>
        </div>

        {/* Logo with Reveal Effect */}
        <div className="relative mb-space-md">
          <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full scale-125" />
          <h1 className="font-headline-lg text-[42px] leading-tight text-primary relative z-10 tracking-tight">
            guyma<span className="text-on-surface">TV</span>
          </h1>
        </div>

        {/* Tagline */}
        <p className="font-body-lg text-on-surface-variant max-w-[320px] text-center leading-relaxed">
          Votre portail de streaming gratuit, illimité et sans publicité.
        </p>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md w-full max-w-sm md:max-w-3xl z-10 my-space-lg">
        {/* Feature 1: Zero Ads */}
        <div className="flex items-center gap-space-md p-space-md rounded-2xl bg-surface-container/60 backdrop-blur-xl shadow-sm hover:bg-surface-container-high/80 transition-all duration-300 border border-outline-variant/10">
          <div className="w-12 h-12 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary shrink-0 shadow-inner">
            <span className="material-symbols-outlined text-[24px]">block</span>
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="font-headline-sm text-on-surface truncate">Zéro publicité</h3>
            <p className="font-body-sm text-on-surface-variant">Profitez de vos programmes sans interruption.</p>
          </div>
        </div>

        {/* Feature 2: HD Streaming */}
        <div className="flex items-center gap-space-md p-space-md rounded-2xl bg-surface-container/60 backdrop-blur-xl shadow-sm hover:bg-surface-container-high/80 transition-all duration-300 border border-outline-variant/10">
          <div className="w-12 h-12 rounded-xl bg-secondary-container/20 flex items-center justify-center text-secondary shrink-0 shadow-inner">
            <span className="material-symbols-outlined text-[24px]">hd</span>
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="font-headline-sm text-on-surface truncate">Streaming HD & 4K</h3>
            <p className="font-body-sm text-on-surface-variant">Une qualité visuelle ultra-nette et fluide.</p>
          </div>
        </div>

        {/* Feature 3: Multi-platforms */}
        <div className="flex items-center gap-space-md p-space-md rounded-2xl bg-surface-container/60 backdrop-blur-xl shadow-sm hover:bg-surface-container-high/80 transition-all duration-300 border border-outline-variant/10">
          <div className="w-12 h-12 rounded-xl bg-tertiary-container/20 flex items-center justify-center text-tertiary-fixed-dim shrink-0 shadow-inner">
            <span className="material-symbols-outlined text-[24px]">devices</span>
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="font-headline-sm text-on-surface truncate">Multi-plateformes</h3>
            <p className="font-body-sm text-on-surface-variant">Sur mobile, tablette, TV et navigateur.</p>
          </div>
        </div>
      </div>

      {/* Bottom CTA Action Area */}
      <div className="w-full max-w-sm z-10 flex flex-col items-center gap-space-md pb-space-md">
        <button
          onClick={handleStartClick}
          className="w-full relative group overflow-hidden py-4 px-space-lg rounded-full bg-primary text-on-primary font-headline-sm text-center shadow-[0_0_30px_rgba(163,230,53,0.35)] hover:shadow-[0_0_40px_rgba(163,230,53,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-space-sm cursor-pointer"
        >
          <span className="relative z-10">Commencer l'expérience</span>
          <span className="material-symbols-outlined text-[20px] relative z-10 transition-transform group-hover:translate-x-1">
            arrow_forward
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-primary-fixed to-primary opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        <div className="flex items-center justify-center gap-space-xs text-label-sm text-outline">
          <span className="material-symbols-outlined text-[14px]">lock</span>
          <span>Connexion sécurisée et 100% gratuite</span>
        </div>
      </div>
    </div>
  );
};
