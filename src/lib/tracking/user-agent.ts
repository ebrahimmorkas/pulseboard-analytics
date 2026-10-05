export type ParsedUserAgent = {
  browser: string;
  os: string;
  device: "desktop" | "mobile" | "tablet";
};

const BOT_PATTERN =
  /bot|crawl|spider|slurp|headless|lighthouse|pingdom|uptime|monitor|preview|scrape|curl|wget|python-requests|axios|node-fetch|go-http-client|facebookexternalhit|whatsapp|phantomjs/i;

/** Automated traffic is dropped at ingestion so it never inflates the numbers. */
export function isBot(userAgent: string | null | undefined) {
  return !userAgent || userAgent.length < 20 || BOT_PATTERN.test(userAgent);
}

// Order matters: Edge and Opera also contain "Chrome", Chrome also contains "Safari".
const BROWSERS: [string, RegExp][] = [
  ["Edge", /Edg(e|A|iOS)?\//],
  ["Opera", /OPR\/|Opera/],
  ["Samsung Internet", /SamsungBrowser\//],
  ["Firefox", /Firefox\/|FxiOS\//],
  ["Chrome", /Chrome\/|CriOS\//],
  ["Safari", /Safari\//],
];

const SYSTEMS: [string, RegExp][] = [
  ["iOS", /iPhone|iPad|iPod/],
  ["Android", /Android/],
  ["Windows", /Windows NT/],
  ["macOS", /Mac OS X|Macintosh/],
  ["Chrome OS", /CrOS/],
  ["Linux", /Linux/],
];

/**
 * Small purpose-built user agent parser. Analytics only needs coarse buckets,
 * so a dependency-free matcher keeps the ingestion path fast.
 */
export function parseUserAgent(userAgent: string): ParsedUserAgent {
  const browser = BROWSERS.find(([, pattern]) => pattern.test(userAgent))?.[0] ?? "Other";
  const os = SYSTEMS.find(([, pattern]) => pattern.test(userAgent))?.[0] ?? "Other";

  let device: ParsedUserAgent["device"] = "desktop";
  if (/iPad|Tablet|(Android(?!.*Mobile))/.test(userAgent)) device = "tablet";
  else if (/Mobi|iPhone|iPod|Android/.test(userAgent)) device = "mobile";

  return { browser, os, device };
}
