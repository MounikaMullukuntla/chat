/**
 * Admin Logging Configuration Page
 *
 * Provides comprehensive configuration for error logging, user activity logging,
 * and agent activity logging with toggles, retention policies, and purge functionality.
 */

import { LoggingDashboard } from "@/components/admin/logging-dashboard";
import { requireAdminWithRedirect } from "@/lib/auth/server";

// Force dynamic rendering for authenticated pages
export const dynamic = "force-dynamic";

export default async function LoggingAdminPage() {
  // Server-side admin authentication check
  await requireAdminWithRedirect();

  return <LoggingDashboard />;
}
