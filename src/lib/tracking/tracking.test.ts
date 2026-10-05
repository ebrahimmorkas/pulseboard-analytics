import { describe, expect, it } from "vitest";
import { eventPayloadSchema, pathnameOf } from "./payload";
import { resolveSource } from "./source";
import { isBot, parseUserAgent } from "./user-agent";
import { dailySalt, visitorId } from "./visitor";

const CHROME_WIN =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const SAFARI_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const EDGE_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0";
const FIREFOX_LINUX = "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0";
const CHROME_ANDROID_TABLET =
  "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

describe("parseUserAgent", () => {
  it.each([
    [CHROME_WIN, { browser: "Chrome", os: "Windows", device: "desktop" }],
    [SAFARI_IPHONE, { browser: "Safari", os: "iOS", device: "mobile" }],
    [EDGE_MAC, { browser: "Edge", os: "macOS", device: "desktop" }],
    [FIREFOX_LINUX, { browser: "Firefox", os: "Linux", device: "desktop" }],
    [CHROME_ANDROID_TABLET, { browser: "Chrome", os: "Android", device: "tablet" }],
  ])("parses %s", (userAgent, expected) => {
    expect(parseUserAgent(userAgent)).toEqual(expected);
  });
});

describe("isBot", () => {
  it("detects crawlers, scripts and missing user agents", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(
      true,
    );
    expect(isBot("curl/8.4.0")).toBe(true);
    expect(isBot(CHROME_WIN.replace("Chrome/", "HeadlessChrome/"))).toBe(true);
    expect(isBot(null)).toBe(true);
  });

  it("lets real browsers through", () => {
    expect(isBot(CHROME_WIN)).toBe(false);
    expect(isBot(SAFARI_IPHONE)).toBe(false);
  });
});

describe("resolveSource", () => {
  const siteDomain = "example.com";

  it("treats missing and same-site referrers as direct", () => {
    expect(resolveSource({ pageUrl: "https://example.com/", siteDomain }).source).toBe("Direct");
    expect(
      resolveSource({
        pageUrl: "https://example.com/a",
        referrer: "https://blog.example.com/",
        siteDomain,
      }).source,
    ).toBe("Direct");
  });

  it("names well-known referrers and falls back to the hostname", () => {
    const from = (referrer: string) =>
      resolveSource({ pageUrl: "https://example.com/", referrer, siteDomain }).source;
    expect(from("https://www.google.co.uk/search?q=x")).toBe("Google");
    expect(from("https://t.co/abc")).toBe("Twitter");
    expect(from("https://news.ycombinator.com/item?id=1")).toBe("Hacker News");
    expect(from("https://www.some-blog.dev/post")).toBe("some-blog.dev");
  });

  it("prefers campaign parameters over the referrer", () => {
    expect(
      resolveSource({
        pageUrl: "https://example.com/?utm_source=newsletter&utm_medium=email&utm_campaign=launch",
        referrer: "https://mail.google.com/",
        siteDomain,
      }),
    ).toEqual({ source: "newsletter", utmMedium: "email", utmCampaign: "launch" });
  });

  it("survives malformed URLs", () => {
    expect(
      resolveSource({ pageUrl: "nonsense", referrer: "also nonsense", siteDomain }).source,
    ).toBe("Direct");
  });
});

describe("visitorId", () => {
  const base = { siteId: "site-1", ip: "203.0.113.7", userAgent: CHROME_WIN };
  const today = dailySalt("secret", new Date("2026-06-01T10:00:00Z"));

  it("is stable within a day and never contains the IP", () => {
    const id = visitorId({ salt: today, ...base });
    expect(id).toBe(visitorId({ salt: today, ...base }));
    expect(id).toMatch(/^[0-9a-f]{16}$/);
    expect(id).not.toContain("203");
  });

  it("changes every day, per site, and per visitor", () => {
    const id = visitorId({ salt: today, ...base });
    const tomorrow = dailySalt("secret", new Date("2026-06-02T10:00:00Z"));
    expect(visitorId({ salt: tomorrow, ...base })).not.toBe(id);
    expect(visitorId({ salt: today, ...base, siteId: "site-2" })).not.toBe(id);
    expect(visitorId({ salt: today, ...base, ip: "203.0.113.8" })).not.toBe(id);
  });
});

describe("event payload", () => {
  const site = "3f1c2b8e-7a6d-4c5b-9e8f-1a2b3c4d5e6f";

  it("defaults to a pageview and validates the URL", () => {
    expect(eventPayloadSchema.parse({ site, url: "https://example.com/pricing" }).name).toBe(
      "pageview",
    );
    expect(eventPayloadSchema.safeParse({ site, url: "javascript:alert(1)" }).success).toBe(false);
    expect(eventPayloadSchema.safeParse({ site: "nope", url: "https://example.com" }).success).toBe(
      false,
    );
    expect(
      eventPayloadSchema.safeParse({ site, url: "https://example.com", name: "<script>" }).success,
    ).toBe(false);
  });

  it("stores pathnames without query strings or trailing slashes", () => {
    expect(pathnameOf("https://example.com/blog/post/?email=a@b.c#top")).toBe("/blog/post");
    expect(pathnameOf("https://example.com")).toBe("/");
  });
});
