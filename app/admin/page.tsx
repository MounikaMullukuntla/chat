/**
 * Admin Dashboard - Provider Selection
 * 
 * This page provides a provider selection interface for admin configuration.
 * Only users with admin role can access this page.
 */

import { requireAdminWithRedirect } from '@/lib/auth/server'
import { AdminDashboard } from '@/components/admin/admin-dashboard'

// Force dynamic rendering for authenticated pages
export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  // Server-side admin authentication check
  // This will redirect non-admin users to home page
  await requireAdminWithRedirect()
  
  return <AdminDashboard />
}