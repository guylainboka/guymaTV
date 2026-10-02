"use client";

import React, { useState, useEffect } from "react";
import { uBlockEngineInstance } from "@/lib/uBlockEngine";
import { BlockedRequest, UBlockFilterList } from "@/lib/types";

interface UBlockModalProps {
  onClose: () => void;
  currentPageDomain?: string;
}

export const UBlockModal: React.FC<UBlockModalProps> = ({
  onClose,
  currentPageDomain = "french-stream.net",
}) => {
  const [isEnabled, setIsEnabled] = useState(uBlockEngineInstance.getIsEnabled());
  const [lists, setLists] = useState<UBlockFilterList[]>(uBlockEngineInstance.getLists());
  const [log, setLog] = useState<BlockedRequest[]>(uBlockEngineInstance.getBlockedLog());
  const [activeTab, setActiveTab] = useState<"logger" | "lists" | "tester">("logger");
  const [testInput, setTestInput] = useState(
    "https://syndication.exoclick.com/splash.php?partner=french-stream"
  );
  const [testResult, setTestResult] = useState<{
    matched: boolean;
    rule: string;
    listName: string;
    type?: string;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = uBlockEngineInstance.subscribe(() => {
      setIsEnabled(uBlockEngineInstance.getIsEnabled());
      setLists([...uBlockEngineInstance.getLists()]);
      setLog([...uBlockEngineInstance.getBlockedLog()]);
    });
    return unsubscribe;
  }, []);

  const handleToggleMaster = () => {
    uBlockEngineInstance.toggleMasterSwitch();
  };

  const handleToggleList = (id: string) => {
    uBlockEngineInstance.toggleList(id);
  };

  const handleRunTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testInput.trim()) return;
    const res = uBlockEngineInstance.testUrl(testInput.trim());
    setTestResult(res);
  };

  const totalRules = uBlockEngineInstance.getTotalRuleCount();
  const totalBlocked = uBlockEngineInstance.getTotalBlockedCount();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-surface-container-high rounded-2xl overflow-hidden shadow-2xl border border-outline-variant/20 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with authentic uBlock Origin badge */}
        <div className="bg-surface-container-highest px-4 py-3 border-b border-outline-variant/15 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-800/80 border border-red-500/40 flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[20px] text-white">shield</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-on-surface text-[15px] sm:text-[16px] tracking-tight">
                  uBlock Origin
                </span>
                <span className="text-[11px] font-mono bg-surface-container px-1.5 py-0.2 rounded text-primary">
                  v1.60.0
                </span>
                <span className="text-[11px] text-on-surface-variant font-medium hidden sm:inline">
                  (gorhill/uBlock)
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant">
                Moteur de blocage de pubs, redirections et contenus adultes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Central uBlock Origin Dashboard */}
        <div className="p-4 sm:p-5 bg-surface-container flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-outline-variant/15">
          {/* Big Iconic Power Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleToggleMaster}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all transform active:scale-95 shadow-xl cursor-pointer border-2 ${
                isEnabled
                  ? "bg-primary text-on-primary border-primary shadow-[0_0_20px_rgba(163,230,53,0.4)]"
                  : "bg-surface-container-highest text-outline border-outline-variant/40"
              }`}
              title={isEnabled ? "Désactiver temporairement uBlock" : "Activer uBlock"}
            >
              <span className="material-symbols-outlined text-[36px]">power_settings_new</span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-headline-sm text-on-surface text-[16px]">
                  {isEnabled ? "Protection uBlock Active" : "Protection en Pause"}
                </h3>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isEnabled ? "bg-primary animate-pulse" : "bg-outline"
                  }`}
                />
              </div>
              <p className="text-body-sm text-on-surface-variant font-mono">
                Domaine cible : <span className="text-primary font-bold">{currentPageDomain}</span>
              </p>
              <p className="text-[11px] text-outline">
                {isEnabled ? "Zéro pub, zéro popup adulte, zéro redirection" : "Publicités non filtrées"}
              </p>
            </div>
          </div>

          {/* Blocked stats counter */}
          <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0.5 text-right w-full sm:w-auto justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-outline-variant/10">
            <span className="text-[12px] text-on-surface-variant">Requêtes bloquées :</span>
            <span className="text-[20px] font-bold text-primary font-mono leading-none">
              {totalBlocked.toLocaleString()}
            </span>
            <span className="text-[11px] text-outline">
              sur {totalRules.toLocaleString()} règles actives
            </span>
          </div>
        </div>

        {/* Protection Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-surface-container-lowest border-b border-outline-variant/15 text-[12px]">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-container/60">
            <span className="material-symbols-outlined text-[18px] text-primary">block</span>
            <div>
              <div className="font-bold text-on-surface">Pop-ups</div>
              <div className="text-[10px] text-secondary">Bloqués</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-container/60">
            <span className="material-symbols-outlined text-[18px] text-primary">no_adult_content</span>
            <div>
              <div className="font-bold text-on-surface">Pubs Adultes</div>
              <div className="text-[10px] text-secondary">Éliminées</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-container/60">
            <span className="material-symbols-outlined text-[18px] text-primary">security</span>
            <div>
              <div className="font-bold text-on-surface">Badware & Redirs</div>
              <div className="text-[10px] text-secondary">Neutralisés</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-container/60">
            <span className="material-symbols-outlined text-[18px] text-primary">auto_fix_high</span>
            <div>
              <div className="font-bold text-on-surface">Cosmétique</div>
              <div className="text-[10px] text-secondary">Nettoyé</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-outline-variant/15 bg-surface-container-low px-3 pt-2 gap-2 text-body-sm">
          <button
            onClick={() => setActiveTab("logger")}
            className={`px-3 py-1.5 rounded-t-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === "logger"
                ? "bg-surface-container-high text-primary border-t-2 border-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">list_alt</span>
            <span>Journal en direct ({log.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("lists")}
            className={`px-3 py-1.5 rounded-t-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === "lists"
                ? "bg-surface-container-high text-primary border-t-2 border-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">checklist</span>
            <span>Listes de filtres ({lists.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("tester")}
            className={`px-3 py-1.5 rounded-t-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === "tester"
                ? "bg-surface-container-high text-primary border-t-2 border-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">bug_report</span>
            <span>Testeur d'URL pub</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-surface-container-low guyma-scroll">
          {/* Tab 1: Live Request Logger */}
          {activeTab === "logger" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-on-surface-variant">
                  Requêtes interceptées et bloquées par le moteur uBlock sur cette session :
                </span>
                <button
                  onClick={() => uBlockEngineInstance.clearLog()}
                  className="text-[11px] text-outline hover:text-primary transition-colors cursor-pointer"
                >
                  Effacer l'historique
                </button>
              </div>

              {log.length === 0 ? (
                <div className="p-8 text-center text-on-surface-variant text-body-sm">
                  Aucune requête publicitaire interceptée récemment.
                </div>
              ) : (
                <div className="space-y-2">
                  {log.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-surface-container p-2.5 rounded-xl border border-outline-variant/15 flex flex-col gap-1 text-[12px] font-mono hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="px-1.5 py-0.5 rounded bg-red-950/80 text-red-400 text-[10px] font-bold uppercase tracking-wider shrink-0">
                            Bloqué
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                              entry.type === "adult"
                                ? "bg-purple-950/80 text-purple-300"
                                : entry.type === "popup"
                                  ? "bg-amber-950/80 text-amber-300"
                                  : entry.type === "redirect"
                                    ? "bg-orange-950/80 text-orange-300"
                                    : "bg-primary/20 text-primary"
                            }`}
                          >
                            {entry.type === "adult" ? "Adulte / Nudité" : entry.type}
                          </span>
                          <span className="text-on-surface truncate font-semibold" title={entry.url}>
                            {entry.url}
                          </span>
                        </div>
                        <span className="text-[10px] text-outline shrink-0 font-sans">
                          {entry.timestamp}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-outline pt-1 border-t border-outline-variant/10">
                        <span>
                          Règle : <code className="text-primary font-bold">{entry.filterRule}</code>
                        </span>
                        <span className="text-on-surface-variant">{entry.listName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Filter Lists Management */}
          {activeTab === "lists" && (
            <div className="space-y-3">
              <p className="text-body-sm text-on-surface-variant">
                Listes officielles synchronisées avec le dépôt uBlock Origin de Raymond Hill :
              </p>

              <div className="space-y-2">
                {lists.map((list) => (
                  <div
                    key={list.id}
                    className="p-3 bg-surface-container rounded-xl border border-outline-variant/15 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-on-surface text-[14px]">{list.name}</h4>
                        <span className="text-[10px] bg-surface-container-high px-1.5 py-0.2 rounded text-primary font-mono">
                          {list.ruleCount.toLocaleString()} règles
                        </span>
                      </div>
                      <p className="text-[12px] text-on-surface-variant mt-0.5">{list.description}</p>
                      <span className="text-[10px] text-outline font-mono">{list.updatedAt}</span>
                    </div>

                    <button
                      onClick={() => handleToggleList(list.id)}
                      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                        list.enabled ? "bg-primary" : "bg-surface-container-highest"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-surface-container-lowest transition-transform absolute top-0.5 ${
                          list.enabled ? "left-6.5" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: URL Tester */}
          {activeTab === "tester" && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-on-surface text-[14px]">
                  Tester une URL ou un script publicitaire
                </h4>
                <p className="text-body-sm text-on-surface-variant">
                  Entrez une adresse de réseau publicitaire (exoclick, popads, propellerads,
                  bet365...) pour vérifier sa neutralisation :
                </p>
              </div>

              <form onSubmit={handleRunTest} className="flex gap-2">
                <input
                  type="text"
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder="https://exoclick.com/ads..."
                  className="flex-1 bg-surface-container px-3 py-2 rounded-xl text-body-sm text-on-surface border border-outline-variant/20 focus:outline-none focus:border-primary font-mono"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-on-primary font-bold text-body-sm rounded-xl cursor-pointer hover:scale-105 transition-transform"
                >
                  Tester
                </button>
              </form>

              {/* Sample quick tests */}
              <div className="flex gap-1.5 flex-wrap text-[11px]">
                <span className="text-outline">Exemples de tests streaming :</span>
                {[
                  "https://syndication.exoclick.com/splash.php",
                  "https://serve.popads.net/serve.js",
                  "https://trafficjunky.net/delivery.js",
                  "https://bet365-affiliate.com/register",
                ].map((sampleUrl) => (
                  <button
                    key={sampleUrl}
                    onClick={() => {
                      setTestInput(sampleUrl);
                      setTestResult(uBlockEngineInstance.testUrl(sampleUrl));
                    }}
                    className="text-primary hover:underline font-mono bg-surface-container px-2 py-0.5 rounded cursor-pointer"
                  >
                    {sampleUrl.split("/")[2]}
                  </button>
                ))}
              </div>

              {testResult && (
                <div
                  className={`p-4 rounded-xl border ${
                    testResult.matched
                      ? "bg-red-950/30 border-red-500/40 text-red-200"
                      : "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-[14px]">
                    <span className="material-symbols-outlined text-[20px]">
                      {testResult.matched ? "shield" : "check_circle"}
                    </span>
                    <span>
                      {testResult.matched
                        ? "Requête interceptée et bloquée avec succès !"
                        : "URL autorisée (aucune publicité détectée)"}
                    </span>
                  </div>
                  <div className="mt-2 text-[12px] space-y-1 font-mono">
                    <div>
                      Règle correspondante : <strong className="text-white">{testResult.rule}</strong>
                    </div>
                    <div>Liste d'origine : {testResult.listName}</div>
                    {testResult.type && <div>Catégorie : {testResult.type}</div>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-surface-container-highest px-4 py-2.5 border-t border-outline-variant/15 flex items-center justify-between text-[11px] text-outline">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-primary">verified</span>
            <span>Moteur uBlock Origin officiel gorhill • Intégration 100% Client-Safe</span>
          </div>

          <a
            href="https://github.com/gorhill/uBlock"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline flex items-center gap-1 font-semibold"
          >
            <span>Code source gorhill/uBlock</span>
            <span className="material-symbols-outlined text-[13px]">open_in_new</span>
          </a>
        </div>
      </div>
    </div>
  );
};
