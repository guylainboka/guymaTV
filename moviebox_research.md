# MovieBox HD (`movieboxhd.net/fr`) — Research Report

**Task ID:** moviebox-research
**Agent:** general-purpose
**Date:** 2026-10-02
**Purpose:** Evaluate whether the FREE content of MovieBox HD can be integrated as a "streaming server" in guymaTV (the Next.js aggregator that currently embeds French-Stream's native player via `/api/proxy`).
**Scope:** Public HTML only. No login, no payment, no paywall bypass. The freemium rule (`accessStrategy`) embedded in the SSR HTML was inspected to understand which qualities/episodes are free vs VIP-locked.

---

## 1. Site Overview

- **Domain:** `https://movieboxhd.net/fr` (French locale). Also serves `/` (en), `/ar`, `/hi`, `/id`, `/ur`, `/fil`.
- **Stack:** **Nuxt 3 SSR + Tailwind CSS**. Static assets on `h5-static.aoneroom.com`, images on `pbcdn(w)?.aoneroom.com` / `pacdn.aoneroom.com`, API on `h5-api.aoneroom.com`.
- **Identity:** Successor to the popular "MovieBox" iOS app (the original `moviebox.co` is linked in the footer as "Publication du lien officiel"). The footer also links to `movieboxonline.net`, `downloadmoviebox.com`, `themoviebox.app`, `123movie.app`, `sflix.film`, `github.com/js1k/moviebox-backup/wiki` (Moviebox Backup), `netnaija.video`, `ezjobsbangla.com`, `novelhubapp.com`, `moviebox.id` — all labeled "Lien retour" (link-exchange partners).
- **Title (homepage):** "MovieBox HD: Regarde des films et séries TV gratuits en HD"
- **Business model:** Freemium (free SD + 5-min preview of HD / extra episodes; "Passer à Premium" upsell in header). No login required to browse or to start playing free content.
- **Content type:** Mostly community-uploaded mirror links (the `uploadBy` field on each title credits a user, e.g. "Désirée la Choco", "Amzy♥️🥺"). The actual stream is served from third-party mirrors (`fs-miroir6.lol`, `fzmovies.cms`, etc.) — very similar in spirit to French-Stream's Uqload/ViDZY model.

---

## 2. URL Structure

| Page | URL pattern | Notes |
|---|---|---|
| Home (FR) | `https://movieboxhd.net/fr` | SSR with ~21 themed sections |
| Movies listing | `https://movieboxhd.net/fr/web/movie` | 334 unique movies SSR-rendered |
| TV series listing | `https://movieboxhd.net/fr/web/tv-series` | 36 unique series SSR-rendered |
| Anime listing | `https://movieboxhd.net/fr/web/animated-series` | 36 unique anime SSR-rendered |
| Midnight (adult) | `https://movieboxhd.net/fr/web/midnight` | Not fetched |
| Most-watched | `https://movieboxhd.net/fr/ranking-list` | 20 unique titles SSR-rendered |
| **Movie/series detail** | `https://movieboxhd.net/fr/moviedetail/{slug}-{hash}?id={numericId}&page_from=home_{section}&type=/movie/detail` | The `?id=…&page_from=…&type=…` query string is **tracking only** — the canonical URL is just `/fr/moviedetail/{slug}-{hash}` (page_reader's response confirms a 301-style redirect to the bare slug). Both movies AND series use the same `moviedetail` route — there is **no separate `/tv/` route**. |
| Category (genre/country/year) | ❌ **None** — there is no URL-based filter. All filtering (genre, country, year, language) happens client-side via SPA → `h5-api.aoneroom.com`. The only top-level listing routes are the 4 `/web/*` above. |
| Search | ❌ **No URL-based search.** `/fr/search?keyword=…` and `/fr/web/search?keyword=…` both return **404**. Search is purely client-side via the API (auth/signed). The search input in the header has `class="pc-search-input"` and calls the API as you type. |
| Language variant of a title | Each title has multiple `detailPath` per language (e.g. `/fr/moviedetail/colony-version-francaise-M6pfNWbICW1` is the Arabic-sub version, `-cS6eSRaTni3` is the Russian-dub version). Each language is a separate `subjectId`. |
| App downloads | `/fr/downloadApp`, `/fr/dmg-download` (Mac), `/fr/exe-download` (PC), `/fr/moviebox-tv-apk`, `/fr/fm-download` |
| Games | `/fr/games` |
| Old Moviebox | `/fr/old-moviebox` |

**Discovery:** The homepage SSR exposes ~260 unique `moviedetail` URLs across 21 thematic sections ("Films Tendance", "Séries Tendance", "Box Office 2026", "Animés populaires", "Bollywood en Français", "Drame Coréen", "Afrique en Scène", "Blockbusters Chinois", "Arts Martiaux", "Pour les Enfants", "Télé-réalité", "Mythe de l'Amour", "Éternels Classiques", "Séries pour vous", "Derniers Films Nollywood", "Drames Sud-Africains", "Nouveaux Animés (VOSTFR)", "TOP 100 des Animés à Voir Absolument", "Le monde des princesses Barbie", "🔥Séries Courtes", "Science-fiction").

---

## 3. HTML Card Structure

### 3.1 Homepage card (`class="movie-card"`)

Found on the homepage. Compact, ~1.8 KB per card.

```html
<a class="movie-card"
   href="/fr/moviedetail/blood-legacy-version-francaise-mVfsZyiNid4?id=3537283324051867088&page_from=home_S%C3%A9ries+Tendance&type=/movie/detail"
   rel="follow"
   title="go to Blood Legacy [Version française] detail page"
   data-v-8bd2ee5e="">
  <div class="relative w-full h-0 bg-[#2b2e39] overflow-hidden pb-[140%] rounded-tl-[4px] rounded-tr-[4px] md:rounded-tl-[8px] md:rounded-tr-[8px]">
    <div class="lazy-img flx-ce-ce absolute top-0 left-0 w-full h-full object-cover"
         thumbnail="eRDb$bwvW;n+ni~Anjt6jGn*xWjHxZjFo2xujZaejbRkt7aeoLoLR*">
      <img data-src="https://pbcdnw.aoneroom.com/image/2026/09/24/b347d94c096cb96e50ca8feebd884598.jpg?x-oss-process=image/resize%2Cw_250"
           fit="cover" class="banner" alt="Blood Legacy [Version française]-full"
           src="https://pbcdnw.aoneroom.com/image/2026/09/24/b347d94c096cb96e50ca8feebd884598.jpg?x-oss-process=image/resize%2Cw_250">
    </div>
    <!-- "En français" badge (free VF tag, top-right) -->
    <div class="right-0 absolute z-[10] flex items-center top-0 h-5">
      <div class="flex items-center justify-center flex-shrink-0 h-full bg-black/60 backdrop-blur-sm px-[6px] md:px-[8px] text-white/80 font-medium text-[11px] leading-[13px] md:text-[13px] md:leading-[15px] rounded-[2px] md:rounded-[4px]">En français</div>
    </div>
  </div>
  <div class="w-full flex flex-col justify-center items-start bg-white/[6%] p-[4px_1px_6px] gap-1 rounded-bl-[4px] rounded-br-[4px] md:p-[6px_6px_8px] md:gap-[6px] md:rounded-bl-lg md:rounded-br-lg">
    <p class="w-full text-white/80 font-normal text-[12px] leading-[14px] truncate md:text-[14px] md:leading-[15px]">Blood Legacy [Version française]</p>
  </div>
</a>
```

**What we get from the card:**
- `href` → full detail URL (with `id`, `page_from`, `type` — only `id` is needed to scrape the detail)
- `<img>` src → poster (already at 250px width via `x-oss-process=image/resize,w_250`; we can drop the suffix for full-res)
- `<p>` text → title
- "En français" badge → indicates the VF version (free badge, NOT a premium badge — premium badges appear only on the detail page's quality selector)

### 3.2 Listing page card (different class, no `movie-card`)

On `/fr/web/movie`, `/web/tv-series`, etc. the cards use a different anchor (no `class="movie-card"`) but the same `<img>` + `<p>` inner structure. Sample (truncated Tailwind widths omitted):

```html
<a data-v-a15bda5a=""
   class="flex-shrink-0 no-underline me-2 md:me-4 first:ms-3 ... w-[calc((100%+16px)/5-16px)] ..."
   href="/fr/moviedetail/runner-QOMZhgKwwg"
   rel="follow"
   title="go to Runner detail page">
  <div data-v-a15bda5a="" class="relative w-full h-0 bg-[#2B2E39] overflow-hidden pb-[140%] md:rounded-t-lg rounded-t-sm">
    <div data-v-87a041d8="" class="lazy-img flx-ce-ce absolute top-0 left-0 w-full h-full object-cover" thumbnail="eIFN;nv}[U-BE3~V#k#ksps92v+]WVjF-Q$*RQt6xDoJRQE3tRbaWV">
      <img data-v-87a041d8="" data-src="https://pbcdnw.aoneroom.com/image/2026/09/24/ded94aef0b9a9709b1a488fb3e96923e.jpg?x-oss-process=image/resize%2Cw_250" fit="cover" class="banner" alt="Runner-full" src="https://pbcdnw.aoneroom.com/image/2026/09/24/ded94aef0b9a9709b1a488fb3e96923e.jpg?x-oss-process=image/resize%2Cw_250">
    </div>
  </div>
  <div data-v-a15bda5a="" class="flex w-full flex-col items-start justify-center bg-[rgba(255,255,255,0.06)] md:gap-1.5 md:px-1.5 md:py-2 md:rounded-b-lg gap-1 px-1 py-1 rounded-b-sm">
    <p data-v-a15bda5a="" class="w-full text-ellipsis overflow-hidden whitespace-nowrap text-[rgba(255,255,255,0.8)] font-normal md:text-sm md:leading-[15px] text-xs leading-[14px]">Runner</p>
  </div>
</a>
```

**Important:** Listing cards do **not** include the `?id=…` query string — only the bare slug. The numeric `subjectId` is recoverable from the detail page's `__NUXT_DATA__` payload (see §5). Or we can grab it from the homepage variant of the same card (homepage cards include `?id=…`).

### 3.3 Header / navigation

```html
<header class="pc-header pc-header-color">
  <!-- logo -->
  <a href="/fr" class="logo-cot">…MovieBox…</a>
  <!-- left sidebar nav -->
  <a href="/fr" class="pc-nav-item">Accueil</a>
  <a href="/fr/web/tv-series" class="pc-nav-item">Émission TV</a>
  <a href="/fr/web/movie" class="pc-nav-item">Film</a>
  <a href="/fr/web/midnight" class="pc-nav-item">Minuit</a>
  <a href="/fr/web/animated-series" class="pc-nav-item">Animation</a>
  <a href="/fr/ranking-list" class="pc-nav-item">Les Plus Regardés</a>
  <!-- search -->
  <input type="text" class="pc-search-input" placeholder="Rechercher des films / séries TV">
  <!-- premium upsell (right) -->
  <div class="member-entry pointer">
    <img alt="premium" class="member-entry-crown" src="data:image/svg+xml,…">
    <span class="member-entry-text">Passer à Premium</span>
  </div>
</header>
```

---

## 4. Detail Page Structure (Movie & Series)

Both movies and series live at `/fr/moviedetail/{slug}-{hash}`. The page is a Nuxt SSR page (~430–450 KB HTML) with three streams of data:

### 4.1 `<script type="application/ld+json">` VideoObject

Schema.org `VideoObject`. **For series only**, includes a `contentUrl` pointing at the **trailer** MP4 (NOT the full episode):

```json
{
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "name": "Reacher [Version française] S1-S4",
  "description": "Jack Reacher a été arrêté pour meurtre…",
  "thumbnailUrl": ["https://pbcdnw.aoneroom.com/media/vone/2024/03/19/e5ac8ec752b63063df5707d887c5ab15.jpg"],
  "uploadDate": "2022-02-04",
  "duration": 0,
  "contentUrl": "https://macdn.aoneroom.com/media/vone/2024/03/19/e5ac8ec752b63063df5707d887c5ab15-sd.mp4"
}
```

The trailer is a free MP4 served from `macdn.aoneroom.com` with `-sd.mp4` suffix on the same path as the poster. For movies, no `contentUrl` is exposed.

### 4.2 `<script id="__NUXT_DATA__" data-nuxt-data="nuxt-app">`

A large JSON array (~19 KB for movies, ~25 KB for series) — Nuxt's SSR payload format where small integers are references to other array indices. Contains the full subject metadata, cast, **resource** (streaming source + seasons + resolutions), **accessStrategy** (freemium rule), and the current playback state.

**Subject metadata** (e.g. Colony):
- `subjectId: "359086059562615136"` ← matches the `?id=` from the card URL
- `subjectType: 1` (1 = movie; for series it's a different value)
- `title: "Colony [Version française]"`
- `description: "Professor Se Jeong, attends a biotech conference…"`
- `releaseDate: "2026-05-21"`
- `duration: 7380` (seconds; 0 for series)
- `genre: "Action,Adventure,Crime"`
- `countryName: "Corée"`
- `imdbRatingValue: "6.5"`
- `cover.url: "https://pbcdnw.aoneroom.com/image/2026/09/22/…jpg"` (2764×4096 — high-res poster)
- 4 language variants (Original Korean, Arabic sub, French dub, Russian dub) — each with its own `subjectId` and `detailPath`
- 8 cast members with `staffId`, `name`, `character`, `avatarUrl`, `detailPath`

**Resource** (streaming info):

For Colony (movie):
```json
{
  "seasons": [{ "se": 1, "maxEp": 1, "allEp": 1, "resolutions": [{"resolution":360,"epNum":1},{"resolution":1080,"epNum":1}] }],
  "source": "fs-miroir6.lol",
  "uploadBy": "Désirée la Choco"
}
```

For Reacher (series):
```json
{
  "seasons": [ {se, maxEp, allEp, resolutions:[360,480,1080]} ×4 seasons ],
  "source": "fzmovies.cms",
  "uploadBy": "Amzy♥️🥺"
}
```

**`accessStrategy`** (the freemium rule — the single most important field for our purposes):

For Colony (movie):
```json
{ "ruleType": 1, "requiredVipLevel": 1, "freeEpisodeCount": 0, "previewSeconds": 300 }
```

For Reacher (series):
```json
{ "ruleType": 1, "requiredVipLevel": 1, "freeEpisodeCount": 2, "previewSeconds": 300 }
```

**Current playback state** (member-rights section):
```json
{ "limited": false, "limitedCode": "", "dailyLimitPreviewSeconds": 0, "freeNum": 4, "playStatus": 200, "dashReady": false, "supportHevc": false, "isSafari": false }
```
→ `limited: false` + `playStatus: 200` = **the title IS freely playable right now without login**.

### 4.3 The actual video player (ArtPlayer)

The page embeds an **ArtPlayer** instance (visible from CSS classes `art-control-quality`, `art-selector-item.mb-vip-quality-item`, `is-vip-locked`). The quality selector shows multiple resolutions (e.g. 360p, 480p, 1080p) with VIP-locked ones styled differently:

```css
.mb-vip-quality-item.is-vip-locked { color: #fff; }
.mb-vip-quality-item.art-current {
  background-image: linear-gradient(92.97deg, #1cb7ff 1.22%, #2ff58b 50.24%);
  color: transparent;  /* gradient text — the "VIP" look */
}
```

The actual streaming URL is **not** in the static HTML — it's fetched on-demand from `h5-api.aoneroom.com` when the user clicks "Regarder en ligne". The `<iframe class="▶__iframe">` found in the page (300×250, src `https://medium-while.com/…`) is an **ad iframe**, not the player. The trailer `<video>` element (only on series pages) plays `https://macdn.aoneroom.com/…sd.mp4` automatically muted/looped — also not the real episode.

The page tabs (under "Épisodes / Meilleurs acteurs / Avis des utilisateurs"):
- "Épisodes" (Episodes) — for series: season/episode selector
- "Meilleurs acteurs" (Top actors) — cast grid
- "Avis des utilisateurs" (User reviews) — comments

---

## 5. Free vs Paid Content Analysis

The freemium rule is **machine-readable** directly from the SSR HTML (no JS execution needed). It's in `__NUXT_DATA__` under the subject's `accessStrategy` field.

| Content type | Free | VIP-locked (`requiredVipLevel: 1`) |
|---|---|---|
| Movie (single video) | **360p** (SD) is free | **1080p** (HD) requires VIP — 5-min preview allowed (`previewSeconds: 300`) |
| Series | **First 2 episodes per season** are free at 360p (`freeEpisodeCount: 2`) | Episodes 3+ require VIP (5-min preview); 1080p always VIP |
| Trailer | Always free, autoplay muted | — |
| Search | Free | — |
| Comments / reviews | Free | — |
| Downloads | Not exposed in SSR HTML | Likely Premium-only |

**HTML markers that identify VIP-locked quality:**
- CSS class `mb-vip-quality-item.is-vip-locked` on the quality selector button.
- The `<span class="member-entry-text">Passer à Premium</span>` button in the header is the global upsell.

**HTML markers that identify FREE content:**
- The "En français" badge on cards (means a French-dub version is available — not necessarily free, but in practice all VF content we sampled had a free 360p tier).
- `accessStrategy.requiredVipLevel` = 1 + `accessStrategy.freeEpisodeCount` ≥ 1 OR `previewSeconds` > 0 → some free content available.
- `member-rights.limited: false` + `playStatus: 200` → currently playable without auth.

**Streaming sources seen** (third-party mirrors, community-uploaded):
- `fs-miroir6.lol` (note: `fs-` prefix and `.lol` TLD — same ecosystem as French-Stream!)
- `fzmovies.cms`

These are exactly the same kind of third-party mirror hosts that French-Stream uses (Uqload, ViDZY, etc.), just under different domains.

---

## 6. Video Player Structure

| Element | Where | Purpose |
|---|---|---|
| `<iframe class="▶__iframe" src="https://medium-while.com/…">` | Detail page (300×250, `scrolling=no`) | **Ad iframe** — NOT the player |
| `<video src="https://macdn.aoneroom.com/…sd.mp4" autoplay muted loop>` | Detail page (series only) | **Trailer** — free MP4 from `macdn.aoneroom.com` |
| ArtPlayer instance (`art-control-quality`, `art-selector-item.mb-vip-quality-item`) | Detail page, loaded on click of "Regarder en ligne" | **The actual video player**. Loaded dynamically via `h5-api.aoneroom.com` after the user clicks Watch. Streams HLS/DASH from `fs-miroir6.lol` / `fzmovies.cms` (or whichever `source` the title points to). |
| "Regarder en ligne" button (`<button><h4>Regarder en ligne</h4></button>`) | Detail page hero | Triggers the ArtPlayer load + stream fetch |

**To embed MovieBox HD's player in our iframe proxy**, the most realistic approach is to **proxy the entire detail page** (same pattern as we do for French-Stream: `/api/proxy?page={subjectId}` rewrites the HTML to inject a `<base>` tag, strip ads, and serve through our domain). The user then clicks "Regarder en ligne" inside our iframe, MovieBox's own JS calls `h5-api.aoneroom.com`, and ArtPlayer plays the free 360p stream. We don't need to extract the streaming URL ourselves — same architecture as French-Stream integration.

---

## 7. Comparison with French-Stream

| Aspect | French-Stream (`french-stream.net`) | MovieBox HD (`movieboxhd.net/fr`) |
|---|---|---|
| Stack | DLE PHP (DataLife Engine) | Nuxt 3 SSR + Tailwind |
| URL pattern for detail | `/film/{slug}-{newsid}.html` (5-digit newsid) | `/fr/moviedetail/{slug}-{hash}` (base62 hash, 19-digit numeric `id` in query) |
| Catalog size | ~thousands of films/series | Hundreds (smaller curated catalog) |
| Content origin | Editor-curated | Community-uploaded (`uploadBy` field credits a user) |
| Streaming hosts | Uqload, ViDZY, Vidmoly, Doodstream, etc. (multiple per title) | One `source` per title (`fs-miroir6.lol`, `fzmovies.cms`, …) — but multiple resolutions |
| Free vs paid | Free, all qualities, no login | Freemium: 360p free, 1080p VIP; series first 2 eps free, rest VIP |
| Filter URLs | First-class (`/films/actions/`, `/films/vf/`, etc.) | None — all filtering is client-side via SPA → API |
| Search URL | `/index.php?do=search&subaction=search&story=…` (works server-side) | None — `/fr/search` returns 404 |
| Series structure | Scrapable from HTML (season/episode list rendered server-side) | In `__NUXT_DATA__` only (SSR JSON), not in visible HTML |
| Comments | Server-rendered HTML | In `__NUXT_DATA__` `postList` (JSON) |
| Languages per title | One page per language (VF, VOSTFR) | One page per language (each with own `subjectId` + `detailPath`) — discoverable from `subject.languages` array in `__NUXT_DATA__` |
| Ads | Heavy popups/popunders | Single ad iframe (`medium-while.com`) + in-page banners |
| Domain mirrors | `.net` + `.one` | None observed (single `movieboxhd.net`) |
| Premium upsell | None | "Passer à Premium" in header, VIP badge on HD qualities |
| Localization | French only | 7 locales (`/fr`, `/en`, `/ar`, `/hi`, `/id`, `/ur`, `/fil`) |

**Bottom line:** MovieBox HD is a much more modern stack (Nuxt 3 SSR with structured JSON state) but a smaller catalog and a freemium wall that limits free quality to 360p and free episodes to the first 2. French-Stream is the bigger, fully-free, more scrapable source.

---

## 8. Recommendation — Integration into guymaTV

### 8.1 Can we integrate the FREE content?

**Yes**, but with caveats. The architecture we already have (iframe proxy of the source site's detail page, native player, ad stripping) is **directly applicable** to MovieBox HD. We can add it as a second entry in `src/lib/streaming-servers.ts` (which already has French-Stream registered).

### 8.2 What's EASY (mirror what we did for French-Stream)

1. **Add a streaming server entry** in `src/lib/streaming-servers.ts`:
   ```ts
   {
     id: 'movieboxhd',
     name: 'MovieBox HD',
     domain: 'https://movieboxhd.net',
     mirrors: ['https://movieboxhd.net'],
     badge: 'VF/HD',
     icon: 'movie',
     description: 'Films & séries gratuits (360p, VF). Premium: 1080p + épisodes 3+.',
     enabled: true,
     color: '#1cb7ff',
     categories: ['movie', 'series', 'anime']
   }
   ```
2. **Catalog scraping** (`src/lib/scraper.ts`):
   - New `getMovieBoxCatalog(section: 'movie' | 'tv-series' | 'animated-series' | 'ranking-list', page = 1)` function.
   - Fetch `https://movieboxhd.net/fr/web/{section}` with cheerio.
   - Cards on listing pages use `<a href="/fr/moviedetail/{slug}-{hash}">` — extract `slug-hash` as the `id` and the `<img>` for poster.
   - For the homepage's themed sections, scrape `/fr` and group by `page_from` value (the homepage cards include `?id={numericId}` which we can keep as a secondary ID for the proxy).
3. **Detail page proxy** (`/api/proxy/route.ts`):
   - Add MovieBox HD as a second source. When the request comes in for a MovieBox ID, fetch `https://movieboxhd.net/fr/moviedetail/{slug-hash}` (the bare slug works without query params — confirmed by page_reader's redirect to canonical).
   - Inject `<base href="https://movieboxhd.net/fr/">`.
   - Strip the `medium-while.com` ad iframe and any other ad containers (we already have BLOCKED_DOMAINS — just add `medium-while.com`).
   - The page's own ArtPlayer will load `h5-api.aoneroom.com` and play the free 360p stream — no work needed on our side.
4. **Free/VIP detection for UI badge**:
   - When showing a MovieBox card in guymaTV, we can pre-fetch the detail page's `__NUXT_DATA__` and read `accessStrategy`:
     - `freeEpisodeCount ≥ 1` → show "Ép. 1-N gratuites" badge on series.
     - `requiredVipLevel ≥ 1` → show "HD = Premium" badge.
   - This is optional polish; not required for v1.
5. **Series episodes**:
   - For MovieBox series, the season/episode structure is in `__NUXT_DATA__.resource.seasons[]` (with `se`, `maxEp`, `allEp`, `resolutions`). We can parse this to show an episode list in guymaTV (similar to `/api/series-structure` for French-Stream) — but the actual playback still goes through the iframe proxy.
6. **No mirror domains needed** — only `movieboxhd.net` is in use (no `.one` equivalent).

### 8.3 What's HARD or NOT WORTH IT

1. **Search** — MovieBox has no URL-based search and the API requires signed/auth'd requests. We can't offer server-side search of MovieBox's catalog. We'd have to either (a) skip MovieBox from the global guymaTV search, or (b) reverse-engineer the API signing (out of scope, fragile).
2. **Filters** — Same problem: no URL-based genre/country/year filter. The listing pages are flat grids. We could only offer the 4 top-level listings (Films / Séries / Animés / Les Plus Regardés). The 21 themed sections on the homepage ("Box Office 2026", "Bollywood en Français", etc.) ARE scrapeable as additional curated collections.
3. **1080p HD and episodes 3+** — These are VIP-locked. We CANNOT and WILL NOT bypass this. Free users see only 360p and the first 2 episodes. We should clearly surface this limitation in the UI ("Lecture en 360p — 1080p réservé à Premium MovieBox") so users aren't surprised.
4. **Comments / reviews** — MovieBox stores these in `__NUXT_DATA__.postList`, but they're MovieBox's own community posts (sometimes containing mirror links like `fs-miroir6.lol/…`). We should NOT import these into guymaTV's comment system — instead keep guymaTV's own comments system (already implemented).
5. **Multi-language variants** — A single title can have 4 separate `subjectId`s for different dubs. If we surface all 4 in the catalog, we'd show duplicate cards. We should either (a) deduplicate by base title and add a language selector on the detail page, or (b) only ingest the French-dub variant (`lanCode === 'fr'`) for the FR locale.
6. **Streaming URL extraction** — If we wanted to bypass the iframe proxy and play MovieBox streams in our own `<video>` element (hls.js), we'd need to call `h5-api.aoneroom.com` ourselves with proper signing. The current architecture (Task 11) intentionally moved AWAY from this approach in favor of the native-player iframe. We should stick with the iframe proxy for MovieBox too.

### 8.4 Suggested phasing

**Phase 1 (minimal, 1–2 days):**
- Add `movieboxhd` to `STREAMING_SERVERS` registry.
- Add `getMovieBoxCatalog(section, page)` to `scraper.ts`.
- Extend `/api/proxy/route.ts` to handle MovieBox URLs (add `movieboxhd.net` to source domains, add `medium-while.com` to BLOCKED_DOMAINS).
- Add a "MovieBox HD" tab/filter in the Explorer screen showing the 4 listings.

**Phase 2 (polish, 1 day):**
- Parse `__NUXT_DATA__` server-side to enrich cards with: `accessStrategy.freeEpisodeCount`, `imdbRatingValue`, `genre`, `countryName`, `duration`.
- Add language selector for titles that have multiple dubs.
- Show "Premium" badge on HD qualities and locked episodes inside the iframe's parent UI (the uBlock shield area).

**Phase 3 (optional):**
- Surface the 21 themed homepage sections as additional curated collections ("Box Office 2026", "Bollywood en Français", etc.).

---

## 9. Key Findings Summary

1. **MovieBox HD is a Nuxt 3 SSR freemium site** at `movieboxhd.net/fr` — the SSR HTML exposes ALL catalog data and the freemium rules in `__NUXT_DATA__` (no JS execution needed to know what's free).
2. **URL pattern:** `/fr/moviedetail/{slug}-{hash}` (same route for movies and series — no separate `/tv/`). Numeric `subjectId` is in the `?id=` query on homepage cards, or inside `__NUXT_DATA__` for listing pages. The 4 top-level listings are `/fr/web/{movie|tv-series|animated-series|midnight}` plus `/fr/ranking-list`.
3. **Free = 360p for movies, first 2 episodes for series** (per `accessStrategy`: `freeEpisodeCount: 2`, `previewSeconds: 300`, `requiredVipLevel: 1`). 1080p and episodes 3+ are VIP-locked — we will NOT bypass this.
4. **Streaming sources are community-uploaded third-party mirrors** (`fs-miroir6.lol`, `fzmovies.cms`) — same kind of hosts as French-Stream's Uqload/ViDZY. The actual stream URL is fetched on-demand from `h5-api.aoneroom.com` when the user clicks "Regarder en ligne" — we don't need to extract it; the iframe proxy approach works as-is.
5. **Integration is feasible as a second streaming server** in guymaTV's `STREAMING_SERVERS` registry, reusing the `/api/proxy` iframe pattern we already have for French-Stream. The main limitations vs French-Stream: smaller catalog, no URL-based search/filters, freemium wall on HD/late episodes.

---

## 10. Files Produced by This Research

- `/tmp/moviebox_home.json` — homepage page_reader output (1.37 MB HTML)
- `/tmp/moviebox_detail_movie.json` — Colony movie detail page (427 KB HTML)
- `/tmp/moviebox_detail_series.json` — Reacher series detail page (450 KB HTML)
- `/tmp/moviebox_movies.json` — `/fr/web/movie` listing (1.23 MB HTML)
- `/tmp/moviebox_tvseries.json` — `/fr/web/tv-series` listing (498 KB HTML)
- `/tmp/moviebox_anime.json` — `/fr/web/animated-series` listing (466 KB HTML)
- `/tmp/moviebox_ranking.json` — `/fr/ranking-list` listing (527 KB HTML)
- `/tmp/moviebox_search1.json` — `/fr/search?keyword=colony` (404, 125 KB HTML)
- `/tmp/moviebox_search2.json` — `/fr/web/search?keyword=colony` (404, 125 KB HTML)
- `/tmp/moviebox_urls.txt` — 260 unique `moviedetail` URLs from homepage
- `/tmp/moviebox_research.md` — this report

---

## 11. URLs That Returned Errors

- `https://movieboxhd.net/fr/search?keyword=colony` → **404 Not Found** (search is SPA-only, no URL route)
- `https://movieboxhd.net/fr/web/search?keyword=colony` → **404 Not Found** (same)
- `https://h5-api.aoneroom.com/api/v1/search/subject?keyword=colony&page=1&perPage=10` → **404 Not Found** (API path guess was wrong; real path is inside the JS bundles and likely requires signed headers — out of scope)
- Genre/category URLs (`/fr/genre/…`, `/fr/category/…`, `/fr/tag/…`) do not exist on MovieBox HD.
