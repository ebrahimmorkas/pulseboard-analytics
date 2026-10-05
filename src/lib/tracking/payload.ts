import { z } from "zod";

/** Body sent by the tracking script. Kept tiny on purpose. */
export const eventPayloadSchema = z.object({
  site: z.uuid(),
  name: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[\w .:/-]+$/, "Invalid event name")
    .default("pageview"),
  url: z.url({ protocol: /^https?$/ }).max(2000),
  referrer: z.string().max(2000).nullish(),
});

export type EventPayload = z.infer<typeof eventPayloadSchema>;

/** Stored pathnames are capped and never include query strings (they may hold personal data). */
export function pathnameOf(url: string) {
  const pathname = new URL(url).pathname.replace(/\/+$/, "") || "/";
  return pathname.slice(0, 512);
}
