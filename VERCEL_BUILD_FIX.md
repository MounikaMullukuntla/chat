# Vercel Build Cache Fix

If you're seeing this error on Vercel:
```
Error: ENOENT: no such file or directory, lstat '/vercel/path0/.next/server/app/(chat)/page_client-reference-manifest.js'
```

This is due to stale build cache from removed dependencies. To fix:

## Option 1: Clear Build Cache (Recommended)
1. Go to your Vercel project dashboard
2. Navigate to Settings → General
3. Scroll to "Build & Development Settings"
4. Click "Clear Build Cache"
5. Redeploy

## Option 2: Force Clean Build
Add this to your project settings:
- Go to Settings → Environment Variables
- Add: `VERCEL_FORCE_BUILD_CACHE_CLEAR=1`
- Redeploy

## What Changed
We recently cleaned up the project by removing:
- `@playwright/test` and test configuration
- `@vercel/otel` and OpenTelemetry instrumentation
- `instrumentation.ts` file
- Unused configuration files

The local build passes successfully - this is purely a Vercel cache issue.

## Verification
After clearing cache, the build should complete successfully with these warnings (which are expected):
- Supabase using Node.js APIs in Edge Runtime (this is normal)

---
**Note:** You can delete this file after resolving the Vercel build issue.
