import { NextRequest, NextResponse } from 'next/server';
import { requireAdminWithRedirect } from '@/lib/auth/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdminWithRedirect();
    const config = await request.json();

    const supabase = await createServerClient();

    const { error } = await supabase
      .from('admin_config')
      .update({
        config_data: config,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('config_key', 'logging_settings');

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save logging settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
