import { createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE = "pulseboard_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

/** Generates a high-entropy, URL-safe session token. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Only the SHA-256 hash of a token is stored in the database, so a leaked
 * sessions table cannot be used to hijack accounts.
 */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Prevents open redirects: only same-origin relative paths are allowed. */
export function safeRedirectPath(path: string | null | undefined, fallback = "/sites") {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return fallback;
  }
  return path;
}
