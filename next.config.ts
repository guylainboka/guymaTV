import type { NextConfig } from "next";

/**
 * guymaTV Next.js configuration.
 *
 * Two build modes:
 *
 * 1. Backend/dev mode (default):
 *    `bun run dev` or `bun run build`
 *    → output: 'standalone' with API routes, Prisma, Playwright extractor
 *
 * 2. Mobile/APK mode (GUymA_MOBILE_BUILD=1):
 *    `bun run build:mobile`
 *    → output: 'export' to ./mobile/www (frontend only, no API routes)
 *    → The APK calls the deployed backend via NEXT_PUBLIC_API_BASE_URL
 *
 * The mobile build temporarily excludes `src/app/api/` (script does the rename)
 * because Next.js doesn't allow API routes with `output: 'export'`.
 */

const isMobileBuild = process.env.GUYMA_MOBILE_BUILD === "1";

const baseConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Playwright + cheerio + Prisma need to be bundled server-side
  serverExternalPackages: ["playwright", "cheerio", "@prisma/client"],
};

const mobileConfig: NextConfig = {
  ...baseConfig,
  output: "export",
  distDir: "mobile/www",
  images: {
    // Required for static export — no server-side image optimization
    unoptimized: true,
  },
  // No trailing slash so relative asset paths work in Capacitor WebView
  trailingSlash: false,
  // Disable Next.js image optimization (we use raw TMDB URLs)
  experimental: {
    // Statically optimize all pages
    optimizePackageImports: ["lucide-react"],
  },
};

const standaloneConfig: NextConfig = {
  ...baseConfig,
  output: "standalone",
};

export default isMobileBuild ? mobileConfig : standaloneConfig;
