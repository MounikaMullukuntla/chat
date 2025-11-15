import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Authenticate admin user
    await requireAdmin();

    const supabase = await createServerClient();

    const { data, error } = await supabase.rpc('purge_old_activity_logs');

    if (error) {
      console.error('Purge error:', error);
      throw error;
    }

    // The function returns a single row with the counts
    const result = Array.isArray(data) && data.length > 0 ? data[0] : data;

    return NextResponse.json(result || {
      user_logs_deleted: 0,
      agent_logs_deleted: 0,
      error_logs_deleted: 0
    });
  } catch (error) {
    console.error('Failed to purge logs:', error);
    return NextResponse.json(
      { error: 'Failed to purge logs' },
      { status: 500 }
    );
  }
}
