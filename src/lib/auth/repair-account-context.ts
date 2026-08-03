import { createClient as createAdminClient } from '@supabase/supabase-js';

type SupabaseAdminClient = ReturnType<typeof createAdminClient<any>>;

type RepairableUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

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

function profileName(user: RepairableUser) {
  const rawName = user.user_metadata?.full_name;
  if (typeof rawName === 'string' && rawName.trim()) return rawName.trim();
  return user.email ?? '';
}

/**
 * Older installs may have auth users/profiles created before account sharing
 * added accounts, profiles.account_id, and profiles.account_role. Repair that
 * context while the user is authenticated so dashboard pages/API routes can
 * safely scope data to an account.
 */
export async function repairAccountContext(user: RepairableUser) {
  const db = admin();
  const email = user.email ?? '';
  const fullName = profileName(user);

  const { data: existingProfile, error: profileErr } = await db
    .from('profiles')
    .select('id, account_id, account_role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileErr) throw profileErr;

  let accountId = existingProfile?.account_id ?? null;
  let repaired = false;

  if (accountId) {
    const { data: account, error: accountErr } = await db
      .from('accounts')
      .select('id')
      .eq('id', accountId)
      .maybeSingle();

    if (accountErr) throw accountErr;
    if (!account) accountId = null;
  }

  if (!accountId) {
    const { data: ownedAccount, error: ownedErr } = await db
      .from('accounts')
      .select('id')
      .eq('owner_user_id', user.id)
      .maybeSingle();

    if (ownedErr) throw ownedErr;

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

      if (createAccountErr) throw createAccountErr;
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

    if (insertProfileErr) throw insertProfileErr;
    return { repaired: true };
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

    if (updateProfileErr) throw updateProfileErr;
    repaired = true;
  }

  return { repaired };
}
