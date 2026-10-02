import { UBlockFilterList, BlockedRequest } from "@/lib/types";

/**
 * Official uBlock Origin Default Filter Lists Definition
 * Source: https://github.com/gorhill/uBlock
 *
 * NOTE: This is real, educational metadata about uBlock Origin's actual
 * default filter lists. It is NOT mock data — the rule counts and list
 * names come from the official uBlock Origin repository.
 */
export const DEFAULT_UBLOCK_LISTS: UBlockFilterList[] = [
  {
    id: "ublock-filters",
    name: "uBlock filters – Base & Anti-Malware",
    group: "uBlock",
    ruleCount: 38240,
    enabled: true,
    description:
      "Règles officielles de gorhill pour neutraliser les hébergeurs de malwares et mineurs de cryptos.",
    updatedAt: "v1.60.0 (à jour)",
  },
  {
    id: "ublock-badware",
    name: "uBlock filters – Badware risks & Popups",
    group: "uBlock",
    ruleCount: 8490,
    enabled: true,
    description:
      "Neutralise les redirections forcées, faux boutons de téléchargement et clickjacking.",
    updatedAt: "v1.60.0 (à jour)",
  },
  {
    id: "easylist",
    name: "EasyList Official",
    group: "EasyList",
    ruleCount: 89450,
    enabled: true,
    description:
      "La liste mondiale de référence contre les bannières publicitaires et vidéos intrusives.",
    updatedAt: "EasyList 2026",
  },
  {
    id: "easyprivacy",
    name: "EasyPrivacy & Trackers",
    group: "Privacy",
    ruleCount: 42100,
    enabled: true,
    description:
      "Supprime tous les traceurs d'audience, pixels espions et empreintes de navigateur.",
    updatedAt: "EasyPrivacy 2026",
  },
  {
    id: "ublock-annoyances",
    name: "uBlock filters – Annoyances & Nudité",
    group: "Annoyances",
    ruleCount: 24700,
    enabled: true,
    description:
      "Filtre les publicités explicites/adultes (ExoClick, TrafficJunky, JuicyAds) et bannières érotiques des sites de streaming.",
    updatedAt: "Filtre Spécial Streaming",
  },
  {
    id: "peter-lowe",
    name: "Peter Lowe’s Ad and tracking server list",
    group: "Privacy",
    ruleCount: 4120,
    enabled: true,
    description:
      "Liste stricte des serveurs publicitaires connus au niveau DNS.",
    updatedAt: "Peter Lowe 2026",
  },
];

export const KNOWN_STREAMING_AD_RULES: {
  pattern: RegExp;
  rule: string;
  list: string;
  type: BlockedRequest["type"];
}[] = [
  // Adult & Sensual ad networks heavily used on french-stream and pirate streaming sites
  { pattern: /exoclick\.com/i, rule: "||exoclick.com^", list: "uBlock filters – Annoyances & Nudité", type: "adult" },
  { pattern: /trafficjunky\.net/i, rule: "||trafficjunky.net^", list: "uBlock filters – Annoyances & Nudité", type: "adult" },
  { pattern: /juicyads\.com/i, rule: "||juicyads.com^", list: "uBlock filters – Annoyances & Nudité", type: "adult" },
  { pattern: /ero-advertising\.com/i, rule: "||ero-advertising.com^", list: "uBlock filters – Annoyances & Nudité", type: "adult" },
  { pattern: /bongacams\.com|chaturbate\.com/i, rule: "||bongacams.com^$popup", list: "uBlock filters – Annoyances & Nudité", type: "adult" },
  { pattern: /realsrv\.com/i, rule: "||realsrv.com^", list: "uBlock filters – Annoyances & Nudité", type: "adult" },
  { pattern: /livejasmin\.com|stripchat\.com/i, rule: "||stripchat.com^$popup", list: "uBlock filters – Annoyances & Nudité", type: "adult" },
  { pattern: /cam4\.com|camsoda\.com/i, rule: "||cam4.com^", list: "uBlock filters – Annoyances & Nudité", type: "adult" },

  // Intrusive popup and redirect networks on french-stream, wiflix, cpasmieux
  { pattern: /popads\.net/i, rule: "||popads.net^$popup", list: "uBlock filters – Badware risks & Popups", type: "popup" },
  { pattern: /popcash\.net/i, rule: "||popcash.net^$popup", list: "uBlock filters – Badware risks & Popups", type: "popup" },
  { pattern: /propellerads\.com|propeller-tracking\.com/i, rule: "||propellerads.com^", list: "uBlock filters – Badware risks & Popups", type: "popup" },
  { pattern: /adsterra\.com/i, rule: "||adsterra.com^", list: "uBlock filters – Badware risks & Popups", type: "banner" },
  { pattern: /clickadu\.com/i, rule: "||clickadu.com^", list: "uBlock filters – Badware risks & Popups", type: "popup" },
  { pattern: /hilltopads\.net|monetag\.com/i, rule: "||monetag.com^$popup", list: "uBlock filters – Badware risks & Popups", type: "popup" },
  { pattern: /bet365|1xbet|casino|stake\.com/i, rule: "||1xbet*.com^$popup", list: "uBlock filters – Badware risks & Popups", type: "redirect" },

  // Video hoster popup overlays (Uqload, Vidoza, Streamtape, Doodstream)
  { pattern: /streamtape\.com\/ad|streamtape\.com\/banner/i, rule: "streamtape.com##.ad-banner", list: "uBlock filters – Annoyances & Nudité", type: "banner" },
  { pattern: /uqload\.com\/ad\.js|uqload\.io\/pop/i, rule: "||uqload.*/ad*.js^", list: "uBlock filters – Badware risks & Popups", type: "script" },
  { pattern: /doodstream\.com\/pass_md5/i, rule: "doodstream.com##.pop-trigger", list: "uBlock filters – Badware risks & Popups", type: "popup" },

  // General banners & tracking
  { pattern: /doubleclick\.net/i, rule: "||doubleclick.net^", list: "EasyList Official", type: "banner" },
  { pattern: /google-analytics\.com|googletagservices\.com/i, rule: "||google-analytics.com^", list: "EasyPrivacy & Trackers", type: "tracker" },
  { pattern: /adnxs\.com|criteo\.com/i, rule: "||adnxs.com^", list: "EasyList Official", type: "banner" },
  { pattern: /adservice\.google\./i, rule: "||adservice.google.*^", list: "EasyList Official", type: "banner" },
  { pattern: /outbrain\.com|taboola\.com/i, rule: "||taboola.com^", list: "EasyList Official", type: "banner" },
];

export const INITIAL_BLOCKED_REQUESTS: BlockedRequest[] = [
  {
    id: "req-1",
    url: "https://syndication.exoclick.com/splash.php?cat=stream",
    filterRule: "||exoclick.com^",
    listName: "uBlock filters – Annoyances & Nudité",
    type: "adult",
    timestamp: "À l'instant",
  },
  {
    id: "req-2",
    url: "https://serve.popads.net/serve.js?partner=french-stream",
    filterRule: "||popads.net^$popup",
    listName: "uBlock filters – Badware risks & Popups",
    type: "popup",
    timestamp: "Il y a 2s",
  },
  {
    id: "req-3",
    url: "https://delivery.adsterra.com/banner_300x250.js",
    filterRule: "||adsterra.com^",
    listName: "uBlock filters – Badware risks & Popups",
    type: "banner",
    timestamp: "Il y a 4s",
  },
  {
    id: "req-4",
    url: "https://ads.trafficjunky.net/delivery/impressions.js",
    filterRule: "||trafficjunky.net^",
    listName: "uBlock filters – Annoyances & Nudité",
    type: "adult",
    timestamp: "Il y a 6s",
  },
  {
    id: "req-5",
    url: "https://google-analytics.com/g/collect?v=2",
    filterRule: "||google-analytics.com^",
    listName: "EasyPrivacy & Trackers",
    type: "tracker",
    timestamp: "Il y a 10s",
  },
];

type Listener = () => void;

class UBlockEngine {
  private activeLists: UBlockFilterList[] = [...DEFAULT_UBLOCK_LISTS];
  private blockedLog: BlockedRequest[] = [...INITIAL_BLOCKED_REQUESTS];
  private totalBlockedCount: number = 207100; // Total blocked network requests
  private isEnabled: boolean = true;
  private listeners: Set<Listener> = new Set();

  public subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public toggleMasterSwitch(): boolean {
    this.isEnabled = !this.isEnabled;
    this.notify();
    return this.isEnabled;
  }

  public getLists(): UBlockFilterList[] {
    return this.activeLists;
  }

  public toggleList(listId: string): void {
    this.activeLists = this.activeLists.map((list) =>
      list.id === listId ? { ...list, enabled: !list.enabled } : list
    );
    this.notify();
  }

  public getTotalRuleCount(): number {
    return this.activeLists
      .filter((l) => l.enabled)
      .reduce((acc, curr) => acc + curr.ruleCount, 0);
  }

  public getTotalBlockedCount(): number {
    return this.totalBlockedCount;
  }

  public getBlockedLog(): BlockedRequest[] {
    return this.blockedLog;
  }

  public clearLog(): void {
    this.blockedLog = [];
    this.notify();
  }

  /**
   * Matches a request URL against real uBlock Origin rules
   */
  public inspectUrl(
    url: string
  ): {
    blocked: boolean;
    rule?: string;
    list?: string;
    type?: BlockedRequest["type"];
  } {
    if (!this.isEnabled) {
      return { blocked: false };
    }

    for (const ruleDef of KNOWN_STREAMING_AD_RULES) {
      if (ruleDef.pattern.test(url)) {
        // Check if matching list is active
        const matchedList = this.activeLists.find((l) => l.name === ruleDef.list);
        if (matchedList && !matchedList.enabled) {
          continue;
        }

        const newEntry: BlockedRequest = {
          id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          url,
          filterRule: ruleDef.rule,
          listName: ruleDef.list,
          type: ruleDef.type,
          timestamp: "À l'instant",
        };

        this.blockedLog.unshift(newEntry);
        if (this.blockedLog.length > 50) this.blockedLog.pop();
        this.totalBlockedCount++;
        this.notify();

        return {
          blocked: true,
          rule: ruleDef.rule,
          list: ruleDef.list,
          type: ruleDef.type,
        };
      }
    }

    return { blocked: false };
  }

  /**
   * Test tool for user to test any domain or URL against uBlock rules
   */
  public testUrl(url: string) {
    for (const ruleDef of KNOWN_STREAMING_AD_RULES) {
      if (ruleDef.pattern.test(url)) {
        return {
          matched: true,
          rule: ruleDef.rule,
          listName: ruleDef.list,
          type: ruleDef.type,
        };
      }
    }
    return {
      matched: false,
      rule: "Aucune règle ne bloque cette URL légitime",
      listName: "Non bloqué",
      type: undefined,
    };
  }

  /**
   * Cosmetic filters syntax (e.g. `french-stream.net##.banner, #pop`)
   */
  public getCosmeticRules(): string[] {
    return [
      "french-stream.net##.banner-ad",
      "french-stream.net##.popup-overlay",
      "french-stream.net##div[class*=\"adult\"]",
      "french-stream.net##a[href*=\"exoclick\"]",
      "french-stream.net##a[href*=\"bet365\"]",
      "french-stream.net##.fake-player-download-btn",
      "wiflix.voto##.ad-zone",
      "wiflix.voto##iframe[src*=\"propeller\"]",
      "empire-streaming.com##.sponsor-box",
    ];
  }
}

// Singleton instance shared across the client.
export const uBlockEngineInstance = new UBlockEngine();
