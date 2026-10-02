import type { CapacitorConfig } from "@capacitor/cli";

/**
 * guymaTV Capacitor configuration.
 *
 * The web app is built as a static export (frontend only) and wrapped into
 * a native Android APK. The backend (Next.js API routes + Prisma + Playwright)
 * is deployed separately and referenced via NEXT_PUBLIC_API_BASE_URL.
 *
 * Build flow (also see .github/workflows/build-apk.yml):
 *   1. bun run build:mobile  → static export to ./mobile/www
 *   2. bunx cap sync android → copies ./mobile/www into the Android project
 *   3. cd android && ./gradlew assembleRelease → builds the APK
 */
const config: CapacitorConfig = {
  appId: "tv.guyma.app",
  appName: "guymaTV",
  webDir: "mobile/www",
  backgroundColor: "#0f1412",
  android: {
    backgroundColor: "#0f1412",
    allowMixedContent: true,
    // Required for streaming video hosters that don't use HTTPS everywhere
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  server: {
    // The Android WebView will load from the bundled static assets.
    // No hostname needed — Capacitor serves from capacitor://localhost
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#0f1412",
      androidSplashResourceName: "splash",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0f1412",
    },
    Keyboard: {
      resize: "body",
      style: "DARK",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
