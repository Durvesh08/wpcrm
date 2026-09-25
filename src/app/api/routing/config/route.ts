import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/account';

export async function GET(req: Request) {
  try {
    const { accountId, supabase } = await requireRole('agent');

    const { data: config, error } = await supabase
      .from('routing_configs')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[GET /api/routing/config] error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch routing config' },
        { status: 500 }
      );
    }

    if (!config) {
      return NextResponse.json({
        mode: 'manual',
        skip_offline: true,
        reassign_on_reopen: false,
        enabled: true,
      });
    }

    return NextResponse.json(config);
  } catch (error: any) {
    console.error('[GET /api/routing/config] err:', error);
    return NextResponse.json(
      { error: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const { accountId, supabase } = await requireRole('admin');
    const body = await req.json();

    const { mode, skip_offline, reassign_on_reopen, enabled } = body;

    const { data: config, error } = await supabase
      .from('routing_configs')
      .upsert(
        {
          account_id: accountId,
          mode: mode ?? 'manual',
          skip_offline: skip_offline ?? true,
          reassign_on_reopen: reassign_on_reopen ?? false,
          enabled: enabled ?? true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'account_id' }
      )
      .select('*')
      .single();

    if (error) {
      console.error('[PUT /api/routing/config] error:', error);
      return NextResponse.json(
        { error: 'Failed to update routing config' },
        { status: 500 }
      );
    }

    return NextResponse.json(config);
  } catch (error: any) {
    console.error('[PUT /api/routing/config] err:', error);
    return NextResponse.json(
      { error: error.message || 'Internal error' },
      { status: error.status || 500 }
    );
  }
}
