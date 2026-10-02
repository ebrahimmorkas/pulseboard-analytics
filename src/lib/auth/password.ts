import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/**
 * Hashes a password with scrypt (memory-hard, built into Node.js).
 * Output format: `scrypt$<salt hex>$<hash hex>` so the algorithm can be changed later.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, saltHex, hashHex] = stored.split("$");
  if (algorithm !== "scrypt" || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  const derived = await scryptAsync(
    password.normalize("NFKC"),
    Buffer.from(saltHex, "hex"),
    expected.length,
  );
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
