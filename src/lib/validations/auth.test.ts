import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "./auth";

describe("auth schemas", () => {
  it("normalises emails before validating", () => {
    expect(loginSchema.parse({ email: "  Ada@Example.COM ", password: "x" }).email).toBe(
      "ada@example.com",
    );
  });

  it("requires strong enough passwords", () => {
    const base = { name: "Ada", email: "ada@example.com" };
    expect(registerSchema.safeParse({ ...base, password: "short1" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: "noDigitsHere" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: "analytics42" }).success).toBe(true);
  });
});
