import { z } from "zod";
import { normalizeDomain } from "@/lib/sites/domain";

export const siteSchema = z.object({
  domain: z.string().transform((value, ctx) => {
    const domain = normalizeDomain(value);
    if (!domain) {
      ctx.addIssue({ code: "custom", message: "Enter a domain like example.com" });
      return z.NEVER;
    }
    return domain;
  }),
  name: z.string().trim().max(100).optional().default(""),
});

export const siteSettingsSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
});
