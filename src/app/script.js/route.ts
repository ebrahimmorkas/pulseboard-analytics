/**
 * The tracking script served at /script.js.
 *
 * <script defer data-site="SITE_ID" src="https://your-pulseboard/script.js"></script>
 *
 * - No cookies, localStorage or fingerprinting; it only sends the page URL and referrer.
 * - Tracks single-page-app navigations by wrapping history.pushState and listening to popstate.
 * - Exposes window.pulseboard("Event name") for custom events (goals).
 */
const SCRIPT = `(function () {
  "use strict";
  var d = document, s = d.currentScript;
  if (!s) return;
  var site = s.getAttribute("data-site");
  if (!site) return;
  var api = new URL(s.src).origin + "/api/event";
  var last;

  function send(name) {
    var body = JSON.stringify({ site: site, name: name || "pageview", url: location.href, referrer: d.referrer || null });
    if (navigator.sendBeacon && navigator.sendBeacon(api, body)) return;
    fetch(api, { method: "POST", body: body, keepalive: true }).catch(function () {});
  }

  function page() {
    var current = location.pathname + location.search;
    if (current === last) return;
    last = current;
    send("pageview");
  }

  var pushState = history.pushState;
  history.pushState = function () {
    pushState.apply(this, arguments);
    page();
  };
  addEventListener("popstate", page);

  window.pulseboard = function (name) { send(String(name)); };

  if (d.visibilityState === "prerender") {
    d.addEventListener("visibilitychange", function once() {
      if (d.visibilityState === "visible") { d.removeEventListener("visibilitychange", once); page(); }
    });
  } else {
    page();
  }
})();`
  // Strip indentation and blank lines: a cheap minification without a build step.
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .join("\n");

export function GET() {
  return new Response(SCRIPT, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
