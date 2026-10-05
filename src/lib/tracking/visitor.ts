import { createHash, createHmac } from "node:crypto";

/**
 * Cookieless visitor identification.
 *
 * id = hash(dailySalt + siteId + ip + userAgent), truncated to 64 bits.
 *
 * - The raw IP address and user agent are never stored.
 * - The salt is derived from a secret and the UTC date, so it rotates every day:
 *   the same person gets a different id tomorrow and cannot be tracked long term.
 * - The site id is part of the hash, so ids cannot be correlated across sites.
 */
export function dailySalt(secret: string, date: Date = new Date()) {
  const day = date.toISOString().slice(0, 10);
  return createHmac("sha256", secret).update(day).digest("hex");
}

export function visitorId({
  salt,
  siteId,
  ip,
  userAgent,
}: {
  salt: string;
  siteId: string;
  ip: string;
  userAgent: string;
}) {
  return createHash("sha256")
    .update(`${salt}:${siteId}:${ip}:${userAgent}`)
    .digest("hex")
    .slice(0, 16);
}
