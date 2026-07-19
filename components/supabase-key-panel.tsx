"use client";

import { EnvKeyPanel } from "@/components/local-env-key-panel";

export function SupabaseKeyPanel() {
  return (
    <EnvKeyPanel
      apiPath="/api/auth/supabase-env-values"
      title="Copy Supabase settings"
      description="Local only — share these values with teammates so they can connect to the same Supabase project. Values are blurred; copy individually or all at once."
      copyAllLabel="Supabase keys"
    />
  );
}
