import path from "node:path";
import { defineConfig } from "vitest/config";

/** Integration tests run against a real PostgreSQL database (see `npm run test:integration`). */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "test/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.int.test.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
