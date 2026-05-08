import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import cssInjectedByJs from "vite-plugin-css-injected-by-js";
import { resolve } from "path";

export default defineConfig({
  plugins: [react(), tailwindcss(), cssInjectedByJs()],

  resolve: {
    // Force a single copy of React — the @/ alias resolves component imports to
    // chat/, which would otherwise pick up chat/node_modules/react, giving two
    // React instances in the bundle and breaking hooks (useState is null).
    dedupe: ["react", "react-dom", "react-dom/client"],
    alias: [
      // Override @/lib/utils to avoid pulling in chat's heavy dependencies
      // (chat's utils.ts imports drizzle-schema, errors, ai-sdk types, etc.)
      {
        find: /^@\/lib\/utils$/,
        replacement: resolve(__dirname, "src/utils.ts"),
      },
      // Map all other @/ imports to the chat project root so shadcn UI
      // components, types, and other shared code resolve correctly.
      // Rollup's node resolver then finds node_modules via chat/node_modules/.
      // NOTE: path.resolve() strips trailing slashes, so we re-add "/" to
      //       prevent "@/lib/foo" becoming "chatlib/foo" on Windows.
      {
        find: /^@\//,
        replacement: resolve(__dirname, "../..") + "/",
      },
    ],
  },

  define: {
    // Allow React to dead-code-eliminate its dev-only paths.
    "process.env.NODE_ENV": '"production"',
  },

  build: {
    lib: {
      entry: resolve(__dirname, "src/index.tsx"),
      name: "GitHubComponents",
      // Output as an IIFE so it works via a plain <script> tag with no bundler
      formats: ["iife"],
      fileName: () => "github-components.js",
    },
    rollupOptions: {
      // Bundle everything — requests/engine has no React on the page
      external: [],
      output: {
        // Inject a process shim inside the IIFE so process.emit / process.env.*
        // refs from React internals don't throw ReferenceError at runtime.
        // Using intro (not banner) keeps it local to the IIFE scope.
        intro: 'var process={"env":{"NODE_ENV":"production"}};',
      },
    },
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    // Inline assets (fonts, small images) to keep the output a single file
    assetsInlineLimit: 100 * 1024,
  },
});
