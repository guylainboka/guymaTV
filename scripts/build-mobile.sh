#!/usr/bin/env bash
# guymaTV — Mobile (Capacitor) build script.
#
# Builds the Next.js frontend as a static export into ./mobile/www, excluding
# the API routes (they're not compatible with output: 'export'). The APK will
# call the deployed backend via NEXT_PUBLIC_API_BASE_URL.
#
# Usage:
#   ./scripts/build-mobile.sh                  # uses GUYMA_API_BASE_URL from env
#   GUYMA_API_BASE_URL=https://api.guyma.tv ./scripts/build-mobile.sh
#
# After this script, run:
#   bunx cap sync android
#   cd android && ./gradlew assembleDebug      # or assembleRelease

set -euo pipefail

cd "$(dirname "$0")/.."

API_BASE_URL="${GUYMA_API_BASE_URL:-}"
if [[ -z "$API_BASE_URL" ]]; then
  echo "⚠️  GUYMA_API_BASE_URL is not set."
  echo "    The APK will use relative URLs (only works when the APK is served"
  echo "    from the same origin as the backend — usually not the case)."
  echo "    Set GUYMA_API_BASE_URL=https://your-deployed-backend.example.com"
  echo ""
  read -p "Continue anyway? (y/N) " -n 1 -r
  [[ $REPLY =~ ^[Yy]$ ]] || exit 1
fi

echo "==> Cleaning previous mobile build"
rm -rf mobile/www

echo "==> Temporarily excluding src/app/api (incompatible with output: export)"
if [[ -d "src/app/api" ]]; then
  # Move OUTSIDE src/app entirely so Next.js doesn't see it as a route folder
  mkdir -p .mobile-excluded
  mv src/app/api .mobile-excluded/api
fi

# Restore on exit (even on error)
restore_api() {
  if [[ -d ".mobile-excluded/api" ]]; then
    mv .mobile-excluded/api src/app/api
    rmdir .mobile-excluded 2>/dev/null || true
  fi
}
trap restore_api EXIT

echo "==> Building Next.js static export (frontend only)"
echo "    API base URL: ${API_BASE_URL:-(relative, dev mode)}"
export GUYMA_MOBILE_BUILD=1
export NEXT_PUBLIC_API_BASE_URL="$API_BASE_URL"

bun run build 2>&1 | tail -40

echo ""
echo "==> Verifying export"
if [[ ! -f "mobile/www/index.html" ]]; then
  echo "❌ Build failed: mobile/www/index.html not found"
  exit 1
fi

# Inject the API base URL into the static HTML (so the APK can be rebuilt
# without re-running next build, just by changing the env var at packaging
# time). We write it as a window.__API_BASE_URL__ global that api-client.ts
# can pick up at runtime.
if [[ -n "$API_BASE_URL" ]]; then
  echo "==> Injecting API base URL into static HTML"
  INJECT="<script>window.__API_BASE_URL__=${API_BASE_URL}</script>"
  # We actually rely on NEXT_PUBLIC_ env at build time, but also set window global
  # as a fallback so the APK can be re-pointed without rebuild if needed.
  find mobile/www -name "*.html" -exec sed -i "s|</head>|<script>window.__API_BASE_URL__=\"${API_BASE_URL}\";</script></head>|" {} \;
fi

echo ""
echo "✅ Mobile build complete → mobile/www/"
echo "    Next steps:"
echo "      bunx cap sync android"
echo "      cd android && ./gradlew assembleDebug"
echo ""
echo "    Or push to GitHub — the build-apk.yml workflow will do all of this"
echo "    and upload the APK as an artifact."
