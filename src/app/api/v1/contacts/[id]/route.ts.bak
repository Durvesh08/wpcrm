// ============================================================
// GET   /api/v1/contacts/{id} — read a contact  (scope: contacts:read)
// PATCH /api/v1/contacts/{id} — update a contact (scope: contacts:write)
//
// Both are account-scoped: a contact belonging to another account
// returns 404 (never 403 — don't reveal it exists elsewhere).
// PATCH updates only the fields present in the body; pass `tags` (an
// array of tag names) to replace the contact's tags.
// ============================================================

import { requireApiKey } from '@/lib/auth/api-context';
import { ok, fail, toApiErrorResponse } from '@/lib/api/v1/respond';
import { calculateLeadScore } from '@/lib/contacts/lead-scoring';
import {
  CONTACT_LEAD_STAGES,
  CONTACT_SCALAR_FIELDS,
  getContactById,
  setContactTags,
  resolveAuditUserId,
  ContactError,
  type ContactLeadStage,
} from '@/lib/api/v1/contacts';

function isNullableString(value: unknown) {
  return value === null || typeof value === 'string';
}

function isDateField(field: string) {
  return field === 'last_contacted_at' || field === 'next_follow_up_at';
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireApiKey(request, 'contacts:read');
    const { id } = await params;
    const contact = await getContactById(ctx.supabase, ctx.accountId, id);
    if (!contact) return fail('not_found', 'Contact not found', 404);
    return ok(contact);
  } catch (err) {
    return toApiErrorResponse(err);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireApiKey(request, 'contacts:write');
    const { id } = await params;

    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!body || typeof body !== 'object') {
      return fail('bad_request', 'Request body must be a JSON object', 400);
    }

    // Verify the contact is in this account before mutating anything.
    const existing = await getContactById(ctx.supabase, ctx.accountId, id);
    if (!existing) return fail('not_found', 'Contact not found', 404);

    // Build a partial update from the provided scalar fields. A field
    // is updated only when its key is PRESENT (so omitted fields are
    // untouched); `null` clears it, a string sets it, and any other
    // type is a 400 rather than a silently-ignored no-op.
    const updates: Record<string, unknown> = {};
    for (const field of CONTACT_SCALAR_FIELDS) {
      if (!(field in body)) continue;
      const value = body[field];
      if (!isNullableString(value)) {
        return fail('bad_request', `'${field}' must be a string or null`, 400);
      }
      if (typeof value === 'string' && isDateField(field)) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
          return fail('bad_request', `'${field}' must be a valid date string`, 400);
        }
        updates[field] = date.toISOString();
      } else {
        updates[field] = value;
      }
    }

    if ('lead_score' in body) {
      const value = body.lead_score;
      if (value === null) {
        updates.lead_score = 0;
      } else {
        const score = typeof value === 'number' ? value : Number(value);
        if (!Number.isFinite(score)) {
          return fail('bad_request', "'lead_score' must be a number between 0 and 100", 400);
        }
        updates.lead_score = Math.max(0, Math.min(100, Math.round(score)));
      }
    }

    if ('lead_stage' in body) {
      const value = body.lead_stage;
      if (
        typeof value !== 'string' ||
        !CONTACT_LEAD_STAGES.includes(value as ContactLeadStage)
      ) {
        return fail('bad_request', "'lead_stage' is not supported", 400);
      }
      updates.lead_stage = value;
    }

    if (body.auto_score === true) {
      const priority = calculateLeadScore({
        requirement: (updates.requirement as string | null | undefined) ?? existing.requirement,
        problem: (updates.problem as string | null | undefined) ?? existing.problem,
        desired_outcome:
          (updates.desired_outcome as string | null | undefined) ?? existing.desired_outcome,
        budget: (updates.budget as string | null | undefined) ?? existing.budget,
        timeline: (updates.timeline as string | null | undefined) ?? existing.timeline,
        decision_maker:
          (updates.decision_maker as string | null | undefined) ?? existing.decision_maker,
        next_follow_up_at:
          (updates.next_follow_up_at as string | null | undefined) ?? existing.next_follow_up_at,
        conversation_summary:
          (updates.conversation_summary as string | null | undefined) ?? existing.conversation_summary,
      });
      updates.lead_score = priority.score;
      updates.lead_stage = priority.stage;
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      const { error } = await ctx.supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .eq('account_id', ctx.accountId);
      if (error) {
        console.error('[api/v1/contacts] update error:', error);
        return fail('internal', 'Failed to update contact', 500);
      }
    }

    if (Array.isArray(body.tags)) {
      const auditUserId = await resolveAuditUserId(ctx.supabase, ctx.accountId);
      await setContactTags(
        ctx.supabase,
        ctx.accountId,
        auditUserId,
        id,
        body.tags.filter((t): t is string => typeof t === 'string')
      );
    }

    const contact = await getContactById(ctx.supabase, ctx.accountId, id);
    return ok(contact);
  } catch (err) {
    if (err instanceof ContactError) {
      return fail(err.status === 400 ? 'bad_request' : 'internal', err.message, err.status);
    }
    return toApiErrorResponse(err);
  }
}
