import { NextResponse } from 'next/server';
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account';

const KINDS = ['follow_up', 'call', 'whatsapp', 'meeting', 'note'] as const;
const STATUSES = ['scheduled', 'completed', 'cancelled', 'no_show'] as const;

function parseDueAt(value: unknown) {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseKind(value: unknown) {
  return typeof value === 'string' && KINDS.includes(value as (typeof KINDS)[number])
    ? value
    : 'follow_up';
}

function parseStatus(value: unknown) {
  return typeof value === 'string' && STATUSES.includes(value as (typeof STATUSES)[number])
    ? value
    : null;
}

function isMissingReminderTable(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && ['PGRST205', 'PGRST204', '42703'].includes((error as { code?: string }).code ?? '');
}

function reminderMigrationResponse() {
  return NextResponse.json({ error: 'Calendar setup is pending. Run Supabase migrations 035_calendar_repair.sql and 039_calendar_appointments_tasks.sql once, then reload.' }, { status: 503 });
}

export async function GET() {
  try {
    const ctx = await getCurrentAccount();
    const { data, error } = await ctx.supabase
      .from('follow_up_reminders')
      .select('id, contact_id, conversation_id, kind, title, due_at, completed_at, created_at, status, assigned_user_id, meeting_location, meeting_url, reminder_minutes_before, cancelled_at, no_show_at, completed_notes, contacts(name, phone)')
      .eq('account_id', ctx.accountId)
      .order('due_at', { ascending: true })
      .limit(250);

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
    const kind = parseKind(body?.kind);
    const dueAt = parseDueAt(body?.dueAt);
    const assignedUserId = typeof body?.assignedUserId === 'string' && body.assignedUserId ? body.assignedUserId : ctx.userId;
    const meetingLocation = typeof body?.meetingLocation === 'string' ? body.meetingLocation.trim().slice(0, 240) || null : null;
    const meetingUrl = typeof body?.meetingUrl === 'string' ? body.meetingUrl.trim().slice(0, 500) || null : null;
    const reminderMinutesBefore = Number.isFinite(Number(body?.reminderMinutesBefore))
      ? Math.min(10080, Math.max(0, Math.floor(Number(body.reminderMinutesBefore))))
      : 30;

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
        assigned_user_id: assignedUserId,
        contact_id: contactId,
        conversation_id: conversationId,
        kind,
        title,
        due_at: dueAt.toISOString(),
        status: 'scheduled',
        meeting_location: meetingLocation,
        meeting_url: meetingUrl,
        reminder_minutes_before: reminderMinutesBefore,
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
    const status = parseStatus(body?.status) ?? 'completed';
    const dueAt = parseDueAt(body?.dueAt);
    const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 240) : null;
    const notes = typeof body?.completedNotes === 'string' ? body.completedNotes.trim().slice(0, 1000) || null : undefined;
    const update: Record<string, unknown> = { status };

    if (title) update.title = title;
    if (dueAt) {
      update.due_at = dueAt.toISOString();
      update.status = 'scheduled';
      update.completed_at = null;
      update.cancelled_at = null;
      update.no_show_at = null;
    } else if (status === 'completed') {
      update.completed_at = new Date().toISOString();
      update.cancelled_at = null;
      update.no_show_at = null;
    } else if (status === 'cancelled') {
      update.cancelled_at = new Date().toISOString();
      update.completed_at = null;
      update.no_show_at = null;
    } else if (status === 'no_show') {
      update.no_show_at = new Date().toISOString();
      update.completed_at = null;
      update.cancelled_at = null;
    } else {
      update.completed_at = null;
      update.cancelled_at = null;
      update.no_show_at = null;
    }
    if (notes !== undefined) update.completed_notes = notes;

    const { error } = await ctx.supabase
      .from('follow_up_reminders')
      .update(update)
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

export async function DELETE(request: Request) {
  try {
    const ctx = await getCurrentAccount();
    const url = new URL(request.url);
    const id = url.searchParams.get('id') ?? '';
    if (!id) return NextResponse.json({ error: 'Reminder id is required.' }, { status: 400 });
    const { error } = await ctx.supabase
      .from('follow_up_reminders')
      .delete()
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
