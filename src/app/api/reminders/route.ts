import { NextResponse } from 'next/server';
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account';

function parseDueAt(value: unknown) {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET() {
  try {
    const ctx = await getCurrentAccount();
    const { data, error } = await ctx.supabase
      .from('follow_up_reminders')
      .select('id, contact_id, conversation_id, title, due_at, completed_at, created_at, contacts(name, phone)')
      .eq('account_id', ctx.accountId)
      .order('due_at', { ascending: true })
      .limit(100);

    if (error) throw error;
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
        title,
        due_at: dueAt.toISOString(),
      })
      .select('id, title, due_at')
      .single();
    if (error) throw error;
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
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
