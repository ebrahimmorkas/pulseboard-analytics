import { hostnameMatchesDomain } from "@/lib/sites/domain";

export type TrafficSource = {
  source: string;
  utmMedium: string | null;
  utmCampaign: string | null;
};

/** Friendly names for common referrers; anything else is shown by hostname. */
const KNOWN_SOURCES: [RegExp, string][] = [
  [/(^|\.)google\./, "Google"],
  [/(^|\.)bing\.com$/, "Bing"],
  [/(^|\.)duckduckgo\.com$/, "DuckDuckGo"],
  [/(^|\.)yahoo\.com$/, "Yahoo"],
  [/^(t\.co|twitter\.com|x\.com)$/, "Twitter"],
  [/(^|\.)facebook\.com$/, "Facebook"],
  [/(^|\.)linkedin\.com$|^lnkd\.in$/, "LinkedIn"],
  [/(^|\.)reddit\.com$/, "Reddit"],
  [/(^|\.)github\.com$/, "GitHub"],
  [/^news\.ycombinator\.com$/, "Hacker News"],
  [/(^|\.)youtube\.com$|^youtu\.be$/, "YouTube"],
];

const clean = (value: string | null) => value?.trim().slice(0, 100) || null;

function safeUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/**
 * Works out where a visit came from. Campaign parameters win over the referrer;
 * navigation within the same site (or no referrer) counts as "Direct".
 */
export function resolveSource({
  pageUrl,
  referrer,
  siteDomain,
}: {
  pageUrl: string;
  referrer?: string | null;
  siteDomain: string;
}): TrafficSource {
  const params = safeUrl(pageUrl)?.searchParams;
  const utmMedium = clean(params?.get("utm_medium") ?? null);
  const utmCampaign = clean(params?.get("utm_campaign") ?? null);

  const tagged = clean(
    params?.get("utm_source") ?? params?.get("ref") ?? params?.get("source") ?? null,
  );
  if (tagged) return { source: tagged, utmMedium, utmCampaign };

  const host = safeUrl(referrer)
    ?.hostname.replace(/^www\./, "")
    .toLowerCase();
  if (!host || hostnameMatchesDomain(host, siteDomain)) {
    return { source: "Direct", utmMedium, utmCampaign };
  }

  const known = KNOWN_SOURCES.find(([pattern]) => pattern.test(host))?.[1];
  return { source: known ?? host, utmMedium, utmCampaign };
}
