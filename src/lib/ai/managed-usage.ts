import type { SupabaseClient } from '@supabase/supabase-js';

const UNLIMITED_EMAIL = 'rpyadsrahufin25@gmail.com';
const AUTO_REPLY_LIMIT = 1000;
const COPILOT_LIMIT = 50;

export type ManagedAiCreditKind = 'auto_reply' | 'copilot';

export async function claimManagedAiCredit(
  db: SupabaseClient,
  userId: string,
  kind: ManagedAiCreditKind,
): Promise<boolean> {
  const { data: profile } = await db
    .from('profiles')
    .select('email')
    .eq('user_id', userId)
    .maybeSingle();

  if (profile?.email?.trim().toLowerCase() === UNLIMITED_EMAIL) return true;

  const limit = kind === 'auto_reply' ? AUTO_REPLY_LIMIT : COPILOT_LIMIT;
  const { data, error } = await db.rpc('claim_managed_ai_credit', {
    target_user_id: userId,
    credit_kind: kind,
    credit_limit: limit,
  });
  if (error) {
    console.error('[managed-ai] credit claim failed:', error);
    return false;
  }
  return data === true;
}

export const MANAGED_AI_LIMITS = { autoReply: AUTO_REPLY_LIMIT, copilot: COPILOT_LIMIT };
