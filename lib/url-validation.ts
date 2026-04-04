/**
 * Shared by API (watch-payload) and client forms. No server-only imports.
 * Accepts any https URL with a host (scheme is case-insensitive per URL parser).
 */
export function isValidHttpsWatchUrl(raw: string): boolean {
  const trimmed = raw.trim().replace(/^\uFEFF/, "");
  if (!trimmed) return false;
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  if (!u.hostname) return false;
  return true;
}
