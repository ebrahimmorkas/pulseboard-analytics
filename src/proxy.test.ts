import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { SESSION_COOKIE } from "@/lib/auth/tokens";
import { proxy } from "./proxy";

function request(path: string, withCookie = false) {
  const req = new NextRequest(new URL(path, "http://localhost:3000"));
  if (withCookie) req.cookies.set(SESSION_COOKIE, "token");
  return req;
}

describe("proxy", () => {
  it("redirects anonymous users from dashboards to login with a return path", () => {
    const response = proxy(request("/sites/abc?period=7d"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fsites%2Fabc%3Fperiod%3D7d",
    );
  });

  it("lets requests with a session cookie through", () => {
    expect(proxy(request("/sites", true)).headers.get("location")).toBeNull();
  });

  it("never redirects away from /login based on the cookie alone (stale cookie loop)", () => {
    expect(proxy(request("/login", true)).headers.get("location")).toBeNull();
  });

  it("keeps public dashboards and the tracking script public", () => {
    expect(proxy(request("/share/demo")).headers.get("location")).toBeNull();
    expect(proxy(request("/script.js")).headers.get("location")).toBeNull();
  });
});
