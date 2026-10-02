import "server-only";
import { headers } from "next/headers";

/** Best-effort client IP for rate limiting (first hop of X-Forwarded-For behind a proxy). */
export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headerList.get("x-real-ip") ?? "unknown";
}
