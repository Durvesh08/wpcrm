import { NextResponse } from 'next/server';

import { repairAccountContext } from '@/lib/auth/repair-account-context';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await repairAccountContext(user);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[repair-profile] repair failed:', err);
    return NextResponse.json(
      { error: 'Could not repair profile' },
      { status: 500 }
    );
  }
}
