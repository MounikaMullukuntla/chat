# AGENTS.md — `chat/packages/github-components`

Wraps the React components from `chat/lib/github-components/` as browser-native
Custom Elements so they can be used in plain HTML pages with a single `<script>`
tag — no React build pipeline on the consuming page.

Registered elements: `<resource-area-selector>`, `<github-repo-modal>`

## File layout

```
src/index.tsx        Custom Element wrappers (entry point)
src/utils.ts         Minimal utils shim — avoids chat's heavy deps
src/globals.css      Tailwind base styles
vite.config.ts       IIFE build; @/ alias points to chat/ root
package.json         Own deps (React, Tailwind, Vite) — not a workspace package
dist/github-components.js   COMMITTED to git — the ready-to-serve bundle
```

## Consuming pages

```html
<script defer src="/chat/packages/github-components/dist/github-components.js"></script>
```

Currently used by `requests/engine/index.html` for the Resource Areas panel.

## The dist is committed to git

`dist/github-components.js` is tracked in git. A `git pull` gives you a working
bundle immediately — no build step required to use it.

## When to rebuild

Rebuild when source changes in either:
- `chat/lib/github-components/` — the underlying React components
- `chat/packages/github-components/src/` — the Custom Element wrappers

```bash
cd chat/packages/github-components
npm install       # first time only, or after package.json changes
npm run build     # regenerates dist/github-components.js (~500 kB)
# then commit dist/github-components.js
```

`chat`'s root `pnpm install` does **not** install this package — there is no
workspace config. Run the above from inside this directory.

## vite.config.ts notes

- `@/` alias resolves to `chat/` (`../..` from this directory).
- `@/lib/utils` is remapped to `src/utils.ts` to avoid pulling in Drizzle/AI-SDK deps.
- `resolve.dedupe: ["react", "react-dom", "react-dom/client"]` is required. The `@/`
  alias causes component imports to resolve React from `chat/node_modules/react` while
  local files use the package's own `node_modules/react`. Two React instances in one
  bundle breaks hooks (`useState` throws "cannot read properties of null"). Dedupe
  forces a single copy throughout the entire bundle.
- `define: { "process.env.NODE_ENV": '"production"' }` makes React load its production
  bundle, which eliminates all `process.*` references via dead-code elimination.
  Do NOT also define `process` as a global identifier — esbuild's identifier
  substitution corrupts React's internal module initialization and breaks hooks.
- `rollupOptions.output.intro` injects a `var process = {...}` shim inside the IIFE
  as a safety net for any future dependency that references `process` directly. The
  minifier strips it when unreferenced.
