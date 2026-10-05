import { describe, expect, it } from "vitest";
import { generateShareSlug, hostnameMatchesDomain, normalizeDomain } from "./domain";

describe("normalizeDomain", () => {
  it.each([
    ["example.com", "example.com"],
    ["https://www.Example.com/blog?x=1#top", "example.com"],
    ["http://shop.example.co.uk:8080/", "shop.example.co.uk"],
    ["  EXAMPLE.ORG. ", "example.org"],
    ["user:pass@example.com", "example.com"],
    ["localhost", "localhost"],
  ])("normalises %s to %s", (input, expected) => {
    expect(normalizeDomain(input)).toBe(expected);
  });

  it.each([
    "",
    "not a domain",
    "example",
    "-bad.com",
    "bad-.com",
    "exa_mple.com",
    "javascript:alert(1)",
  ])("rejects %s", (input) => {
    expect(normalizeDomain(input)).toBeNull();
  });
});

describe("hostnameMatchesDomain", () => {
  it("accepts the domain, www and subdomains", () => {
    expect(hostnameMatchesDomain("example.com", "example.com")).toBe(true);
    expect(hostnameMatchesDomain("www.example.com", "example.com")).toBe(true);
    expect(hostnameMatchesDomain("blog.example.com", "example.com")).toBe(true);
  });

  it("rejects look-alike domains", () => {
    expect(hostnameMatchesDomain("notexample.com", "example.com")).toBe(false);
    expect(hostnameMatchesDomain("example.com.evil.io", "example.com")).toBe(false);
  });
});

describe("generateShareSlug", () => {
  it("creates unique, URL-safe slugs", () => {
    const slug = generateShareSlug();
    expect(slug).toMatch(/^[a-z2-9]{12}$/);
    expect(generateShareSlug()).not.toBe(slug);
  });
});
