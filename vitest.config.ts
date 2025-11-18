import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vitest/config";

// Plugin to handle CSS imports in tests
const cssPlugin = (): Plugin => ({
  name: "vitest-css-plugin",
  transform(_code, id) {
    if (id.endsWith(".css")) {
      return {
        code: "export default {}",
        map: null,
      };
    }
  },
});

export default defineConfig({
  plugins: [react(), cssPlugin()],
  test: {
    name: "codechat-tests",
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    css: false,
    server: {
      deps: {
        external: ["katex"],
      },
    },
    include: [
      "tests/unit/**/*.test.{ts,tsx}",
      "tests/integration/**/*.test.{ts,tsx}",
    ],
    exclude: ["node_modules", ".next", "tests/e2e/**/*"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        ".next/",
        "tests/",
        "**/*.config.{js,ts}",
        "**/*.d.ts",
        "**/types/**",
        "lib/db/migrations/**",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: "threads",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
