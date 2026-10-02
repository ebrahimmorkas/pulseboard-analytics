import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { env } from "@/lib/env";
import { SESSION_COOKIE, SESSION_TTL_MS, generateSessionToken, hashSessionToken } from "./tokens";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
};

export async function createSession(userId: string) {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessions).values({ id: hashSessionToken(token), userId, expiresAt });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.id, hashSessionToken(token)));
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function validateSessionToken(token: string): Promise<SessionUser | null> {
  const sessionId = hashSessionToken(token);
  const [row] = await db
    .select({
      expiresAt: sessions.expiresAt,
      user: { id: users.id, name: users.name, email: users.email },
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!row) return null;

  if (row.expiresAt.getTime() <= Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }

  return row.user;
}

/** Signed-in user for this request (deduplicated per render with React `cache`). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return validateSessionToken(token);
});
