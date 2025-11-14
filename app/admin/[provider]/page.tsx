/**
 * Provider-Specific Admin Configuration Page
 *
 * This page provides a tabbed interface for configuring all AI agents for a specific provider.
 * Only users with admin role can access this page.
 */

import { notFound } from "next/navigation";
import { AdminLayout } from "@/components/admin/admin-layout";
import { requireAdminWithRedirect } from "@/lib/auth/server";

// Force dynamic rendering for authenticated pages
export const dynamic = "force-dynamic";

// Valid providers
const VALID_PROVIDERS = ["google", "openai", "anthropic"] as const;
type Provider = (typeof VALID_PROVIDERS)[number];

type AdminProviderPageProps = {
  params: Promise<{ provider: string }>;
};

export default async function AdminProviderPage({
  params,
}: AdminProviderPageProps) {
  // Server-side admin authentication check
  // This will redirect non-admin users to home page
  await requireAdminWithRedirect();

  const { provider } = await params;

  // Validate provider
  if (!VALID_PROVIDERS.includes(provider as Provider)) {
    notFound();
  }

  return <AdminLayout provider={provider as Provider} />;
}

// Generate static params for valid providers
export async function generateStaticParams() {
  return VALID_PROVIDERS.map((provider) => ({
    provider,
  }));
}
