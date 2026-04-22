#!/usr/bin/env node
/**
 * Unified webroot development server.
 *
 * Boots the Next.js chat app and serves sibling webroot static repos
 * from a single port — no separate Python server needed.
 *
 * The chat app occupies the server root (no path prefix):
 *   /              → chat home
 *   /chat          → chat list / new chat
 *   /chat/[id]     → conversation
 *   /settings      → settings
 *
 * Static repos are served from the webroot filesystem at their own paths:
 *   /localsite/    /team/    /requests/    /realitystream/    etc.
 *
 * Run from the webroot root:
 *   node chat/server.mjs               → http://localhost:8888
 *   PORT=8887 node chat/server.mjs     → replaces the Python server
 *
 * Or via pnpm (from webroot/ or from inside chat/):
 *   pnpm --prefix chat dev:webroot
 *
 * Note: uses the standard Next.js dev server (not Turbopack).
 * For fastest chat-only development use `pnpm --prefix chat dev` instead.
 */

import { createServer } from 'node:http'
import { parse } from 'node:url'
import { join, extname, resolve, dirname } from 'node:path'
import { createReadStream, statSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import next from 'next'

// ── Paths ────────────────────────────────────────────────────────────────────

const CHAT_DIR = dirname(fileURLToPath(import.meta.url))  // .../webroot/chat
const WEBROOT  = resolve(CHAT_DIR, '..')                   // .../webroot

// ── Environment ──────────────────────────────────────────────────────────────
// Load docker/.env before Next.js boots (mirrors lib/env-loader.ts).

try {
  const { config } = await import('dotenv')
  const envPath = join(WEBROOT, 'docker', '.env')
  if (existsSync(envPath)) {
    config({ path: envPath })
    console.log(`[env] ${envPath}`)
  }
} catch { /* dotenv unavailable — rely on process environment */ }

// Signal to server components that we're running inside the webroot.
process.env.WEBROOT = 'true'
// Expose the webroot path so server code can locate shared files (.gitmodules, .siterepos).
process.env.WEBROOT_PATH = WEBROOT

// ── Static file serving ──────────────────────────────────────────────────────

// Directories in the webroot that are reserved for Next.js — never served statically.
const NEXTJS_DIRS = new Set(['chat'])

const MIME_TYPES = {
  '.html':  'text/html; charset=utf-8',
  '.css':   'text/css',
  '.js':    'application/javascript',
  '.mjs':   'application/javascript',
  '.json':  'application/json',
  '.svg':   'image/svg+xml',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.jpeg':  'image/jpeg',
  '.gif':   'image/gif',
  '.webp':  'image/webp',
  '.ico':   'image/x-icon',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':   'font/ttf',
  '.pdf':   'application/pdf',
  '.txt':   'text/plain; charset=utf-8',
  '.md':    'text/plain; charset=utf-8',
  '.mp4':   'video/mp4',
  '.webm':  'video/webm',
}

function redirect(location, res) {
  res.writeHead(301, { Location: location })
  res.end()
}

function serveFile(filePath, res) {
  const mime = MIME_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream'
  res.setHeader('Content-Type', mime)
  createReadStream(filePath).pipe(res)
}

/** Returns true if the request was handled as a static file. */
function tryStatic(pathname, res) {
  const segments = pathname.split('/').filter(Boolean)
  const top = segments[0]

  // chat/key/ — the standalone key manager widget.
  // Must be checked before the STATIC_REPOS logic because the Next.js
  // (chat) route group catches /chat/[id] and would treat "key" as a chat ID.
  if (top === 'chat' && segments[1] === 'key') {
    const filePath = join(CHAT_DIR, 'key', ...segments.slice(2))
    try {
      const stat = statSync(filePath)
      if (stat.isFile()) { serveFile(filePath, res); return true }
      if (stat.isDirectory()) {
        if (!pathname.endsWith('/')) { redirect(pathname + '/', res); return true }
        const idx = join(filePath, 'index.html')
        if (existsSync(idx)) { serveFile(idx, res); return true }
      }
    } catch { /* not found */ }
    return false
  }

  // Any webroot directory that isn't reserved for Next.js is served statically.
  if (!top || NEXTJS_DIRS.has(top)) return false

  const filePath = join(WEBROOT, pathname)
  try {
    const stat = statSync(filePath)
    if (stat.isFile()) { serveFile(filePath, res); return true }
    if (stat.isDirectory()) {
      if (!pathname.endsWith('/')) { redirect(pathname + '/', res); return true }
      const idx = join(filePath, 'index.html')
      if (existsSync(idx)) { serveFile(idx, res); return true }
    }
  } catch { /* not found — let Next.js return its 404 */ }
  return false
}

// ── Next.js ──────────────────────────────────────────────────────────────────

const PORT     = parseInt(process.env.PORT || '8888', 10)
const HOSTNAME = 'localhost'
const dev      = process.env.NODE_ENV !== 'production'

// hostname + port must be passed so Next.js binds HMR WebSockets correctly.
// turbopack: true enables Turbopack in the custom server (Next.js 15+).
const app    = next({ dev, dir: CHAT_DIR, hostname: HOSTNAME, port: PORT, turbopack: true })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      if (!tryStatic(parsedUrl.pathname, res)) {
        await handle(req, res, parsedUrl)
      }
    } catch (err) {
      console.error('Request error:', req.url, err)
      res.statusCode = 500
      res.end('Internal server error')
    }
  })
    .once('error', (err) => { console.error(err); process.exit(1) })
    .listen(PORT, HOSTNAME, () => {
      console.log(`\n> Ready on http://${HOSTNAME}:${PORT}`)
      console.log(`  Chat        : http://${HOSTNAME}:${PORT}/chat`)
      console.log(`  Key manager : http://${HOSTNAME}:${PORT}/chat/key/`)
      console.log(`  Static      : all webroot dirs except /chat`)
    })
})
