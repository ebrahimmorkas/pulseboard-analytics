import { z } from "zod";

/** Treat empty strings as "not set" so optional services can be left blank in `.env`. */
const optionalString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.string().default("postgres://pulseboard:pulseboard@localhost:5434/pulseboard"),
  ANALYTICS_SALT_SECRET: z.string().min(16).default("development-only-salt-secret"),
  REDIS_URL: optionalString,
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", z.flattenError(parsed.error).fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;

export const features = {
  redis: Boolean(env.REDIS_URL),
} as const;
