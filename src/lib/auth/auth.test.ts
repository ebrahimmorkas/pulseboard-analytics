import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";
import { generateSessionToken, hashSessionToken, safeRedirectPath } from "./tokens";

describe("password hashing", () => {
  it("verifies the correct password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash.startsWith("scrypt$")).toBe(true);
    await expect(verifyPassword("correct horse battery staple", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("secret-password");
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("uses a unique salt for every hash", async () => {
    const [a, b] = await Promise.all([hashPassword("same"), hashPassword("same")]);
    expect(a).not.toBe(b);
  });

  it("rejects malformed hashes", async () => {
    await expect(verifyPassword("anything", "not-a-hash")).resolves.toBe(false);
  });
});

describe("session tokens", () => {
  it("generates unique tokens", () => {
    expect(generateSessionToken()).not.toBe(generateSessionToken());
  });

  it("hashes tokens deterministically", () => {
    const token = generateSessionToken();
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
    expect(hashSessionToken(token)).toHaveLength(64);
  });
});

describe("safeRedirectPath", () => {
  it("allows relative paths", () => {
    expect(safeRedirectPath("/courses/react")).toBe("/courses/react");
  });

  it.each(["https://evil.com", "//evil.com", "/\\evil.com", "", null, undefined])(
    "falls back for unsafe value %s",
    (value) => {
      expect(safeRedirectPath(value)).toBe("/sites");
    },
  );
});
