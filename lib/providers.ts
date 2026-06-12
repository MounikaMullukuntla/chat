/**
 * Canonical provider + model registry — types and re-exports.
 *
 * Data lives in chat/keys/providers.js (single source of truth).
 * This file adds TypeScript types and re-exports for Next.js app code.
 *
 * When adding or changing providers/models, edit chat/keys/providers.js.
 * Also keep in sync with lib/db/migrations/0007_seed_data_model_config.sql
 * and lib/storage/types.ts APIProvider type.
 */

import type { APIProvider } from "@/lib/storage/types";

export type ProviderModel = {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  active: boolean;
  outputs?: string[];
  supportsThinkingMode?: boolean;
  /** Exact model/version identifier sent to the provider API (e.g. Tripo's
   *  date-stamped "v3.0-20250812"). Falls back to `id` when omitted. */
  apiModel?: string;
  /** User-facing message shown when the provider reports the account has no
   *  API credits (e.g. Tripo code 2010 / free trial not activated). */
  noCreditsHint?: string;
};

export type ProviderInfo = {
  id: APIProvider;
  name: string;
  keyPlaceholder: string;
  keyHint: string;
  getKeyUrl: string;
  tokenOnly?: boolean;
  cliOnly?: boolean;
  models: ProviderModel[];
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
export const PROVIDERS: ProviderInfo[] = require("../keys/providers.js") as ProviderInfo[];

export const PROVIDER_MAP: Record<string, ProviderInfo> = Object.fromEntries(
  PROVIDERS.map((p) => [p.id, p])
);
