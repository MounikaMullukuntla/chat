import { isPlaceholderValue } from "@/lib/auth/env-placeholder";

// Single source of truth for which env vars back each social login provider.
// Kept dependency-free (no betterAuth/db imports) so both the auth instance
// and server components (e.g. app/auth/page.tsx) can read it cheaply.
export const SOCIAL_PROVIDER_ENV_VARS = {
  google: { clientId: "GOOGLE_CLIENT_ID", clientSecret: "GOOGLE_CLIENT_SECRET" },
  linkedin: { clientId: "LINKEDIN_CLIENT_ID", clientSecret: "LINKEDIN_CLIENT_SECRET" },
  github: { clientId: "GITHUB_CLIENT_ID", clientSecret: "GITHUB_CLIENT_SECRET" },
  microsoft: { clientId: "MICROSOFT_CLIENT_ID", clientSecret: "MICROSOFT_CLIENT_SECRET" },
  discord: { clientId: "DISCORD_CLIENT_ID", clientSecret: "DISCORD_CLIENT_SECRET" },
  facebook: { clientId: "FACEBOOK_CLIENT_ID", clientSecret: "FACEBOOK_CLIENT_SECRET" },
} as const;

export type SocialProviderId = keyof typeof SOCIAL_PROVIDER_ENV_VARS;

export function isSocialProviderConfigured(id: SocialProviderId): boolean {
  const vars = SOCIAL_PROVIDER_ENV_VARS[id];
  const clientId = process.env[vars.clientId];
  const clientSecret = process.env[vars.clientSecret];
  if (!(clientId && clientSecret)) return false;
  // Present isn't enough — a still-unfilled placeholder value doesn't count
  // as configured (e.g. "your-google-client-id...").
  return !(isPlaceholderValue(vars.clientId, clientId) || isPlaceholderValue(vars.clientSecret, clientSecret));
}

export function getConfiguredSocialProviders(): SocialProviderId[] {
  return (Object.keys(SOCIAL_PROVIDER_ENV_VARS) as SocialProviderId[]).filter(isSocialProviderConfigured);
}
