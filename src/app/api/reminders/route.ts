import { NextResponse } from 'next/server';
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account';

function parseDueAt(value: unknown) {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isMissingReminderTable(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'PGRST205';
}

function reminderMigrationResponse() {
  return NextResponse.json({ error: 'Calendar setup is pending. Run Supabase migration 035_calendar_repair.sql once, then reload.' }, { status: 503 });
}

export async function GET() {
  try {
    const ctx = await getCurrentAccount();
    const { data, error } = await ctx.supabase
      .from('follow_up_reminders')
      .select('id, contact_id, conversation_id, kind, title, due_at, completed_at, created_at, contacts(name, phone)')
      .eq('account_id', ctx.accountId)
      .order('due_at', { ascending: true })
      .limit(100);

    if (error) {
      if (isMissingReminderTable(error)) return reminderMigrationResponse();
      throw error;
    }
    return NextResponse.json({ reminders: data ?? [] });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getCurrentAccount();
    const body = await request.json().catch(() => null);
    const contactId = typeof body?.contactId === 'string' ? body.contactId : '';
    const conversationId = typeof body?.conversationId === 'string' ? body.conversationId : null;
    const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 240) : '';
    const kind = body?.kind === 'call' || body?.kind === 'note' ? body.kind : 'follow_up';
    const dueAt = parseDueAt(body?.dueAt);

    if (!contactId || !title || !dueAt) {
      return NextResponse.json({ error: 'Contact, reminder title, and due date are required.' }, { status: 400 });
    }

    const { data: contact, error: contactError } = await ctx.supabase
      .from('contacts')
      .select('id')
      .eq('id', contactId)
      .eq('account_id', ctx.accountId)
      .maybeSingle();
    if (contactError) throw contactError;
    if (!contact) return NextResponse.json({ error: 'Contact was not found.' }, { status: 404 });

    const { data, error } = await ctx.supabase
      .from('follow_up_reminders')
      .insert({
        account_id: ctx.accountId,
        user_id: ctx.userId,
        contact_id: contactId,
        conversation_id: conversationId,
        kind,
        title,
        due_at: dueAt.toISOString(),
      })
      .select('id, title, due_at')
      .single();
    if (error) {
      if (isMissingReminderTable(error)) return reminderMigrationResponse();
      throw error;
    }
    return NextResponse.json({ reminder: data }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await getCurrentAccount();
    const body = await request.json().catch(() => null);
    const id = typeof body?.id === 'string' ? body.id : '';
    if (!id) return NextResponse.json({ error: 'Reminder id is required.' }, { status: 400 });
    const { error } = await ctx.supabase
      .from('follow_up_reminders')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('account_id', ctx.accountId);
    if (error) {
      if (isMissingReminderTable(error)) return reminderMigrationResponse();
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
