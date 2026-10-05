"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { PG_UNIQUE_VIOLATION, pgErrorCode } from "@/db/errors";
import { sites } from "@/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { generateShareSlug } from "@/lib/sites/domain";
import type { FormState } from "@/lib/validations/auth";
import { siteSchema, siteSettingsSchema } from "@/lib/validations/site";

export async function createSite(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = siteSchema.safeParse(raw);
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, fields: raw };

  const { domain, name } = parsed.data;
  let siteId: string;
  try {
    const [site] = await db
      .insert(sites)
      .values({ ownerId: user.id, domain, name: name || domain, shareSlug: generateShareSlug() })
      .returning({ id: sites.id });
    siteId = site!.id;
  } catch (error) {
    if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) {
      return { errors: { domain: ["This domain is already registered."] }, fields: raw };
    }
    throw error;
  }

  revalidatePath("/sites");
  redirect(`/sites/${siteId}/settings?created=1`);
}

export async function updateSite(
  siteId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = siteSettingsSchema.safeParse(raw);
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, fields: raw };

  const updated = await db
    .update(sites)
    .set(parsed.data)
    .where(and(eq(sites.id, siteId), eq(sites.ownerId, user.id)))
    .returning({ id: sites.id });
  if (updated.length === 0) return { message: "Site not found." };

  revalidatePath("/sites");
  revalidatePath(`/sites/${siteId}/settings`);
  return { success: true, message: "Site updated" };
}

export async function setSitePublic(siteId: string, isPublic: boolean) {
  const user = await requireUser();
  await db
    .update(sites)
    .set({ isPublic })
    .where(and(eq(sites.id, siteId), eq(sites.ownerId, user.id)));
  revalidatePath(`/sites/${siteId}/settings`);
}

/** Rotating the slug revokes any previously shared public link. */
export async function regenerateShareLink(siteId: string) {
  const user = await requireUser();
  await db
    .update(sites)
    .set({ shareSlug: generateShareSlug() })
    .where(and(eq(sites.id, siteId), eq(sites.ownerId, user.id)));
  revalidatePath(`/sites/${siteId}/settings`);
}

export async function deleteSite(siteId: string) {
  const user = await requireUser();
  await db.delete(sites).where(and(eq(sites.id, siteId), eq(sites.ownerId, user.id)));
  revalidatePath("/sites");
  redirect("/sites");
}
