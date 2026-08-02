import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/server';

type SupabaseAdminClient = ReturnType<typeof createAdminClient<any>>;

let adminClient: SupabaseAdminClient | null = null;

function admin() {
  if (!adminClient) {
    adminClient = createAdminClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return adminClient;
}

function profileName(user: {
  email?: string;
  user_metadata?: Record<string, unknown>;
}) {
  const rawName = user.user_metadata?.full_name;
  if (typeof rawName === 'string' && rawName.trim()) return rawName.trim();
  return user.email ?? '';
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = admin();
  const email = user.email ?? '';
  const fullName = profileName(user);

  const { data: existingProfile, error: profileErr } = await db
    .from('profiles')
    .select('id, account_id, account_role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileErr) {
    console.error('[repair-profile] profile lookup failed:', profileErr);
    return NextResponse.json(
      { error: 'Could not repair profile' },
      { status: 500 }
    );
  }

  let accountId = existingProfile?.account_id ?? null;
  let repaired = false;

  if (accountId) {
    const { data: account, error: accountErr } = await db
      .from('accounts')
      .select('id')
      .eq('id', accountId)
      .maybeSingle();

    if (accountErr) {
      console.error('[repair-profile] account lookup failed:', accountErr);
      return NextResponse.json(
        { error: 'Could not repair profile' },
        { status: 500 }
      );
    }

    if (!account) accountId = null;
  }

  if (!accountId) {
    const { data: ownedAccount, error: ownedErr } = await db
      .from('accounts')
      .select('id')
      .eq('owner_user_id', user.id)
      .maybeSingle();

    if (ownedErr) {
      console.error('[repair-profile] owned account lookup failed:', ownedErr);
      return NextResponse.json(
        { error: 'Could not repair profile' },
        { status: 500 }
      );
    }

    if (ownedAccount) {
      accountId = ownedAccount.id;
    } else {
      const { data: createdAccount, error: createAccountErr } = await db
        .from('accounts')
        .insert({
          name: fullName || email || 'My account',
          owner_user_id: user.id,
        })
        .select('id')
        .single();

      if (createAccountErr) {
        console.error(
          '[repair-profile] account create failed:',
          createAccountErr
        );
        return NextResponse.json(
          { error: 'Could not repair profile' },
          { status: 500 }
        );
      }

      accountId = createdAccount.id;
    }
    repaired = true;
  }

  if (!existingProfile) {
    const { error: insertProfileErr } = await db.from('profiles').insert({
      user_id: user.id,
      full_name: fullName,
      email,
      account_id: accountId,
      account_role: 'owner',
    });

    if (insertProfileErr) {
      console.error(
        '[repair-profile] profile create failed:',
        insertProfileErr
      );
      return NextResponse.json(
        { error: 'Could not repair profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ repaired: true });
  }

  const role =
    existingProfile.account_id === accountId && existingProfile.account_role
      ? existingProfile.account_role
      : 'owner';

  if (
    existingProfile.account_id !== accountId ||
    existingProfile.account_role !== role
  ) {
    const { error: updateProfileErr } = await db
      .from('profiles')
      .update({
        account_id: accountId,
        account_role: role,
      })
      .eq('user_id', user.id);

    if (updateProfileErr) {
      console.error(
        '[repair-profile] profile update failed:',
        updateProfileErr
      );
      return NextResponse.json(
        { error: 'Could not repair profile' },
        { status: 500 }
      );
    }

    repaired = true;
  }

  return NextResponse.json({ repaired });
}
