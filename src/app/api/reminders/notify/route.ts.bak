import { NextResponse } from 'next/server';
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account';
import { sendAccountPushNotification } from '@/lib/mobile/firebase-admin';

export async function POST() {
  try {
    const ctx = await getCurrentAccount();
    const now = new Date().toISOString();
    const { data: due, error } = await ctx.supabase
      .from('follow_up_reminders')
      .select('id, title, conversation_id, contacts(name, phone)')
      .eq('account_id', ctx.accountId)
      .eq('user_id', ctx.userId)
      .is('completed_at', null)
      .is('notified_at', null)
      .lte('due_at', now)
      .limit(20);
    if (error) throw error;

    for (const reminder of due ?? []) {
      const contact = reminder.contacts as { name?: string | null; phone?: string | null } | null;
      const body = `${reminder.title}${contact?.name || contact?.phone ? ` · ${contact?.name || contact?.phone}` : ''}`;
      const { error: notificationError } = await ctx.supabase.from('notifications').insert({
        account_id: ctx.accountId,
        user_id: ctx.userId,
        type: 'follow_up_due',
        conversation_id: reminder.conversation_id,
        title: 'Follow-up due',
        body,
      });
      if (notificationError) throw notificationError;
      await ctx.supabase.from('follow_up_reminders').update({ notified_at: now }).eq('id', reminder.id);
      await sendAccountPushNotification(ctx.supabase, {
        accountId: ctx.accountId,
        userId: ctx.userId,
        conversationId: reminder.conversation_id ?? undefined,
        title: 'Follow-up due',
        body,
      });
    }
    return NextResponse.json({ delivered: due?.length ?? 0 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
