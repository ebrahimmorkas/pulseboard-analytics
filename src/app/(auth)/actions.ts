"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { PG_UNIQUE_VIOLATION, pgErrorCode } from "@/db/errors";
import { users } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { safeRedirectPath } from "@/lib/auth/tokens";
import { getCache } from "@/lib/cache";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { loginSchema, registerSchema, type FormState } from "@/lib/validations/auth";

// Keeps response times similar whether or not an account exists (prevents user enumeration).
const DUMMY_HASH = "scrypt$00000000000000000000000000000000$" + "0".repeat(128);

function tooManyAttempts(retryAfter: number, fields: Record<string, string>): FormState {
  const minutes = Math.ceil(retryAfter / 60);
  return {
    message: `Too many attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    fields,
  };
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(formData);
  const fields = { email: String(raw.email ?? "") };
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, fields };

  const limit = await rateLimit(getCache(), {
    key: `login:${await getClientIp()}:${parsed.data.email}`,
    limit: 5,
    windowSeconds: 60 * 5,
  });
  if (!limit.success) return tooManyAttempts(limit.retryAfter, fields);

  const user = await db.query.users.findFirst({ where: eq(users.email, parsed.data.email) });
  const passwordOk = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !passwordOk) return { message: "Invalid email or password.", fields };

  await createSession(user.id);
  redirect(safeRedirectPath(formData.get("next")?.toString()));
}

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(formData);
  const fields = { name: String(raw.name ?? ""), email: String(raw.email ?? "") };
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, fields };

  const limit = await rateLimit(getCache(), {
    key: `register:${await getClientIp()}`,
    limit: 5,
    windowSeconds: 60 * 60,
  });
  if (!limit.success) return tooManyAttempts(limit.retryAfter, fields);

  const { name, email, password } = parsed.data;
  try {
    const [user] = await db
      .insert(users)
      .values({ name, email, passwordHash: await hashPassword(password) })
      .returning({ id: users.id });
    await createSession(user!.id);
  } catch (error) {
    if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) {
      return { errors: { email: ["An account with this email already exists."] }, fields };
    }
    throw error;
  }

  redirect("/sites");
}

export async function logout() {
  await destroySession();
  redirect("/");
}
