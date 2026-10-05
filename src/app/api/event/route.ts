import { getCache } from "@/lib/cache";
import { rateLimit } from "@/lib/rate-limit";
import { ingestEvent } from "@/lib/tracking/ingest";
import { eventPayloadSchema } from "@/lib/tracking/payload";

// The script runs on customers' websites, so the endpoint must accept cross-origin requests.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const accepted = () => new Response(null, { status: 202, headers: CORS_HEADERS });

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Event ingestion endpoint used by /script.js.
 * `navigator.sendBeacon` sends text/plain, so the body is parsed manually.
 */
export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const limit = await rateLimit(getCache(), { key: `ingest:${ip}`, limit: 120, windowSeconds: 60 });
  if (!limit.success) {
    return new Response(null, {
      status: 429,
      headers: { ...CORS_HEADERS, "Retry-After": String(limit.retryAfter) },
    });
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 5_000) return new Response(null, { status: 413, headers: CORS_HEADERS });
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400, headers: CORS_HEADERS });
  }

  const parsed = eventPayloadSchema.safeParse(body);
  if (!parsed.success) return new Response(null, { status: 400, headers: CORS_HEADERS });

  await ingestEvent(parsed.data, {
    ip,
    userAgent: request.headers.get("user-agent"),
    // Set by the hosting platform / CDN; no IP geolocation database is needed.
    country: request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry"),
  });

  // Always 202: the sender learns nothing about whether the event was stored.
  return accepted();
}
