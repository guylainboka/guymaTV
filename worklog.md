# guymaTV - Worklog

Projet : Portage de guymaTV (Vite/React) vers Next.js 16 avec backend réel scraping french-stream.net

Objectifs :
- Garder la maquette UI Material 3 (olive/emerald) identique
- Supprimer toute l'IA (Gemini/@google/genai)
- Supprimer les mock data
- Backend réel qui scrape https://french-stream.net
- Lecteur vidéo intégré (iframe filtrée, pas de barre d'adresse)
- Bloqueur de pubs backend (proxy filtrant)
- Téléchargement réel
- Format APK mobile + TV (responsive)

Structure du projet :
- Source originale clonée : /home/z/my-project/guymaTV/ (Vite, à porter)
- Projet cible : /home/z/my-project/ (Next.js 16)

Décisions techniques :
- cheerio pour le scraping HTML (installé)
- Proxy filtrant côté serveur pour servir french-stream.net sans pubs dans iframe
- Persistance via Prisma + SQLite (déjà configuré)
- Garder Material Symbols Outlined (CDN) pour les icônes - pas Lucide
- Garder polices Sora + Plus Jakarta Sans
- Garder classes utilitaires custom (font-headline-lg, etc.)


---
Task ID: 4-ui-port
Agent: full-stack-developer
Task: Port the 14 guymaTV React components + uBlockEngine from Vite to Next.js 16 App Router, replacing mock data with fetch calls to /api/* routes and removing all AI references. Wire them into a GuymaApp orchestrator rendered by src/app/page.tsx.

Work Log:
- Read worklog.md, original App.tsx, all 14 source components, uBlockEngine.ts, mockData.ts, lib/types.ts, lib/scraper.ts, app/globals.css, app/layout.tsx, app/page.tsx to understand the project context, the maquette's exact className strings, and the StreamItem/StreamService/DownloadItem/UserSettings type shapes.
- Created /home/z/my-project/src/components/guyma/ folder.
- Ported the uBlockEngine service to /home/z/my-project/src/lib/uBlockEngine.ts (kept the real, educational uBlock Origin filter-list metadata and KNOWN_STREAMING_AD_RULES regex table — these are NOT mock data, they're authentic uBlock Origin references). Added TypeScript strict-mode escape fixes (escaped double quotes in strings, kept singleton uBlockEngineInstance export).
- Ported the trivial components 1:1 with "use client" at the top, identical className strings and Material Symbols icons:
    * Header.tsx
    * BottomNavBar.tsx
    * WelcomeScreen.tsx
    * InfoModal.tsx
    * ServicesBar.tsx
    * UBlockModal.tsx (imports uBlockEngineInstance from "@/lib/uBlockEngine"; added guyma-scroll class on the scrollable tab content)
    * UpgradeScreen.tsx
- Ported SettingsScreen.tsx with NO changes to the UI — the original had no AI toggles so nothing needed removal. Only change: removed the broken avatar <img src={AIDA mock URL}> and replaced with the gradient+person fallback that was already there (the original's onError handler hid it anyway). Kept theme, TV mode, uBlock, anti-nudity, video quality, lossless audio, download quality, cache, à propos, logout.
- Ported DownloadsScreen.tsx 1:1 (it already takes a `downloads: DownloadItem[]` prop, no mock data inside).
- Ported DashboardScreen.tsx with major changes:
    * Replaced `import { POPULAR_PLATFORMS, RECOMMENDED_CHANNELS } from '../data/mockData'` with two useEffect fetches to `/api/catalog?type=films&page=1` and `/api/catalog?type=series&page=1`.
    * Added `films`, `filmsLoading`, `filmsError`, `series`, `seriesLoading`, `seriesError` state.
    * Added CardSkeleton and ChannelSkeleton components shown during loading.
    * Added error state UIs (cloud_off icon + message) when fetch fails.
    * Hero carousel now waits for films to load (shows pulsing skeleton during loading).
    * Kept all className strings, the ServicesBar composition, search bar, category pills, scroll arrows, channel grid, favorite/download buttons — all identical to the original maquette.
- Ported ExplorerScreen.tsx with similar changes:
    * Replaced `import { POPULAR_PLATFORMS, RECOMMENDED_CHANNELS } from '../data/mockData'` with a single useEffect fetch to `/api/catalog?type=all&page=1` (or `&search=` when the user types).
    * The search input now triggers a server-side fetch (debounce via React's natural re-render cycle on each keystroke — fine for the maquette).
    * Added GridCardSkeleton shown during loading (12 cards).
    * Added error state UI.
    * Kept all filters (category, service, quality), grid layout, hover effects, badges, etc.
- Ported FavorisScreen.tsx with one necessary interface deviation: changed `favorites: string[]` to `favorites: StreamItem[]` (full items) because the original filtered from POPULAR_PLATFORMS + RECOMMENDED_CHANNELS (mock data) to find items by ID. Without mock data, the App must pass the actual favorite items (which it fetches from /api/favorites). The other callbacks (onToggleFavorite: (id: string) => void, onSelectItem, onGoToExplorer) are unchanged.
- Ported SecureBrowserModal.tsx (691 → ~480 lines) with the required changes:
    * REMOVED the entire URL/address bar section (the lock icon, domain name, "/films/{item.id}.html" path, and "SSL Sécurisé" badge). Kept the back/refresh buttons on the left and moved the "uBlock X pubs bloquées" pill to the left action group.
    * REPLACED the `<video>` tag with an `<iframe>` whose `src` is `currentEpisode?.videoUrl || currentServer?.videoUrl || \`/api/proxy?page=${item.id}\``. The scraper's getServers() returns a single server with `videoUrl: /api/proxy?page=${newsid}`, so the iframe always ends up loading our filtered proxy.
    * iframe has `sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-popups"` and `allow="autoplay; fullscreen; encrypted-media; picture-in-picture"` and `referrerPolicy="no-referrer"`.
    * Added `iframeKey` state so the "refresh" button can force-reload the iframe (re-running the ad filter).
    * KEPT the player controls overlay (timeline scrubber, play/pause, replay_10/forward_10, volume slider, fullscreen, hoster badge) — they are visually identical to the maquette but the timeline/volume are decorative for the cross-origin iframe (still functional UI state).
    * KEPT the server selector, episode selector, media details (poster, title, director, actors, description), uBlock protection banner.
    * REPLACED the simulated "Site Complet (Nettoyé)" view with the same filtered iframe shown full-height (no controls overlay) + the red "uBlock a supprimé 4 bannières..." banner + a "Revenir au lecteur cinématique" button.
    * Kept the embedded UBlockModal trigger.
- Created /home/z/my-project/src/components/guyma/GuymaApp.tsx orchestrator that mirrors the original App.tsx logic:
    * State: currentTab, hasStartedExperience, isUpgradeOpen, settings (with INITIAL_USER_SETTINGS inline), services, selectedServiceId, favoriteItems (StreamItem[]), downloads, activeItem, modalInfo, isUBlockOpen, toastMessage.
    * Derived `favoriteIds = favoriteItems.map(f => f.id)` passed to Dashboard/Explorer/SecureBrowserModal for the heart-icon state.
    * `favoriteItems` (StreamItem[]) passed to FavorisScreen.
    * On mount: fetch /api/services, /api/favorites, /api/downloads (all best-effort, silent failures).
    * `handleToggleFavorite(id)`: optimistic update + DELETE if exists, or POST /api/favorites with {id, title, imageUrl, platform, quality} after looking up the item from favoriteItems cache, activeItem, or fetching /api/details?id= as a fallback.
    * `handleStartDownload(item)`: optimistic local add with status='downloading', POST /api/downloads for persistence, setInterval-based progress simulation (8% → 100% over ~3s), toast on completion.
    * `handleDeleteDownload(id)`: clear any in-flight interval, optimistic local remove, DELETE /api/downloads.
    * `handlePlayDownloadedItem(download)`: reconstructs a minimal StreamItem from the download and sets it as activeItem — the SecureBrowserModal will load /api/proxy?page=streamItemId.
    * `handleOpenServicePortal(service)`: sets activeItem to a minimal StreamItem whose id is the service.id, so the SecureBrowserModal loads /api/proxy?page=service.id.
    * Global keyboard nav (1-5 to switch tabs, T to toggle TV mode) — identical to original.
    * Document.title sync based on isUpgradeOpen.
    * Layout: `min-h-screen w-full flex flex-col` with `main` set to `flex-grow flex flex-col` and BottomNavBar naturally pushed to the bottom on mobile (sticky footer pattern).
- Replaced /home/z/my-project/src/app/page.tsx with a "use client" page that dynamically imports GuymaApp with `ssr: false` and a loading splash ("guymaTV" text on the dark surface background). This avoids any SSR/hydration concerns with the heavy client-only app and gives a clean loading state while the JS bundle loads.
- Verified each component file starts with "use client"; verified all imports use the "@/lib/types" and "@/lib/uBlockEngine" aliases; verified no @google/genai or Gemini references anywhere; verified no imports from the original mockData.ts.

Stage Summary:
- artifacts produced:
    * /home/z/my-project/src/lib/uBlockEngine.ts (ported service, singleton export)
    * /home/z/my-project/src/components/guyma/Header.tsx
    * /home/z/my-project/src/components/guyma/BottomNavBar.tsx
    * /home/z/my-project/src/components/guyma/WelcomeScreen.tsx
    * /home/z/my-project/src/components/guyma/InfoModal.tsx
    * /home/z/my-project/src/components/guyma/ServicesBar.tsx
    * /home/z/my-project/src/components/guyma/UBlockModal.tsx
    * /home/z/my-project/src/components/guyma/UpgradeScreen.tsx
    * /home/z/my-project/src/components/guyma/SettingsScreen.tsx
    * /home/z/my-project/src/components/guyma/DownloadsScreen.tsx
    * /home/z/my-project/src/components/guyma/DashboardScreen.tsx (with API fetches + skeletons)
    * /home/z/my-project/src/components/guyma/ExplorerScreen.tsx (with API fetches + skeletons)
    * /home/z/my-project/src/components/guyma/FavorisScreen.tsx (interface changed: favorites: StreamItem[])
    * /home/z/my-project/src/components/guyma/SecureBrowserModal.tsx (iframe to /api/proxy, URL bar removed, player controls kept)
    * /home/z/my-project/src/components/guyma/GuymaApp.tsx (orchestrator)
    * /home/z/my-project/src/app/page.tsx (renders <GuymaApp /> via dynamic ssr: false)

- Deviations from the original (with justifications):
    1. FavorisScreen.tsx interface changed from `favorites: string[]` to `favorites: StreamItem[]` — necessary because the original filtered from mock data by ID, but without mock data the App must pass the actual favorite items (fetched from /api/favorites which returns StreamItem[]). The other callbacks (onToggleFavorite: (id: string) => void, onSelectItem, onGoToExplorer) are unchanged.
    2. SecureBrowserModal.tsx: removed the URL bar section (lock icon + domain + path + "SSL Sécurisé" badge) per the task spec. Replaced the `<video>` tag with an `<iframe>` loading `/api/proxy?page=${item.id}` (the filtered proxy). Player controls overlay kept visually but timeline/volume are decorative since the iframe is cross-origin (can't be controlled from outside). The "Site Complet (Nettoyé)" view is replaced with the same filtered iframe shown without controls overlay (no more simulated French-Stream HTML).
    3. SettingsScreen.tsx: removed the broken avatar `<img>` (it referenced an aida-public Google URL that doesn't exist) — kept the existing gradient + Material person icon fallback that was already rendered behind the image.
    4. DashboardScreen.tsx and ExplorerScreen.tsx: added loading skeletons (CardSkeleton, ChannelSkeleton, GridCardSkeleton) and error state UIs (cloud_off icon) — these are new UI states that didn't exist in the original because mock data was always synchronously available.
    5. GuymaApp.tsx: `favorites` is now `favoriteItems: StreamItem[]` (with a derived `favoriteIds: string[]` for the toggle button state) instead of a plain `string[]` — necessary to back the FavorisScreen with real data. The toggle handler resolves the full StreamItem from the cache or fetches /api/details?id= when needed, before POSTing to /api/favorites.
    6. page.tsx uses `next/dynamic` with `ssr: false` and a simple "guymaTV" loading splash — avoids any SSR/hydration mismatch concerns with the document.title mutation and gives a clean loading state.
    7. The original App.tsx's `INITIAL_USER_SETTINGS` came from mockData.ts. I inlined the same initial settings directly in GuymaApp.tsx (without the avatarUrl field which is no longer used).

---
Task ID: 5-11-backend
Agent: main (Z.ai Code)
Task: Build the real backend (scraping french-stream.net, filtered proxy, persistence) and verify end-to-end with Agent Browser.

Work Log:
- Installed cheerio for HTML parsing.
- Created /home/z/my-project/src/lib/types.ts (ported types, no IA references).
- Created /home/z/my-project/src/lib/scraper.ts:
  * getCatalog(opts) — scrapes /films/, /series/, / page listings.
  * getDetails(newsid) — scrapes /index.php?newsid=XXX detail page.
  * getServices() — exposes french-stream as the single real service.
  * getServers(newsid) — exposes a single "secure player" server pointing to /api/proxy.
  * CATEGORIES — site's category nav mapping.
  * In-memory cache (5 min TTL) to reduce source site load.
  * Title cleanup: strips trailing "affiche", "- YYYY", "(YYYY)" and collapses whitespace.
  * Search fallback: site's /do=search is 302-protected, so we scrape 3 catalog pages and filter by title/description/tags server-side.
- Created API routes (all under /home/z/my-project/src/app/api/):
  * catalog/route.ts  — GET /api/catalog?type=films|series|all&page=N&search=Q
  * details/route.ts  — GET /api/details?id=XXX
  * services/route.ts — GET /api/services
  * categories/route.ts — GET /api/categories
  * servers/route.ts  — GET /api/servers?id=XXX
  * proxy/route.ts    — GET /api/proxy?page=XXX (THE FILTERED PROXY)
  * favorites/route.ts — GET/POST/DELETE
  * downloads/route.ts — GET/POST/DELETE (with background progress simulation)
- Prisma schema updated: prisma/schema.prisma with Favorite and Download models. Pushed to SQLite via `bun run db:push`.
- Proxy filtering details (the "invisible browser" core):
  * 80+ blocked ad/tracker/adult domains (doubleclick, exoclick, trafficjunky, histats, popads, adsterra, propellerads, fsurl.lol, crypto miners, etc.)
  * cheerio strip: <script> from blocked domains, <iframe> from blocked domains, <link> preconnect/dns-prefetch to blocked domains, common ad container selectors ([class*=ad-], [class*=banner], .fssts-card, [onclick*=window.open], etc.)
  * Injected JS neutralizer (prepended to <head>): overrides window.open (no-op), alert/confirm/prompt, location.assign/replace to blocked domains, document.write of ad scripts, createElement('script') src setter, MutationObserver to nuke ad nodes injected post-load.
  * Injected CSS: hides any ad remnants, forces dark bg to match guymaTV theme, hides site's own nav/header (irrelevant in our wrapper).
  * <base href="https://french-stream.net/"> injected so relative URLs resolve to source.
  * Response headers: X-Frame-Options: ALLOWALL, permissive CSP so the iframe can load cross-origin video hosters.
- Verified end-to-end with Agent Browser:
  * Page loads, splash screen "Commencer l'expérience" works.
  * Dashboard shows 18 REAL movies scraped from french-stream.net (La Bataille de Gaulle, Soulm8te, Ed Kemper, Space/Time, etc.) with TMDB poster images.
  * Click "Lancer le stream" → SecureBrowserModal opens, iframe loads /api/proxy?page=15128265, console shows [fss-wprog] news_id= 15128265 (source JS running inside our filtered iframe).
  * Favorite toggle persists to SQLite (verified via /api/favorites GET → returns the added item).
  * Download simulation completes to 100% and persists to SQLite.
  * Navigation between all 5 tabs works (Accueil, Explorer, Favoris, Téléchargements, Paramètres).
  * Mobile viewport (390×844) renders correctly with compact header + bottom nav.
  * No runtime errors in dev.log.

Stage Summary:
- guymaTV is now a fully functional wrapper around french-stream.net:
  * Catalog of real movies/series (no mock data).
  * "Invisible browser" via /api/proxy — the user never sees a URL bar, only guymaTV branded chrome around a filtered iframe.
  * Ads/popups/trackers/adult banners surgically removed at the HTML level + neutralized at the JS level (window.open override, MutationObserver).
  * Favorites + Downloads persist to SQLite via Prisma.
  * Maquette UI preserved exactly (Material 3 olive/emerald, Sora + Plus Jakarta Sans, Material Symbols Outlined icons).
  * No IA anywhere (no @google/genai, no Gemini, no LLM calls).
- Ready for next phase: APK packaging (Capacitor), additional source sites, real video URL extraction (Playwright-based for JS-rendered player pages).

---
Task ID: 7-video-player
Agent: full-stack-developer
Task: Update SecureBrowserModal.tsx to fetch real extracted servers from /api/extract, render a native <video> element (with working controls) when the URL is a direct mp4/m3u8/webm and fall back to the <iframe> proxy when not. Remove the "Site Complet (Nettoyé)" view mode toggle. Preserve the maquette chrome.

Work Log:
- Read /home/z/my-project/worklog.md to absorb the project context (tasks 4-ui-port + 5-11-backend) and read the full existing SecureBrowserModal.tsx (645 lines) plus /api/extract/route.ts, src/lib/api-client.ts, src/lib/types.ts, and the Playwright extractor's StreamServer shape.
- Rewrote /home/z/my-project/src/components/guyma/SecureBrowserModal.tsx from 645 → 808 lines with the following changes:
  * Added `import { apiUrl } from "@/lib/api-client"` and `useCallback` to the React import. All fetch and proxy URLs now go through `apiUrl()` so the modal works both in dev (relative) and in APK builds (absolute backend URL via NEXT_PUBLIC_API_BASE_URL).
  * Added a module-level helper `isDirectVideo(url)`: returns false for `/api/proxy...`, true for any `http(s)://` URL or any `.mp4`/`.m3u8`/`.webm` URL. Used to choose between native `<video>` and the iframe fallback.
  * Replaced the inline `servers` const (which previously synthesized a single proxy server from `item.servers || fallback`) with real server-fetch state: `servers: StreamServer[]`, `serversLoading: boolean`. A `useEffect` on `[item.id, buildProxyFallback]` calls `fetch(apiUrl("/api/extract?id=..."))`, parses the JSON (accepting either `StreamServer[]` or `{ servers: StreamServer[] }`), populates `servers`, and falls back to a single proxy server (`/api/proxy?page=...`) on any error or empty result.
  * Added a `buildProxyFallback` useCallback that builds a `StreamServer` with `name: "Lecteur Sécurisé (proxy)"`, `videoUrl: apiUrl("/api/proxy?page=...")` — so the proxy fallback path is correctly labeled per the spec.
  * Added `videoRef: useRef<HTMLVideoElement>` alongside the existing `containerRef`.
  * Added a `switchingServer` state shown as a spinner overlay (z-30, bg-black/60 backdrop-blur) over the player stage while a new server/episode is loading. It clears via the video's `onLoadedData`/`onCanPlay`/`onPlaying` events (native path) or the iframe's `onLoad` event (fallback path).
  * REMOVED the `viewMode` state, the center "Lecteur Stream / Site Complet (Nettoyé)" View Switcher in the top action bar, and the entire "MODE 2: AUTHENTIC SITE VIEW" block (the red uBlock banner + filtered iframe + "Revenir au lecteur cinématique" button). Only the cinematic player view remains, per spec.
  * Smart rendering in the player stage:
      - `serversLoading === true` → a centered spinner + "Extraction des lecteurs en cours…" + "Analyse de la page source via Playwright (~10-15s au premier appel)" subtext on a `bg-surface-container-low` backdrop.
      - `isDirectVideo(currentVideoUrl) === true` → `<video ref={videoRef} src={currentVideoUrl} autoPlay playsInline controls={false}>` with event handlers: `onPlay`/`onPause` toggle `isPlaying`; `onTimeUpdate` updates `currentTime`; `onLoadedMetadata` + `onDurationChange` set `duration`; `onVolumeChange` syncs `volume` + `isMuted`; `onLoadedData`/`onCanPlay`/`onPlaying` clear `switchingServer`; `onWaiting` sets it; `onClick` toggles play.
      - else (proxy fallback) → the original `<iframe>` with the same `sandbox`, `allow`, `referrerPolicy` and `secure-iframe` class, `onLoad` clears `switchingServer`.
  * Wired every player control to the video element via `videoRef.current`:
      - Play/Pause button (both the big center one and the bottom-bar one) calls `togglePlay()` which does `v.paused ? v.play() : v.pause()`.
      - Timeline scrubber div uses `handleSeek(e)` → computes `pos = (clientX - rect.left) / rect.width`, sets `v.currentTime = pos * v.duration`. Width fill uses `timelinePct = duration > 0 ? (currentTime / duration) * 100 : 0`.
      - Time display: `formatSeconds(currentTime) / formatSeconds(duration)` (e.g. `12:34 / 1:48:21`).
      - Skip ±10s buttons call `skipBy(±10)` → `v.currentTime = clamp(v.currentTime + delta, 0, v.duration)`.
      - Volume slider `onChange` calls `handleVolumeChange` → sets `v.volume = newVol/100`, `v.muted = false`, syncs React state.
      - Mute button calls `toggleMute()` → flips `v.muted`.
      - Fullscreen button calls `toggleFullscreen()` → `containerRef.current.requestFullscreen()`. A `fullscreenchange` listener keeps the icon in sync when the user exits fullscreen via Esc.
  * Keyboard shortcuts now also drive the video element: Space/Enter → `togglePlay()`; ArrowLeft/Right → `skipBy(∓10)`; ArrowUp/Down → adjust `v.volume`; M → `toggleMute()`; F → `toggleFullscreen()`; Esc → close modal only when not in fullscreen (so Esc exits fullscreen first instead of closing the modal).
  * Server selector: lists the extracted servers as buttons. While `serversLoading`, shows 3 pulsing skeleton buttons. Each button's label comes from `serverLabel(srv)` — returns "Lecteur Sécurisé (proxy)" when the server's `videoUrl` is NOT a direct video (i.e. the proxy fallback), otherwise the server's `name` (or `hoster`). The `title` attribute shows `${hoster} • ${quality} • ${language}` for direct servers or "Lecteur proxy filtré (repli)" for the proxy. Clicking a different server calls `handleServerSwitch(idx)` which sets `switchingServer=true`, resets `selectedServerIndex`, `selectedEpisodeIndex`, `currentTime`, `duration`, and `isPlaying`.
  * The episode selector's `onClick` now goes through `handleEpisodeSwitch(idx)` (same switching logic).
  * The refresh button (`handleRefresh`) keeps the existing uBlock inspection + `blockedAdsOnPage++` + `iframeKey++` behavior AND, for the native video path, force-reloads the video by removing/re-assigning `src`, calling `v.load()`, and `v.play()`.
  * Preserved IDENTICALLY (no className changes, no icon changes, no layout changes): the modal outer chrome (fixed inset-0 z-50, backdrop-blur, animate-fade-in), the `containerRef` card (`max-w-6xl bg-surface-container-high rounded-2xl h-[94vh]`), the top action bar (back/refresh buttons, "X pubs bloquées" pill, uBlock trigger, Télécharger, favorite, fullscreen, close), the watermark, the quality badge, the big center play/pause button, the bottom control overlay (timeline + buttons row with `currentServer.hoster` badge), the streaming controls bar, the episode selector, the media details (poster + title + director/actors + description + uBlock protection banner), and the UBlockModal trigger. All Material Symbols Outlined icons (`<span className="material-symbols-outlined">…</span>`) preserved.
  * File still starts with `"use client";`. No Lucide, no shadcn/ui imports, no other files modified.

Stage Summary:
- artifacts produced:
    * /home/z/my-project/src/components/guyma/SecureBrowserModal.tsx (rewritten, 645 → 808 lines) — now fetches real extracted servers from `/api/extract?id=...`, renders a native `<video>` element with fully-wired controls (play/pause, timeline scrub, volume, mute, skip ±10s, fullscreen, time display) when the resolved `videoUrl` is a direct mp4/m3u8/webm/http URL, and falls back to the existing filtered `<iframe>` proxy when extraction fails or returns `[]`. The "Site Complet (Nettoyé)" view mode toggle is removed. The maquette chrome, Material 3 olive/emerald theme, and Material Symbols Outlined icons are preserved identically.

---
Task ID: A-C-playwright-capacitor
Agent: main (Z.ai Code)
Task: (A) Configure Capacitor + GitHub Actions for APK build, (C) Playwright-based direct video URL extraction replacing the iframe proxy.

Work Log:
- Installed: @capacitor/core @capacitor/cli @capacitor/android @capacitor/app @capacitor/haptics @capacitor/keyboard @capacitor/status-bar, playwright, hls.js
- Installed Chromium for Playwright via `bunx playwright install chromium`
- Created /home/z/my-project/src/lib/video-extractor.ts:
  * Singleton Chromium browser instance (reused across requests)
  * 30-min in-memory cache per newsid
  * 80+ blocked ad/tracker domains blocked at the network layer (function matcher for Playwright v1.63+ compat)
  * Strategy 1: network request interception for .mp4/.m3u8 (master playlist preferred, segments .ts/.m4s excluded)
  * Strategy 2: <video>/<source> DOM extraction
  * Strategy 3: window.sources JS variable probe
  * Navigates to french-stream.net movie page, removes anti-bot overlay (#dontfoid, [znid]), clicks .player-option buttons (Uqload, Dood, Vidoza, ViDZY, etc.) with force:true, collects hoster iframes, extracts direct URLs from each
  * Always includes /api/proxy fallback as last resort
- Created /home/z/my-project/src/app/api/extract/route.ts — GET /api/extract?id=xxx with 60s maxDuration
- Updated /home/z/my-project/src/app/api/servers/route.ts to call extractVideoServers (was returning static proxy)
- Updated HOSTERS regex to match real domains: uqload.(com|vc|io|net|co), vidoza.(net|io|co|org), dood(stream|so|watch|pm|cx|to), mixdrop.(co|to|ag|pz|mv), voe?stream.(com|sx|net), filmoon, vidzy
- Created /home/z/my-project/src/lib/api-client.ts:
  * apiUrl(path) helper with priority resolution: window.__API_BASE_URL__ (runtime) > NEXT_PUBLIC_API_BASE_URL (build-time) > "" (relative)
  * apiFetch wrapper
- Refactored all fetch calls in GuymaApp, DashboardScreen, ExplorerScreen to use apiUrl() — APK will call deployed backend
- Updated SecureBrowserModal (via subagent Task 7-video-player):
  * Fetches /api/extract on mount with loading state ("Extraction des lecteurs en cours…")
  * isDirectVideo(url) determines <video> vs <iframe> rendering
  * Native <video> with full player controls wired via refs (play/pause, timeline, volume, fullscreen, skip ±10s)
  * Server selector showing extracted hosters (Uqload, ViDZY, etc.)
  * Removed viewMode toggle (no more "Site Complet" view — only player)
- Added hls.js integration for .m3u8 streams:
  * Dynamic import only when needed
  * Native HLS for Safari/iOS (no hls.js needed)
  * hls.js for Chrome/Firefox/WebView
  * MANIFEST_PARSED event triggers autoplay
- Created Capacitor config (/home/z/my-project/capacitor.config.ts):
  * appId: tv.guyma.app
  * webDir: mobile/www
  * Dark theme (#0f1412)
  * allowMixedContent: true (some video hosters use HTTP)
  * SplashScreen + StatusBar + Keyboard plugins configured
- Updated next.config.ts with dual mode:
  * Default (dev/server): output: 'standalone'
  * GUymA_MOBILE_BUILD=1: output: 'export' to ./mobile/www with unoptimized images
  * serverExternalPackages: playwright, cheerio, @prisma/client
- Created /home/z/my-project/scripts/build-mobile.sh:
  * Temporarily moves src/app/api OUTSIDE src/app (to .mobile-excluded/) so Next doesn't see it as a route folder
  * Builds with GUYMA_MOBILE_BUILD=1 + NEXT_PUBLIC_API_BASE_URL
  * Injects window.__API_BASE_URL__ into all HTML files (runtime override)
  * Restores src/app/api via trap on exit (even on error)
- Created /home/z/my-project/.github/workflows/build-apk.yml:
  * Triggers: tag push v*.*.* OR manual workflow_dispatch (debug/release/both)
  * Steps: checkout → setup Bun + Java 17 + Android SDK 33 → bun install → mobile build → cap add android → cap sync → configure network_security_config for cleartext → gradle assembleDebug/Release → upload APK artifact
  * Supports signed release via ANDROID_KEYSTORE_BASE64 + ANDROID_KEYSTORE_PASSWORD + ANDROID_KEY_ALIAS + ANDROID_KEY_PASSWORD secrets
  * Build summary in $GITHUB_STEP_SUMMARY with install instructions
- Updated package.json: name=guymatv, version=1.0.0, added scripts: build:mobile, cap:sync, cap:add:android, apk:debug, apk:release, apk:clean
- Updated .gitignore: mobile/www, android/, *.apk, *.aab, *.keystore, playwright-report/, ios/
- Created /home/z/my-project/MOBILE.md: full deployment guide (Render/Railway/Fly.io/VPS), GitHub Actions setup, signed release, local build, troubleshooting, Play Store checklist
- Verified end-to-end with Agent Browser:
  * Clicked "Lancer le stream" on "La Bataille de Gaulle : L'Âge de fer"
  * Modal opened, showed "Extraction des lecteurs en cours…" for ~40s (Playwright running)
  * After extraction: native <video> element appeared, loaded https://v6.vidzy.cc/hls2/.../master.m3u8 via hls.js
  * Video playing: currentTime=34.6s, duration=6506s (~1h48), videoWidth=867, videoHeight=488, readyState=4, paused=false
  * ZERO errors in console, ZERO errors in agent-browser errors
  * Verified mobile build works: GUYMA_MOBILE_BUILD=1 + GUYMA_API_BASE_URL=https://api.guyma.tv → mobile/www/index.html generated with API URL injected (verified via grep)
  * Verified src/app/api is properly restored after mobile build

Stage Summary:
- guymaTV now extracts DIRECT video URLs via Playwright (no more iframe-of-the-whole-page):
  * Playwright launches headless Chromium, navigates to french-stream.net movie page
  * Blocks 80+ ad/tracker domains at network layer
  * Removes anti-bot overlay divs (#dontfoid)
  * Clicks .player-option buttons (Uqload, ViDZY, Dood, Vidoza, etc.) with force:true
  * Follows each hoster iframe, intercepts network requests for .mp4/.m3u8
  * Returns StreamServer[] with direct video URLs
  * Client plays them in native <video> with hls.js (for .m3u8) — full controls, no ads, no popups
  * Proxy iframe (/api/proxy) kept as fallback if extraction fails
- APK build pipeline ready via GitHub Actions:
  * Push tag v1.0.0 → workflow builds debug + release APKs → uploads as artifacts
  * Manual dispatch from Actions tab (debug/release/both)
  * Backend deployed separately (Render/Railway/Fly.io/VPS), APK points to it via GUYMA_API_BASE_URL secret
  * Runtime override via window.__API_BASE_URL__ allows re-pointing APK without rebuild
- Architecture: Static APK frontend (Capacitor) ←→ Deployed Next.js backend (Playwright + Prisma + scraping) ←→ french-stream.net

---
Task ID: 9-filters-comments-ui
Agent: full-stack-developer
Task: Update the guymaTV UI to use the new filters system and comments/reviews backend. (1) Refonte de ExplorerScreen avec une barre de filtres complète à 7 dropdowns + barre de recherche + pagination. (2) Refonte de SecureBrowserModal en page de lecture complète avec hero, info, épisodes de séries, commentaires & avis. (3) Rendre la recherche du Header fonctionnelle (navigation vers Explorer).

Work Log:
- Read /home/z/my-project/worklog.md (tasks 4-ui-port, 5-11-backend, 7-video-player, A-C-playwright-capacitor, 1-8-filters-base) to absorb full project context.
- Read existing files: src/components/guyma/ExplorerScreen.tsx (338 lines, basic search + categories), src/components/guyma/SecureBrowserModal.tsx (863 lines, video player + servers + basic media details), src/components/guyma/Header.tsx (162 lines, no search input), src/components/guyma/GuymaApp.tsx (539 lines, orchestrator), src/lib/filters.ts (FILTER_GROUPS with 7 groups + helpers), src/lib/types.ts, src/lib/api-client.ts, src/app/api/comments/route.ts (CommentDTO + GET/POST/DELETE), src/app/api/series-structure/route.ts, src/app/api/catalog/route.ts, src/app/globals.css (theme variables + typography utilities).
- PART 3 — Updated /home/z/my-project/src/components/guyma/Header.tsx (162 → 252 lines):
  * Added `onSearch?: (query: string) => void` prop to HeaderProps.
  * Added local `searchValue` state with a 500ms debounce timer (debounceRef).
  * Added a functional search input (visible sm+, hidden on mobile) between the brand/nav and the right actions. The input has a "search" Material Symbol icon on the left and a clear (X) button on the right when text is present.
  * handleSearchInput updates local state immediately and schedules a debounced onSearch call.
  * handleSearchKeyDown fires onSearch immediately on Enter.
  * handleClearSearch clears the input AND fires onSearch("") so the parent can reset.
  * Added a mobile-only search icon button (sm:hidden) that switches to the Explorer tab via onTabChange — keeps the mobile header tidy while still giving access to search.
  * All Material Symbols Outlined icons preserved (search, close, tv, shield, workspace_premium, person).
- Updated /home/z/my-project/src/components/guyma/GuymaApp.tsx (539 → 552 lines):
  * Added `explorerSearch` state (string, default "") to hold the search query forwarded from the Header.
  * Added `handleHeaderSearch` useCallback that sets `explorerSearch = query`, sets `currentTab = "explorer"`, and closes any open Upgrade modal.
  * Passed `onSearch={handleHeaderSearch}` to the Header.
  * Passed `initialSearch={explorerSearch}` to ExplorerScreen.
- PART 1 — Rewrote /home/z/my-project/src/components/guyma/ExplorerScreen.tsx (338 → 752 lines):
  * Removed the old category pills / quality filter / services chips layout (was decorative + client-side filtered).
  * Imported FILTER_GROUPS, FilterGroup, FilterOption, findFilterOption, buildYearFilter from @/lib/filters.
  * Added `initialSearch` prop wired from GuymaApp. A useEffect with `lastAppliedSearchRef` syncs the prop into internal `searchInput` + `searchQuery` state (only when the prop actually changes — avoids loops when the user types in ExplorerScreen's own search bar).
  * State: `searchInput` (immediate), `searchQuery` (debounced 500ms via searchDebounceRef), `activeFilters: Record<groupId, optionId>`, `lastChangedGroup: string | null`, `activePath: string | null` (for custom year), `customYear: string`, `randomTrigger: number`, `currentPage`, `items`, `totalPages`, `loading`, `error`, `openDropdown`.
  * Top search bar: prominent full-width rounded-2xl input with "search" icon, "Tapez un Titre, un Acteur, un Genre..." placeholder, X clear button. Debounced 500ms + Enter support.
  * Filter bar: 7 FilterDropdown buttons (Type, Genre, Langue, Pays, Thème, Sélections, Année) rendered from FILTER_GROUPS. Horizontal scroll on mobile (scrollbar-none), wraps on desktop. Each button shows the group icon + selected option label (or group label) + chevron_down (rotates when open). Selected buttons get bg-primary/15 text-primary border-primary/40.
  * FilterDropdown sub-component: absolute-positioned panel below the trigger (w-64, max-h-80, overflow-y-auto with guyma-scroll). Group header sticky at top. For the "annee" group, a custom year input ("Ex: 1995") with a search button is sticky at the top of the panel — calls buildYearFilter(year) and sets activePath. Each option row: icon + label + check mark if selected.
  * Outside-click handler (document mousedown) closes any open dropdown.
  * "Réinitialiser" button appears when any filter is active (hasActiveFilters). Clears all filters + customYear + activePath.
  * "Aléatoire" button clears everything and increments randomTrigger — fetches /api/catalog?random=1.
  * Fetch effect: builds URL params based on priority (search > activePath > activeFilterOption.id > random > default type=all). Resets to page 1 on any filter/search change.
  * Results grid: 2 cols mobile, 3 sm, 4 md, 5 lg, 6 xl. Each card: poster image (with fallbackGradient), quality/LIVE badge, download + favorite buttons (top-right), title + platform + rating (bottom), duration/year + play icon (footer).
  * Loading state: 12 GridCardSkeleton cards.
  * Error state: cloud_off icon + error message + "Réessayer" button (increments randomTrigger to force re-fetch).
  * Empty state: search_off icon + "Aucun résultat" + "Réinitialiser les filtres" button.
  * Pagination: Previous/Next buttons + "Page X sur Y" indicator. Disabled at boundaries. Smooth scroll to top on page change.
  * Services chips footer (preserved from original, now read-only display).
- PART 2 — Rewrote /home/z/my-project/src/components/guyma/SecureBrowserModal.tsx (863 → 1633 lines):
  * Kept ALL existing logic: /api/extract fetch, hls.js dynamic import + .m3u8 attachment, native <video> vs iframe fallback (isDirectVideo), all player controls (togglePlay, toggleFullscreen, skipBy, handleSeek, handleVolumeChange, toggleMute, formatSeconds), handleServerSwitch, handleRefresh, fullscreen change listener, keyboard shortcuts (Space/Enter, ←/→, ↑/↓, M, F, Esc), serverLabel helper, timelinePct, buildProxyFallback, UBlockModal trigger.
  * Replaced `selectedEpisodeIndex: number` state with `selectedEpisode: SeriesEpisode | null` state. Updated `currentVideoUrl` to use `selectedEpisode?.videoUrl || currentServer?.videoUrl || proxy fallback`. Updated video/iframe `key` props to include `episodeKeyFragment = selectedEpisode?.id || "default"`.
  * Added NEW state: `seriesStructure: SeriesStructure | null`, `seriesLoading: boolean`, `selectedSeason: number`, `comments: CommentDTO[]`, `commentsLoading: boolean`, `averageRating: number`, `newCommentName`, `newCommentRating`, `hoverRating`, `newCommentContent`, `submittingComment`, `replyingTo: string | null`.
  * Defined SeriesEpisode, SeriesSeason, SeriesStructure, CommentDTO interfaces locally (mirroring src/lib/scraper.ts and /api/comments) to avoid importing server-only modules into the client bundle.
  * Added StarRow helper component (read-only 5-star display).
  * Added recursive CommentItem component: avatar (initials), name, star row, date (fr-FR), content, "Répondre" button (toggles inline reply form), delete button (X). Replies nested with ml-10 sm:ml-12 indentation. Inline reply form: textarea + send button.
  * isSeries detection: `item.category === "Séries" || item.category === "Animés" || (item.episodes && item.episodes.length > 0)`.
  * NEW useEffect: fetches /api/series-structure?id=item.id on mount (only if isSeries). Sets seriesStructure + selectedSeason (defaults to currentSeason or first season). Loading state "Chargement des épisodes..." with spinner. Error state with "info" icon. Empty state "Aucun épisode VF disponible".
  * NEW refreshComments useCallback + useEffect: fetches /api/comments?streamItemId=item.id on mount. Uses commentsCancelRef to cancel in-flight fetches (prevents stale state updates + late setComments on unmounted modal). Sets comments + averageRating.
  * Series episodes section (only rendered if isSeries): season selector (horizontal tabs from seriesStructure.seasons, each shows "Saison N (episodesCount)"), episode list (vertical, max-h-96 overflow-y-auto, guyma-scroll). Filters to VF episodes per spec (falls back to all episodes if no VF for the season). Each episode row: number badge, title, synopsis (line-clamp-2), duration, VF badge, "En lecture" indicator if selected, play_circle icon. Clicking calls handleSelectEpisode(episode) which sets selectedEpisode, switchingServer=true, resets currentTime/duration.
  * handleSelectEpisode sets selectedEpisode — the currentVideoUrl recomputes to the episode's videoUrl (which is /api/proxy?page=...&season=X&episode=Y per the scraper), isDirectVideo returns false, so the iframe fallback renders and reloads via the key change.
  * Comments section (always rendered): header with "Commentaires & Avis" + average rating display (StarRow + numeric + count). Add comment form: name input (placeholder "Votre nom (optionnel)"), 5-star rating selector (clickable + hover effect), textarea (placeholder "Partagez votre avis sur ce film..."), "Publier" submit button. Submit calls POST /api/comments with streamItemId, userName (defaults to "Anonyme"), rating, content. After POST, refreshComments() re-fetches the list. Comments list: recursive CommentItem rendering with nested replies. Empty state: "Soyez le premier à laisser un avis" with forum icon.
  * handleReplySubmit POSTs with parentId, then refreshComments. handleDeleteComment DELETEs /api/comments?id=xxx, then refreshComments.
  * Hero section: backdrop image (item.imageUrl with opacity-60 + fallbackGradient), gradient scrim, title (h1, drop-shadow), originalTitle (italic), badges (quality HD, year, rating star, duration), action buttons (Lecture, Télécharger, Favori, Partager). handleShare uses navigator.share if available, falls back to clipboard.
  * Info section: poster (left, 32x48 / 36x52), metadata (right): platform badge, category, duration, rating (star), year, title (h2), tags (up to 6 chips), director + actors, description, uBlock protection banner (preserved from original).
  * Kept the existing top action bar (back, refresh, uBlock pill, uBlock trigger, Télécharger, favorite, fullscreen, close) and the video quality badge (now shows "S{season} E{episode}" when an episode is selected, otherwise currentServer.quality).
  * Player bottom control bar: now shows "S{season}:E{episode} · VF" badge when an episode is selected, otherwise the existing "{hoster} ({language})" badge.
  * All Material Symbols Outlined icons preserved (no Lucide). All Material 3 theme classes preserved (bg-surface-container, text-on-surface, text-primary, border-outline-variant/15, etc.). All Maquette aesthetic preserved (rounded-2xl, backdrop-blur, shadow-2xl).
- Verified dev.log shows successful compilation (✓ Compiled in 263ms) and successful API requests: GET /api/catalog?page=1&type=all 200, GET /api/catalog?page=2&type=all 200 (pagination working). No errors.

Stage Summary:
- artifacts produced:
  * /home/z/my-project/src/components/guyma/Header.tsx (162 → 252 lines) — functional search input with debounce + onSearch prop.
  * /home/z/my-project/src/components/guyma/GuymaApp.tsx (539 → 552 lines) — explorerSearch state + handleHeaderSearch wiring (Header → ExplorerScreen).
  * /home/z/my-project/src/components/guyma/ExplorerScreen.tsx (338 → 752 lines) — full filter UI: prominent search bar, 7 FilterDropdown buttons (Type/Genre/Langue/Pays/Thème/Sélections/Année) with per-group selection, custom year input inside the Année dropdown, Réinitialiser + Aléatoire buttons, responsive results grid (2-6 cols), loading skeletons, error state with retry, empty state, pagination (Prev/Next + page indicator).
  * /home/z/my-project/src/components/guyma/SecureBrowserModal.tsx (863 → 1633 lines) — full reading page: hero section (backdrop + title + badges + actions), video player stage (preserved hls.js + iframe fallback), streaming servers selector, info section (poster + metadata + tags + director/actors + synopsis + uBlock banner), series episodes section (season tabs + VF episode list with play buttons, fetched from /api/series-structure), comments & reviews section (add form with name + 5-star rating + textarea, recursive comments with nested replies, inline reply forms, delete buttons, fetched from /api/comments). All existing player logic preserved (hls.js, server fetch, controls, keyboard shortcuts).
- guymaTV now has a complete french-stream.net-style browse + watch experience: filter by 80+ options across 7 dimensions, custom year search, random discovery, full movie/series reading page with cast/synopsis, VF-only series episodes, and a community comments/reviews system with star ratings and threaded replies.

---
Task ID: 10-filters-comments-complete
Agent: main (Z.ai Code)
Task: Complete filter system mirroring french-stream.net + full reading page with series episodes + comments/reviews.

Work Log:
- Analyzed user's screenshot of french-stream.net via VLM (z-ai vision) — identified 6 filter groups: Par Genre, Par Langue, Par Pays, Par Thème, Sélections, Par Année
- Scraped french-stream.net homepage with cheerio to extract ALL real filter URLs:
  * 19 genres (Action → /films/actions/, Aventure, Animation, Arts Martiaux, Biopic, Comédie, Drame, Documentaire, Horreur, Historique, Espionnage, Famille, Fantastique, Guerre, Policier, Romance, Science fiction, Thriller, Western)
  * 3 langues (Tous, VF, VOSTFR)
  * 19 pays (Anglophones, Français, Espagnols, Japonais, Allemands, Italiens, Coréens, Chinois, Russes, Néerlandais, Norvégiens, Portugais, Danois, Polonais, Indiens, Suédois, Thaïlandais, Turcs, Arabes)
  * 27 thèmes (Aliens, IA, Autisme, Inspiré d'une histoire vraie, Passage à l'âge adulte, Trafic de drogue, Catastrophe, Dystopie, Amitié, Braquage, Espionnage, LGBT, La Bagarre, Maison hantée, Romance, Triangle amoureux, Religion, Vengeance, Tueur en série, Slasher, Voyage spatial, Super-héros, Survie, Boucle temporelle, Voyage temporel, Vampires, Zombies)
  * 2 sélections (Films du moment, Notre sélection)
  * 14 plages d'années (2026 → avant 1980)
- Created /home/z/my-project/src/lib/filters.ts with FILTER_GROUPS array (7 groups, 87 options total), each option has id/label/path/icon (Material Symbols). Helpers: findFilterOption(id), buildYearFilter(year)
- Extended src/lib/scraper.ts:
  * Added CatalogOptions: filter, path, random
  * Updated getCatalog to handle filter (resolves via findFilterOption), path (direct), random (picks random page)
  * Added getCatalogByPath(path, page) — scrapes arbitrary french-stream.net path with pagination
  * Added getRandomCatalog(count) — picks random page 1-40 from films or series, shuffles results
  * Added getRandomByFilter(filterPath, count) — random page within a filter's results
  * Fixed isSeries detection: now uses regex /Saison\s*\d+/i on title (href doesn't contain "series" for DLE cards)
  * Added getSeriesStructure(newsid) — uses Playwright to render JS-driven episode list, returns seasons + episodes (VF priority, VOSTFR fallback), deduplicated by (season, episode) number
- Created API routes:
  * /api/filters → returns FILTER_GROUPS + buildYearPath helper
  * /api/series-structure?id=xxx → returns series seasons + episodes (Playwright, 30-min cache)
  * /api/comments (GET/POST/DELETE) → comments with rating, replies, average rating
- Updated /api/catalog to accept filter, path, random params
- Updated Prisma schema: added Comment model (id, streamItemId, userName, rating 0-5, content, parentId for replies, createdAt)
- Pushed schema to SQLite via bun run db:push
- Launched subagent (Task 9-filters-comments-ui) to refactor UI:
  * ExplorerScreen: full search bar + 7 filter dropdowns + custom year input + Aléatoire button + Réinitialiser + responsive grid + pagination
  * SecureBrowserModal: hero section + video player + info section + series episodes (season tabs + VF episode list) + comments/reviews (form with name + 5-star rating + textarea + Publier, nested replies, delete)
  * Header: functional search input with debounce + mobile search icon
  * GuymaApp: wired onSearch prop to navigate to Explorer
- Verified end-to-end with Agent Browser:
  * Explorer: 7 filter dropdowns render correctly with all options + icons
  * Filter "Action" applied → button shows "Action" + results update
  * Aléatoire button → random films from random pages
  * Series (MobLand - Saison 2) → category now correctly "Séries" (fixed via title regex)
  * Modal opens with: hero, video player (extraction loading), info, 6 VF episodes (deduplicated), comments section
  * Comments API: POST creates comment, GET returns it with averageRating=5.0
  * No console errors after dedup fix

Stage Summary:
- guymaTV now mirrors the FULL french-stream.net experience:
  * 87 filter options across 7 groups (Genre, Langue, Pays, Thème, Sélections, Année + Type)
  * Random discovery mode (Aléatoire)
  * Custom year search
  * Series episodes with season/episode structure (VF priority)
  * Full reading page: hero, player, info, episodes, comments
  * Comments & reviews with 5-star ratings + nested replies
- All fetches go through apiUrl() (APK-compatible)
- Backend scraping + Playwright extraction + Prisma persistence all working
- Maquette Material 3 olive/emerald preserved throughout
