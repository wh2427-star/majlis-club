import { defineConfig } from "vitest/config";

// RLS tests talk to the real Supabase project defined in .env.local.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [],
  test: {
    environment: "node",
    include: ["tests/rls/**/*.test.ts"],
    setupFiles: ["tests/rls/setup.ts"],
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
});
