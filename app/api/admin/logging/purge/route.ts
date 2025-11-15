import { NextRequest, NextResponse } from 'next/server';
import { requireAdminWithRedirect } from '@/lib/auth/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    await requireAdminWithRedirect();
    const supabase = await createServerClient();

    const { data, error } = await supabase.rpc('purge_old_activity_logs');

    if (error) {
      throw error;
    }

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error('Failed to purge logs:', error);
    return NextResponse.json(
      { error: 'Failed to purge logs' },
      { status: 500 }
    );
  }
}
