"use client";

import React, { useState } from "react";

interface UpgradeScreenProps {
  onBack: () => void;
  onUpgradeSuccess: () => void;
  isAlreadyPro?: boolean;
}

export const UpgradeScreen: React.FC<UpgradeScreenProps> = ({
  onBack,
  onUpgradeSuccess,
  isAlreadyPro = false,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("monthly");
  const [checkoutStatus, setCheckoutStatus] = useState<"idle" | "processing" | "success">(
    "idle"
  );

  const handleCheckout = () => {
    if (checkoutStatus !== "idle") return;
    setCheckoutStatus("processing");

    setTimeout(() => {
      setCheckoutStatus("success");
      onUpgradeSuccess();
    }, 1200);
  };

  return (
    <div className="flex flex-col relative w-full max-w-xl mx-auto pb-space-xl">
      {/* Top Header with Back button */}
      <div className="flex items-center gap-space-md mb-space-lg">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center text-on-surface rounded-full hover:bg-surface-container-highest transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back_ios_new</span>
        </button>
        <h1 className="text-headline-sm text-on-surface">Upgrade</h1>
      </div>

      <div className="flex flex-col w-full gap-space-lg">
        {/* Hero Glow Banner & Header */}
        <div className="relative overflow-hidden rounded-xl bg-surface-container-high p-space-lg flex flex-col items-center text-center shadow-2xl border border-outline-variant/10">
          {/* Ambient Glow Background Effect */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />

          {/* Crown / VIP Badge */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-500/20 to-primary/30 flex items-center justify-center mb-space-md shadow-inner border border-yellow-500/30">
            <span
              className="material-symbols-outlined text-[32px] text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              workspace_premium
            </span>
          </div>
          <span className="text-label-md uppercase tracking-widest text-primary font-bold mb-space-xs">
            guymaTV Exclusive
          </span>
          <h2 className="text-headline-md text-on-surface mb-space-sm">Passez à guymaTV PRO</h2>
          <p className="text-body-md text-on-surface-variant max-w-xs leading-relaxed">
            Débloquez l'expérience ultime de streaming sans aucune limite ni compromis.
          </p>
        </div>

        {/* Pricing Plan Selector */}
        <div className="grid grid-cols-2 gap-space-md">
          {/* Monthly Card */}
          <div
            onClick={() => setSelectedPlan("monthly")}
            className={`pricing-card relative flex flex-col justify-between p-space-md rounded-xl bg-surface-container cursor-pointer transition-all duration-300 ${
              selectedPlan === "monthly"
                ? "ring-2 ring-primary bg-primary/5 shadow-lg"
                : "ring-1 ring-outline/30 hover:ring-outline"
            }`}
          >
            <div className="flex justify-between items-start mb-space-sm">
              <span className="text-label-lg text-on-surface">Mensuel</span>
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  selectedPlan === "monthly"
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-highest text-transparent"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">check</span>
              </div>
            </div>
            <div>
              <div className="text-headline-md text-primary font-bold">9,99€</div>
              <div className="text-body-sm text-on-surface-variant">/ mois</div>
            </div>
          </div>

          {/* Annual Card */}
          <div
            onClick={() => setSelectedPlan("annual")}
            className={`pricing-card relative flex flex-col justify-between p-space-md rounded-xl bg-surface-container cursor-pointer transition-all duration-300 ${
              selectedPlan === "annual"
                ? "ring-2 ring-primary bg-primary/5 shadow-lg"
                : "ring-1 ring-outline/30 hover:ring-outline"
            }`}
          >
            <div className="absolute -top-3 right-space-md bg-secondary text-on-secondary text-label-sm font-bold px-space-sm py-space-xs rounded-full shadow-md">
              -30% Économie
            </div>
            <div className="flex justify-between items-start mb-space-sm">
              <span className="text-label-lg text-on-surface">Annuel</span>
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  selectedPlan === "annual"
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-highest text-transparent"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">check</span>
              </div>
            </div>
            <div>
              <div className="text-headline-md text-on-surface font-bold">79,99€</div>
              <div className="text-body-sm text-on-surface-variant">/ an (soit 6,66€/mois)</div>
            </div>
          </div>
        </div>

        {/* Comparison List: Free vs PRO */}
        <div className="flex flex-col rounded-xl bg-surface-container p-space-md gap-space-md border border-outline-variant/10">
          <div className="flex justify-between items-center pb-space-sm border-b border-surface-container-highest text-label-lg text-on-surface">
            <span>Fonctionnalités</span>
            <div className="flex gap-space-xl text-center">
              <span className="w-14 text-on-surface-variant">Gratuit</span>
              <span className="w-14 text-primary font-bold">PRO</span>
            </div>
          </div>

          {/* Row 1: Zero Ads */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-primary text-[20px]">block</span>
              <span className="text-body-md text-on-surface">Zéro pub pour toujours</span>
            </div>
            <div className="flex gap-space-xl text-center">
              <span className="w-14 text-on-surface-variant">—</span>
              <span className="w-14 text-primary material-symbols-outlined font-bold">check</span>
            </div>
          </div>

          {/* Row 2: 4K HDR */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-primary text-[20px]">tv</span>
              <span className="text-body-md text-on-surface">Streaming illimité 4K HDR</span>
            </div>
            <div className="flex gap-space-xl text-center">
              <span className="w-14 text-on-surface-variant">720p</span>
              <span className="w-14 text-primary font-bold text-body-md">4K HDR</span>
            </div>
          </div>

          {/* Row 3: VIP Servers */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-primary text-[20px]">bolt</span>
              <span className="text-body-md text-on-surface">Serveurs VIP ultra-rapides</span>
            </div>
            <div className="flex gap-space-xl text-center">
              <span className="w-14 text-on-surface-variant">—</span>
              <span className="w-14 text-primary material-symbols-outlined font-bold">check</span>
            </div>
          </div>

          {/* Row 4: Offline Downloads */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-primary text-[20px]">download</span>
              <span className="text-body-md text-on-surface">Téléchargements hors-ligne</span>
            </div>
            <div className="flex gap-space-xl text-center">
              <span className="w-14 text-on-surface-variant">—</span>
              <span className="w-14 text-primary material-symbols-outlined font-bold">check</span>
            </div>
          </div>

          {/* Row 5: Multi-screen */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-primary text-[20px]">devices</span>
              <span className="text-body-md text-on-surface">Accès multi-écrans</span>
            </div>
            <div className="flex gap-space-xl text-center">
              <span className="w-14 text-on-surface-variant text-body-md">1 écran</span>
              <span className="w-14 text-primary font-bold text-body-md">4 écrans</span>
            </div>
          </div>
        </div>

        {/* Checkout CTA & Security Badges */}
        <div className="flex flex-col gap-space-md pt-space-xs">
          <button
            onClick={handleCheckout}
            disabled={checkoutStatus !== "idle" || isAlreadyPro}
            className={`w-full h-14 rounded-full font-headline-sm flex items-center justify-center gap-space-sm shadow-lg transition-all transform active:scale-95 cursor-pointer ${
              checkoutStatus === "success" || isAlreadyPro
                ? "bg-secondary text-on-secondary"
                : checkoutStatus === "processing"
                  ? "bg-primary-container text-on-primary opacity-80 cursor-wait"
                  : "bg-primary text-on-primary hover:opacity-95 shadow-[0_0_24px_rgba(163,230,53,0.35)]"
            }`}
          >
            {checkoutStatus === "processing" ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                <span>Traitement sécurisé en cours...</span>
              </>
            ) : checkoutStatus === "success" || isAlreadyPro ? (
              <>
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                <span>Félicitations, vous êtes membre guymaTV PRO !</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">lock</span>
                <span>
                  Débloquer PRO ({selectedPlan === "monthly" ? "9,99€/mois" : "79,99€/an"})
                </span>
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-space-md text-on-surface-variant text-label-sm">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[16px] text-secondary">verified_user</span>
              <span>Paiement sécurisé SSL</span>
            </div>
            <span>•</span>
            <span>Annulable à tout moment</span>
          </div>
        </div>
      </div>
    </div>
  );
};
