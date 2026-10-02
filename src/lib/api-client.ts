/**
 * guymaTV - API Client Helper
 *
 * All client-side fetch calls should use `apiUrl()` so the app works:
 *  - In dev/local: relative URLs (NEXT_PUBLIC_API_BASE_URL is empty)
 *  - In the APK (Capacitor): absolute URLs pointing to the deployed backend
 *
 * The backend URL is resolved in this priority order:
 *   1. window.__API_BASE_URL__ (injected at APK packaging time, allows
 *      re-pointing the APK to a different backend without rebuilding)
 *   2. process.env.NEXT_PUBLIC_API_BASE_URL (baked in at Next.js build time)
 *   3. "" (empty → relative URLs, works only when served from the backend)
 *
 * Example:
 *   fetch(apiUrl("/api/catalog?type=films"))
 */

declare global {
  interface Window {
    __API_BASE_URL__?: string;
  }
}

function resolveApiBase(): string {
  // Runtime override (injected by build-mobile.sh into the static HTML)
  if (typeof window !== "undefined" && window.__API_BASE_URL__) {
    return window.__API_BASE_URL__.replace(/\/$/, "");
  }
  // Build-time env var (baked into the JS bundle by Next.js)
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || ""
  );
}

export const API_BASE_URL = resolveApiBase();

export function apiUrl(path: string): string {
  if (!path) return path;
  // Already absolute URL
  if (/^https?:\/\//i.test(path)) return path;
  // Protocol-relative
  if (path.startsWith("//")) return path;
  // Ensure leading slash
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return API_BASE_URL + normalized;
}

/**
 * Wrapper around fetch that prepends the API base URL.
 * Same signature as fetch.
 */
export async function apiFetch(
  input: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(apiUrl(input), init);
}
