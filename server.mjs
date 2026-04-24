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
import { createPrivateKey, createPublicKey } from 'node:crypto'
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
// Use polling in the unified webroot server to avoid exhausting macOS file
// watcher limits when developing inside the larger webroot checkout.
process.env.WATCHPACK_POLLING = 'true'
// Keep Next.js file watching scoped to the chat repo rather than the entire
// surrounding webroot. The server is often launched from /webroot, which can
// otherwise exhaust local file-watch limits and leave only _not-found mounted.
process.chdir(CHAT_DIR)

// Pre-compute which provider keys are present in the environment so the
// /api/server-keys route can read a single env var without needing dotenv again.
const PROVIDER_ENV_VARS = {
  anthropic: 'ANTHROPIC_API_KEY',
  google:    'GEMINI_API_KEY',
  openai:    'OPENAI_API_KEY',
  xai:       'XAI_API_KEY',
  github:    'GITHUB_PERSONAL_ACCESS_TOKEN',
}
process.env.SERVER_KEYS_JSON = JSON.stringify(
  Object.entries(PROVIDER_ENV_VARS)
    .filter(([, v]) => !!process.env[v])
    .map(([id]) => id)
)

// ── Static file serving ──────────────────────────────────────────────────────

// Directories in the webroot that are reserved for Next.js — never served statically.
const NEXTJS_DIRS = new Set(['chat', 'key'])

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

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

function getServerPublicKeyJwk() {
  const pem = process.env.BROWSER_ENCRYPTION_PRIVATE_KEY
  if (!pem) return null
  try {
    const privateKey = createPrivateKey({
      key: pem.replace(/\\n/g, '\n'),
      format: 'pem',
    })
    const publicKey = createPublicKey(privateKey)
    return publicKey.export({ format: 'jwk' })
  } catch {
    return null
  }
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

async function validateProviderKey(provider, key) {
  switch (provider) {
    case 'anthropic': {
      const r = await fetch('https://api.anthropic.com/v1/models', {
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      })
      if (r.status === 200) return true
      if (r.status === 401 || r.status === 403) return false
      return null
    }
    case 'openai': {
      const r = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      })
      if (r.status === 200) return true
      if (r.status === 401 || r.status === 403) return false
      return null
    }
    case 'google': {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}&pageSize=1`
      )
      if (r.status === 200) return true
      if (r.status === 400 || r.status === 403) return false
      return null
    }
    case 'xai': {
      const r = await fetch('https://api.x.ai/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      })
      if (r.status === 200) return true
      if (r.status === 401 || r.status === 403) return false
      return null
    }
    case 'github': {
      const r = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${key}`, 'User-Agent': 'codechat-key-validator' },
      })
      if (r.status === 200) return true
      if (r.status === 401 || r.status === 403) return false
      return null
    }
    default:
      return 'unsupported'
  }
}

async function tryInternalApi(req, pathname, res) {
  if (pathname === '/api/status' && req.method === 'GET') {
    sendJson(res, 200, {
      ok: true,
      service: 'chat-webroot-dev-server',
      server: 'node',
      mode: dev ? 'development' : 'production',
      port: PORT,
      hostname: HOSTNAME,
      chatRoot: '/',
      chatRoutes: ['/chat', '/chat/keys/', '/settings'],
      staticRoots: ['/localsite/', '/team/', '/requests/', '/realitystream/', '/data-pipeline/', '/home/'],
      cwd: CHAT_DIR,
      webroot: WEBROOT,
      timestamp: new Date().toISOString(),
    })
    return true
  }

  if (pathname === '/api/server-keys' && req.method === 'GET') {
    const keys = process.env.SERVER_KEYS_JSON ? JSON.parse(process.env.SERVER_KEYS_JSON) : []
    sendJson(res, 200, keys)
    return true
  }

  if (pathname === '/api/public-key' && req.method === 'GET') {
    const jwk = getServerPublicKeyJwk()
    if (!jwk) {
      res.statusCode = 404
      res.end('Server encryption key not configured')
      return true
    }
    sendJson(res, 200, jwk)
    return true
  }

  if (pathname === '/api/validate-key' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req)
      const { provider, key } = body || {}

      if (!provider || !key) {
        sendJson(res, 400, { error: 'Missing provider or key' })
        return true
      }

      const valid = await validateProviderKey(provider, key)
      if (valid === 'unsupported') {
        sendJson(res, 200, { valid: null, error: 'Unsupported provider' })
        return true
      }

      sendJson(res, 200, { valid })
      return true
    } catch {
      sendJson(res, 200, { valid: null })
      return true
    }
  }

  return false
}

/** Returns true if the request was handled as a static file. */
function tryStatic(pathname, res) {
  const segments = pathname.split('/').filter(Boolean)
  const top = segments[0]

  // /keys/ and /chat/keys — both serve the static key manager widget (localsite nav).
  const isChatKeysRoute = top === 'chat' && segments[1] === 'keys'
  const isKeysRoute = top === 'keys' || isChatKeysRoute

  if (isKeysRoute) {
    // Strip the leading path prefix to get segments relative to chat/keys/
    const relativeSegments = isChatKeysRoute ? segments.slice(2) : segments.slice(1)

    // Root /keys and /chat/keys fall through to Next.js (chat navigation).
    // Sub-paths like /keys/style.css, /keys/key-manager.js are served statically.
    if (relativeSegments.length === 0) return false

    const filePath = join(CHAT_DIR, 'keys', ...relativeSegments)
    try {
      const stat = statSync(filePath)
      if (stat.isFile()) { serveFile(filePath, res); return true }
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
// Keep the custom webroot server on the standard Next.js dev server rather than
// Turbopack here. Turbopack's watcher footprint can exceed local file limits in
// the full webroot and cause the route manifest to collapse to only _not-found.
const app    = next({ dev, dir: CHAT_DIR, hostname: HOSTNAME, port: PORT })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      if (!(await tryInternalApi(req, parsedUrl.pathname, res)) && !tryStatic(parsedUrl.pathname, res)) {
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
      console.log(`  Key manager : http://${HOSTNAME}:${PORT}/chat/keys/`)
      console.log(`  Static      : all webroot dirs except /chat`)
    })
})
