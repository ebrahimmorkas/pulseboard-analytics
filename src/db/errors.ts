/** PostgreSQL error codes we handle explicitly. */
export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FOREIGN_KEY_VIOLATION = "23503";

/**
 * Returns the PostgreSQL error code for a failed query. Drizzle wraps driver errors,
 * so the code may live on the error itself or on its `cause`.
 */
export function pgErrorCode(error: unknown): string | undefined {
  const candidate = error as { code?: unknown; cause?: { code?: unknown } } | null;
  const code = candidate?.code ?? candidate?.cause?.code;
  return typeof code === "string" ? code : undefined;
}
