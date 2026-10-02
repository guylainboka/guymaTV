# guymaTV — Mobile APK Build & Deploy Guide

This document explains how to build the guymaTV Android APK via GitHub Actions
and deploy the backend.

## Architecture

```
┌──────────────────────┐         HTTPS         ┌──────────────────────────┐
│  APK (Capacitor)     │  ──────────────────►  │  Next.js Backend         │
│  - Static UI         │                       │  - /api/catalog (scrape) │
│  - Native <video>    │                       │  - /api/extract (PW)     │
│  - hls.js for .m3u8  │                       │  - /api/proxy (filter)   │
│  - apiUrl() helper   │                       │  - /api/favorites (DB)   │
│                      │  ◄──────────────────  │  - /api/downloads (DB)   │
└──────────────────────┘                       └──────────────────────────┘
                                                       │
                                                       ▼
                                              ┌──────────────────┐
                                              │ french-stream.net│
                                              └──────────────────┘
```

**Why split?** Next.js API routes (Prisma + Playwright + scraping) need a
server runtime, but an APK is a static bundle. The frontend is exported as
static HTML/JS and the APK calls the deployed backend via `NEXT_PUBLIC_API_BASE_URL`.

## 1. Deploy the backend

The backend = this same Next.js app, deployed to any Node host that supports:
- Long-running server (not serverless cold starts — Playwright needs warm-up)
- ~512 MB RAM minimum (Chromium headless)
- Persistent disk for SQLite (or switch DATABASE_URL to PostgreSQL)

### Recommended hosts (in order)

1. **Render.com** (free tier OK, supports Playwright)
   - Create a "Web Service" from your GitHub repo
   - Build: `bun install && bun run build`
   - Start: `bun run start`
   - Set env vars: `DATABASE_URL`, `PORT`

2. **Railway.app** (better for Playwright, $5/mo)
   - Connect repo → auto-detects Next.js
   - Add env vars in dashboard

3. **Fly.io** (best for global edge + Playwright)
   - `fly launch` → generates Dockerfile
   - `fly deploy`

4. **Self-hosted VPS** (DigitalOcean, Hetzner)
   - `git clone` → `bun install` → `bun run build` → `bun run start`
   - Use PM2 or systemd for process management
   - Reverse proxy with Caddy/Nginx + HTTPS

### Environment variables to set on the backend

```env
DATABASE_URL=file:./db/custom.db    # or postgresql://...
PORT=3000
NODE_ENV=production
# Optional: restrict CORS to your APK origin
# CORS_ORIGIN=capacitor://localhost
```

After deploy, note your backend URL (e.g. `https://guyma-api.onrender.com`).

## 2. Build the APK via GitHub Actions

### Prerequisites

1. Push the repo to GitHub.
2. In the repo settings → **Secrets and variables → Actions**, add:
   - `GUYMA_API_BASE_URL` = your deployed backend URL (e.g. `https://guyma-api.onrender.com`)

### Trigger the build

Two ways:

- **Automatic**: push a git tag `v1.0.0` → workflow runs, builds both debug + release APKs.
  ```bash
  git tag v1.0.0
  git push origin v1.0.0
  ```

- **Manual**: go to the **Actions** tab → "Build guymaTV APK" → **Run workflow**.
  Choose `debug`, `release`, or `both`.

### Download the APK

1. Open the workflow run in GitHub Actions.
2. Scroll to **Artifacts** at the bottom.
3. Download `guymaTV-debug-v1.0.0` or `guymaTV-release-v1.0.0`.
4. Unzip — you get `app-debug.apk` or `app-release.apk`.

### Install on Android

1. Transfer the APK to your Android device.
2. Enable **Settings → Security → Install from unknown sources**.
3. Tap the APK in your file manager → Install.

## 3. Signed release builds (optional)

For a production-signed APK (Play Store-ready):

1. Generate a keystore locally:
   ```bash
   keytool -genkey -v -keystore guyma.keystore -alias guyma \
     -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Base64-encode it:
   ```bash
   base64 -i guyma.keystore | pbcopy    # macOS
   base64 -w 0 guyma.keystore           # Linux
   ```

3. Add these GitHub secrets:
   - `ANDROID_KEYSTORE_BASE64` — the base64 string
   - `ANDROID_KEYSTORE_PASSWORD` — keystore password
   - `ANDROID_KEY_ALIAS` — `guyma`
   - `ANDROID_KEY_PASSWORD` — key password

4. Trigger the workflow with `build_type=release`.

## 4. Local APK build (without GitHub)

If you want to build locally:

```bash
# 1. Install Android Studio + SDK (API 33)
# 2. Set ANDROID_HOME env var

# 3. Build the static frontend
GUYMA_API_BASE_URL=https://your-backend.com bun run build:mobile

# 4. Add Android platform (first time only)
bunx cap add android

# 5. Sync the web assets
bunx cap sync android

# 6. Build the APK
cd android && ./gradlew assembleDebug

# 7. Find the APK
ls app/build/outputs/apk/debug/app-debug.apk
```

## 5. Re-pointing the APK to a different backend

The backend URL is baked in at build time, but `build-mobile.sh` also injects a
`window.__API_BASE_URL__` runtime override into the static HTML. To change the
backend without rebuilding:

```bash
# After extracting the APK's assets/www/index.html:
sed -i 's|window.__API_BASE_URL="[^"]*"|window.__API_URL="https://new-backend.com"|' \
  assets/www/index.html
# Repack the APK
```

Or rebuild from source with a different `GUYMA_API_BASE_URL`.

## 6. Troubleshooting

| Symptom | Fix |
|---|---|
| APK opens but no movies | `GUYMA_API_BASE_URL` not set or backend down |
| Video doesn't play | Backend host blocks cross-origin requests — ensure CORS allows `capacitor://localhost` |
| Playwright extraction timeout | Backend needs more RAM (>512 MB) or Chromium not installed |
| `window.open is not a function` | Disable any in-app ad blockers that conflict with the proxy neutralizer |
| SQLite errors on backend | Ensure the deploy volume is persistent; or switch to PostgreSQL |

## 7. Play Store release checklist

- [ ] Signed release APK with proper keystore
- [ ] App icon and splash screen branded (see `android/app/src/main/res/`)
- [ ] App ID matches Capacitor config: `tv.guyma.app`
- [ ] Version code incremented in `android/app/build.gradle`
- [ ] Privacy policy URL (required by Play Store)
- [ ] Content rating questionnaire
- [ ] Target API level 33+ (Play Store requirement)

---

**Note légale**: Cette application est un wrapper technique autour d'un site
de streaming tiers. Vérifiez la législation de votre pays concernant la
redistribution de contenus protégés par droit d'auteur avant toute publication
publique.
