"use client";

import React, { useState } from "react";
import { UserSettings } from "@/lib/types";

interface SettingsScreenProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onOpenUpgrade: () => void;
  onShowModalInfo: (title: string, content: string) => void;
  onOpenUBlock?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onUpdateSettings,
  onOpenUpgrade,
  onShowModalInfo,
  onOpenUBlock,
}) => {
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [cacheClearedNotice, setCacheClearedNotice] = useState(false);
  const [logoutNotice, setLogoutNotice] = useState(false);

  const handleClearCache = () => {
    setIsClearingCache(true);
    setTimeout(() => {
      onUpdateSettings({ cacheSizeMB: 12 });
      setIsClearingCache(false);
      setCacheClearedNotice(true);
      setTimeout(() => setCacheClearedNotice(false), 3000);
    }, 600);
  };

  const handleLogout = () => {
    setLogoutNotice(true);
    setTimeout(() => {
      setLogoutNotice(false);
    }, 2500);
  };

  return (
    <div className="flex flex-col w-full space-y-space-lg pb-14">
      {/* Settings Top Bar */}
      <div className="flex items-center justify-between">
        <h1 className="font-headline-md text-on-surface">Paramètres</h1>
        <span className="text-body-sm text-on-surface-variant font-mono">v4.2.0-stable</span>
      </div>

      {/* User Profile Card */}
      <div className="relative bg-surface-container-high rounded-lg p-space-lg overflow-hidden shadow-xl border border-outline-variant/10">
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-space-md relative z-10">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-surface-container-highest flex items-center justify-center relative border border-primary/20">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-container/40 to-surface-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px] text-primary">person</span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-space-xs flex-wrap">
              <h2 className="font-headline-sm text-on-surface truncate">{settings.name}</h2>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-label-sm ${
                  settings.isPro
                    ? "bg-primary text-on-primary font-bold shadow-sm"
                    : "bg-surface-container text-on-surface-variant"
                }`}
              >
                {settings.isPro ? "Membre VIP PRO" : "Standard"}
              </span>
            </div>
            <p className="text-body-sm text-on-surface-variant truncate">{settings.email}</p>
          </div>
        </div>

        {/* Upgrade Banner or Pro Status */}
        <div className="mt-space-md pt-space-md border-t border-outline-variant/10 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-space-xs text-primary text-body-sm">
            <span
              className="material-symbols-outlined text-[16px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              workspace_premium
            </span>
            <span>{settings.isPro ? "Abonnement guymaTV PRO actif" : "Passez à guymaTV PRO"}</span>
          </div>

          <button
            onClick={onOpenUpgrade}
            className="bg-primary text-on-primary px-space-md py-space-xs rounded-full font-label-lg flex items-center gap-space-xs shadow-[0_1px_8px_rgba(163,230,53,0.3)] hover:scale-105 transition-transform cursor-pointer"
          >
            <span>{settings.isPro ? "Gérer PRO" : "Upgrade"}</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* Settings Sections Grid - 2 columns on wide TV/desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
        {/* Moteur Ad-Blocker & Anti-Nudité */}
        <div className="space-y-space-sm">
          <h3 className="font-label-lg text-primary px-space-xs">Protection & Filtrage des Sites</h3>
          <div className="bg-surface-container-high rounded-lg p-space-md space-y-space-md border border-outline-variant/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-md">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    shield
                  </span>
                </div>
                <div>
                  <h4 className="font-body-lg text-on-surface">Bloqueur de pub & popups</h4>
                  <p className="text-body-sm text-on-surface-variant">
                    {settings.adBlockerActive
                      ? "Supprime bannières et redirections (French-Stream, Wiflix...)"
                      : "Filtrage désactivé"}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={settings.adBlockerActive}
                  onChange={(e) => onUpdateSettings({ adBlockerActive: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-on-surface after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-checked:after:bg-on-primary"></div>
              </label>
            </div>

            {/* Anti-nudity & adult filter */}
            <div className="pt-space-md border-t border-outline-variant/10 flex items-center justify-between">
              <div className="flex items-center gap-space-md">
                <div className="w-10 h-10 rounded-full bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">no_adult_content</span>
                </div>
                <div>
                  <h4 className="font-body-lg text-on-surface">Filtre anti-nudité & pubs adultes</h4>
                  <p className="text-body-sm text-on-surface-variant">
                    {settings.antiNudityFilter
                      ? "Neutralise toute pub érotique ou nudité des hébergeurs"
                      : "Filtre adulte inactif"}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={settings.antiNudityFilter}
                  onChange={(e) => onUpdateSettings({ antiNudityFilter: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-on-surface after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary peer-checked:after:bg-on-secondary"></div>
              </label>
            </div>

            {/* uBlock Origin Dashboard Button */}
            {onOpenUBlock && (
              <div className="pt-space-md border-t border-outline-variant/10 flex items-center justify-between">
                <div className="flex items-center gap-space-md">
                  <div className="w-10 h-10 rounded-full bg-red-950/60 text-red-400 border border-red-500/30 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">shield</span>
                  </div>
                  <div>
                    <h4 className="font-body-lg text-on-surface font-semibold">
                      Panneau uBlock Origin
                    </h4>
                    <p className="text-body-sm text-on-surface-variant">
                      Gérer les 6 listes de filtres (EasyList, Anti-Nudité) & journal des requêtes
                    </p>
                  </div>
                </div>
                <button
                  onClick={onOpenUBlock}
                  className="px-3.5 py-1.5 rounded-xl bg-surface-container-highest hover:bg-surface-container-low text-primary font-bold text-body-sm border border-primary/30 transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>Ouvrir</span>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mode TV Grand Écran */}
        <div className="space-y-space-sm">
          <h3 className="font-label-lg text-primary px-space-xs">Affichage & Téléviseurs</h3>
          <div className="bg-surface-container-high rounded-lg p-space-md flex items-center justify-between border border-outline-variant/10">
            <div className="flex items-center gap-space-md">
              <div className="w-10 h-10 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">tv</span>
              </div>
              <div>
                <h4 className="font-body-lg text-on-surface">Mode Smart TV</h4>
                <p className="text-body-sm text-on-surface-variant">
                  {settings.tvMode
                    ? "Interface optimisée pour télécommande & grand écran"
                    : "Affichage adaptatif automatique"}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={settings.tvMode}
                onChange={(e) => onUpdateSettings({ tvMode: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-on-surface after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-checked:after:bg-on-primary"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Lecture & Flux */}
      <div className="space-y-space-sm">
        <h3 className="font-label-lg text-primary px-space-xs">Lecture & Flux</h3>
        <div className="bg-surface-container-high rounded-lg p-space-md space-y-space-md border border-outline-variant/10">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-space-md">
              <div className="w-10 h-10 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">tv</span>
              </div>
              <div>
                <h4 className="font-body-lg text-on-surface">Qualité vidéo par défaut</h4>
                <p className="text-body-sm text-on-surface-variant">Adaptation intelligente</p>
              </div>
            </div>
            <select
              value={settings.videoQuality}
              onChange={(e) => onUpdateSettings({ videoQuality: e.target.value })}
              className="bg-surface-container text-on-surface px-space-md py-space-xs rounded-full text-body-md focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer border border-outline-variant/20"
            >
              <option value="Auto 4K">Auto 4K</option>
              <option value="1080p60">1080p60</option>
              <option value="720p HD">720p HD</option>
              <option value="Éco (Data Saver)">Éco (Data Saver)</option>
            </select>
          </div>

          <div className="pt-space-md border-t border-outline-variant/10 flex items-center justify-between">
            <div className="flex items-center gap-space-md">
              <div className="w-10 h-10 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">high_quality</span>
              </div>
              <div>
                <h4 className="font-body-lg text-on-surface">Audio haute fidélité</h4>
                <p className="text-body-sm text-on-surface-variant">Streaming Lossless & Spatial</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={settings.losslessAudio}
                onChange={(e) => onUpdateSettings({ losslessAudio: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-on-surface after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-checked:after:bg-on-primary"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Stockage & Cache */}
      <div className="space-y-space-sm">
        <h3 className="font-label-lg text-primary px-space-xs">Stockage & Cache</h3>
        <div className="bg-surface-container-high rounded-lg p-space-md space-y-space-md border border-outline-variant/10">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-space-md">
              <div className="w-10 h-10 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">download</span>
              </div>
              <div>
                <h4 className="font-body-lg text-on-surface">Qualité des téléchargements</h4>
                <p className="text-body-sm text-on-surface-variant">1080p optimisé pour l'appareil</p>
              </div>
            </div>
            <select
              value={settings.downloadQuality}
              onChange={(e) => onUpdateSettings({ downloadQuality: e.target.value })}
              className="bg-surface-container text-on-surface px-space-md py-space-xs rounded-full text-body-md focus:outline-none cursor-pointer border border-outline-variant/20"
            >
              <option value="Haute (1080p)">Haute (1080p)</option>
              <option value="Moyenne (720p)">Moyenne (720p)</option>
              <option value="Légère (480p)">Légère (480p)</option>
            </select>
          </div>

          <div className="pt-space-md border-t border-outline-variant/10 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 className="font-body-lg text-on-surface">Cache de l'application</h4>
              <p className="text-body-sm text-on-surface-variant">
                {(settings.cacheSizeMB / 1024).toFixed(1)} Go utilisés sur cet appareil
              </p>
            </div>
            <button
              onClick={handleClearCache}
              disabled={isClearingCache}
              className="bg-surface-container text-on-surface px-space-md py-space-xs rounded-full text-body-md hover:bg-surface-container-highest transition-colors cursor-pointer flex items-center gap-1 border border-outline-variant/20"
            >
              {isClearingCache ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                  <span>Nettoyage...</span>
                </>
              ) : (
                "Vider le cache"
              )}
            </button>
          </div>

          {cacheClearedNotice && (
            <div className="p-2 bg-primary/10 border border-primary/30 rounded-xl text-primary text-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>Cache nettoyé avec succès ! Espace libéré.</span>
            </div>
          )}
        </div>
      </div>

      {/* Personnalisation */}
      <div className="space-y-space-sm">
        <h3 className="font-label-lg text-primary px-space-xs">Personnalisation</h3>
        <div className="bg-surface-container-high rounded-lg p-space-md flex items-center justify-between border border-outline-variant/10">
          <div className="flex items-center gap-space-md">
            <div className="w-10 h-10 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined">palette</span>
            </div>
            <div>
              <h4 className="font-body-lg text-on-surface">Thème visuel</h4>
              <p className="text-body-sm text-on-surface-variant">
                {settings.theme === "neon-olive"
                  ? "Dark Neon Olive (Défaut)"
                  : "Deep Emerald Matrix"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-space-xs">
            <button
              onClick={() => onUpdateSettings({ theme: "neon-olive" })}
              title="Dark Neon Olive"
              className={`w-6 h-6 rounded-full bg-[#0f1412] transition-all cursor-pointer ${
                settings.theme === "neon-olive" ? "ring-2 ring-primary scale-110" : "opacity-70"
              }`}
            />
            <button
              onClick={() => onUpdateSettings({ theme: "deep-emerald" })}
              title="Deep Emerald"
              className={`w-6 h-6 rounded-full bg-[#1c211e] transition-all cursor-pointer ${
                settings.theme === "deep-emerald" ? "ring-2 ring-secondary scale-110" : "opacity-70"
              }`}
            />
          </div>
        </div>
      </div>

      {/* À propos */}
      <div className="space-y-space-sm">
        <h3 className="font-label-lg text-primary px-space-xs">À propos</h3>
        <div className="bg-surface-container-high rounded-lg overflow-hidden divide-y divide-outline-variant/10 border border-outline-variant/10">
          <button
            onClick={() =>
              onShowModalInfo(
                "Conditions Générales d'Utilisation",
                "Bienvenue sur guymaTV. En utilisant notre service, vous bénéficiez d'une plateforme de streaming gratuite, sécurisée et garantie sans interruptions publicitaires. Tous les contenus sont diffusés sous protocoles certifiés haute fidélité."
              )
            }
            className="w-full flex items-center justify-between p-space-md hover:bg-surface-container transition-colors text-left cursor-pointer"
          >
            <span className="text-body-lg text-on-surface">Conditions Générales d'Utilisation</span>
            <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
          </button>
          <button
            onClick={() =>
              onShowModalInfo(
                "Politique de Confidentialité",
                "La confidentialité de vos données est au cœur de l'expérience guymaTV. Aucune donnée de navigation n'est vendue à des tiers, aucun traceur publicitaire n'est inséré dans les flux, et les sessions sont chiffrées de bout en bout."
              )
            }
            className="w-full flex items-center justify-between p-space-md hover:bg-surface-container transition-colors text-left cursor-pointer"
          >
            <span className="text-body-lg text-on-surface">Politique de Confidentialité</span>
            <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
          </button>
          <button
            onClick={() =>
              onShowModalInfo(
                "Centre d'aide & FAQ",
                "Questions fréquentes :\n• Comment profiter de la 4K ? Cliquez sur la roue crantée dans le lecteur ou passez en mode Auto 4K.\n• Le bloqueur est-il compatible avec tous les flux ? Oui, notre moteur propriétaire filtre automatiquement les bannières et coupures publicitaires.\n• Multi-écrans : Avec PRO, connectez jusqu'à 4 appareils simultanément."
              )
            }
            className="w-full flex items-center justify-between p-space-md hover:bg-surface-container transition-colors text-left cursor-pointer"
          >
            <span className="text-body-lg text-on-surface">Centre d'aide & FAQ</span>
            <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Disconnect action */}
      <div className="pt-space-md pb-space-lg text-center">
        <button
          onClick={handleLogout}
          className="text-error text-body-md font-label-lg hover:underline cursor-pointer transition-colors"
        >
          Se déconnecter de guymaTV
        </button>

        {logoutNotice && (
          <p className="mt-2 text-on-surface-variant text-body-sm animate-fade-in">
            Session locale réinitialisée en toute sécurité.
          </p>
        )}
      </div>
    </div>
  );
};
