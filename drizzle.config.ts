import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile();
} catch {
  // No .env file — rely on variables provided by the environment (e.g. CI).
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://pulseboard:pulseboard@localhost:5434/pulseboard",
  },
  strict: true,
  verbose: true,
});
