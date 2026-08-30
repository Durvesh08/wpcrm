// ============================================================
// Shared contact logic for the public API (v1) contact endpoints.
//
// Kept out of the route files so `GET/POST /api/v1/contacts` and
// `GET/PATCH /api/v1/contacts/{id}` share one serializer, one
// find-or-create (built on the same `findExistingContact` dedupe the
// webhook and send path use), and one tag-sync routine.
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';

import { findExistingContact, isUniqueViolation } from '@/lib/contacts/dedupe';
import { resolveImportTagIds } from '@/lib/contacts/resolve-import-tags';
import { sanitizePhoneForMeta, isValidE164 } from '@/lib/whatsapp/phone-utils';

/** Row select that embeds the contact's tags for serialization. */
export const CONTACT_SELECT = '*, contact_tags(tags(*))';

export const CONTACT_SCALAR_FIELDS = [
  'name',
  'email',
  'company',
  'lead_source',
  'industry',
  'business_type',
  'requirement',
  'problem',
  'desired_outcome',
  'budget',
  'timeline',
  'location',
  'decision_maker',
  'assigned_user_id',
  'last_contacted_at',
  'next_follow_up_at',
  'conversation_summary',
] as const;

export const CONTACT_LEAD_STAGES = [
  'new_lead',
  'cold',
  'warm',
  'hot',
  'qualified',
  'sales_ready',
  'customer',
] as const;

export type ContactScalarField = (typeof CONTACT_SCALAR_FIELDS)[number];
export type ContactLeadStage = (typeof CONTACT_LEAD_STAGES)[number];

export interface ApiContact {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  company: string | null;
  avatar_url: string | null;
  lead_source: string | null;
  lead_score: number;
  lead_stage: ContactLeadStage;
  industry: string | null;
  business_type: string | null;
  requirement: string | null;
  problem: string | null;
  desired_outcome: string | null;
  budget: string | null;
  timeline: string | null;
  location: string | null;
  decision_maker: string | null;
  assigned_user_id: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  conversation_summary: string | null;
  tags: { id: string; name: string; color: string }[];
  created_at: string;
  updated_at: string;
}

/** Thrown by the helpers below; routes map `.status`/`.message`. */
export class ContactError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ContactError';
    this.status = status;
  }
}

type RawTagJoin = { tags: { id: string; name: string; color: string } | null };

function nullableString(row: Record<string, unknown>, key: string) {
  return (row[key] as string | null | undefined) ?? null;
}

function parseLeadStage(value: unknown): ContactLeadStage {
  return CONTACT_LEAD_STAGES.includes(value as ContactLeadStage)
    ? (value as ContactLeadStage)
    : 'new_lead';
}

/** Flatten a `CONTACT_SELECT` row into the public contact shape. */
export function serializeContact(row: Record<string, unknown>): ApiContact {
  const joins = (row.contact_tags as RawTagJoin[] | undefined) ?? [];
  return {
    id: row.id as string,
    phone: row.phone as string,
    name: (row.name as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    company: (row.company as string | null) ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
    lead_source: nullableString(row, 'lead_source'),
    lead_score: Number(row.lead_score ?? 0),
    lead_stage: parseLeadStage(row.lead_stage),
    industry: nullableString(row, 'industry'),
    business_type: nullableString(row, 'business_type'),
    requirement: nullableString(row, 'requirement'),
    problem: nullableString(row, 'problem'),
    desired_outcome: nullableString(row, 'desired_outcome'),
    budget: nullableString(row, 'budget'),
    timeline: nullableString(row, 'timeline'),
    location: nullableString(row, 'location'),
    decision_maker: nullableString(row, 'decision_maker'),
    assigned_user_id: nullableString(row, 'assigned_user_id'),
    last_contacted_at: nullableString(row, 'last_contacted_at'),
    next_follow_up_at: nullableString(row, 'next_follow_up_at'),
    conversation_summary: nullableString(row, 'conversation_summary'),
    tags: joins
      .map((j) => j.tags)
      .filter((t): t is NonNullable<RawTagJoin['tags']> => t != null)
      .map((t) => ({ id: t.id, name: t.name, color: t.color })),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

/**
 * Resolve the audit `user_id` for API-created rows — the SINGLE source
 * of truth used by every public-API write (contacts, messages,
 * broadcasts, resolve-conversation), so the same key's writes are
 * always attributed to the same human. API callers have no logged-in
 * user, so — like the inbound webhook — we attribute writes to the
 * **WhatsApp config owner** (the webhook's own convention). Contacts
 * can be created before WhatsApp is connected, so we fall back to the
 * account owner when there's no config yet.
 */
export async function resolveAuditUserId(
  db: SupabaseClient,
  accountId: string
): Promise<string> {
  const { data: config } = await db
    .from('whatsapp_config')
    .select('user_id')
    .eq('account_id', accountId)
    .maybeSingle();
  const configOwner = config?.user_id as string | undefined;
  if (configOwner) return configOwner;

  const { data: account } = await db
    .from('accounts')
    .select('owner_user_id')
    .eq('id', accountId)
    .maybeSingle();
  const owner = account?.owner_user_id as string | undefined;
  if (!owner) {
    throw new ContactError('Account owner could not be resolved', 500);
  }
  return owner;
}

export interface ContactInput {
  phone: string;
  name?: string | null;
  email?: string | null;
  company?: string | null;
  lead_source?: string | null;
  lead_score?: number | null;
  lead_stage?: ContactLeadStage | null;
  industry?: string | null;
  business_type?: string | null;
  requirement?: string | null;
  problem?: string | null;
  desired_outcome?: string | null;
  budget?: string | null;
  timeline?: string | null;
  location?: string | null;
  decision_maker?: string | null;
  assigned_user_id?: string | null;
  last_contacted_at?: string | null;
  next_follow_up_at?: string | null;
  conversation_summary?: string | null;
}

/**
 * Find (by fuzzy phone match) or create a contact in `accountId`.
 * Returns the contact id and whether it was created. Reuses the shared
 * `findExistingContact` dedupe + unique-violation race backstop so an
 * API-created contact is indistinguishable from a webhook-created one.
 */
export async function findOrCreateContact(
  db: SupabaseClient,
  accountId: string,
  auditUserId: string,
  input: ContactInput
): Promise<{ id: string; created: boolean }> {
  const sanitized = sanitizePhoneForMeta(input.phone);
  if (!isValidE164(sanitized)) {
    throw new ContactError(
      "'phone' must be a valid phone number in E.164 format (e.g. +14155550123)",
      400
    );
  }

  const existing = await findExistingContact(db, accountId, sanitized);
  if (existing) return { id: existing.id, created: false };

  const { data: created, error } = await db
    .from('contacts')
    .insert({
      account_id: accountId,
      user_id: auditUserId,
      phone: sanitized,
      name: input.name ?? sanitized,
      email: input.email ?? null,
      company: input.company ?? null,
      lead_source: input.lead_source ?? null,
      lead_score: input.lead_score ?? 0,
      lead_stage: input.lead_stage ?? 'new_lead',
      industry: input.industry ?? null,
      business_type: input.business_type ?? null,
      requirement: input.requirement ?? null,
      problem: input.problem ?? null,
      desired_outcome: input.desired_outcome ?? null,
      budget: input.budget ?? null,
      timeline: input.timeline ?? null,
      location: input.location ?? null,
      decision_maker: input.decision_maker ?? null,
      assigned_user_id: input.assigned_user_id ?? null,
      last_contacted_at: input.last_contacted_at ?? null,
      next_follow_up_at: input.next_follow_up_at ?? null,
      conversation_summary: input.conversation_summary ?? null,
    })
    .select('id')
    .single();

  if (error || !created) {
    // Lost a race against a concurrent create — the unique index
    // rejected the duplicate. Re-resolve to the winner.
    if (isUniqueViolation(error)) {
      const raced = await findExistingContact(db, accountId, sanitized);
      if (raced) return { id: raced.id, created: false };
    }
    console.error('[api/v1/contacts] create error:', error);
    throw new ContactError('Failed to create contact', 500);
  }

  return { id: created.id, created: true };
}

/**
 * Replace a contact's tags to exactly match `tagNames` (case-
 * insensitive; missing tags are created). A no-op when `tagNames` is
 * undefined — pass `[]` to clear all tags. Reuses `resolveImportTagIds`
 * so API and CSV-import tag handling stay consistent.
 */
export async function setContactTags(
  db: SupabaseClient,
  accountId: string,
  auditUserId: string,
  contactId: string,
  tagNames: string[]
): Promise<void> {
  const { tagIdByKey } = await resolveImportTagIds(db, {
    accountId,
    userId: auditUserId,
    tagNames,
    canCreateTags: true,
  });
  const desired = new Set(tagIdByKey.values());

  // Diff against the current joins rather than delete-all-then-insert:
  // a diff only touches tags that actually change, so a mid-operation
  // failure can never wipe tags that were meant to stay. Every write
  // is error-checked and surfaced as a ContactError (→ 500) instead of
  // being swallowed behind a misleading 200.
  const { data: current, error: readErr } = await db
    .from('contact_tags')
    .select('tag_id')
    .eq('contact_id', contactId);
  if (readErr) {
    throw new ContactError('Failed to read contact tags', 500);
  }
  const existing = new Set(
    (current ?? []).map((r) => r.tag_id as string)
  );

  const toAdd = [...desired].filter((id) => !existing.has(id));
  const toRemove = [...existing].filter((id) => !desired.has(id));

  if (toRemove.length > 0) {
    const { error } = await db
      .from('contact_tags')
      .delete()
      .eq('contact_id', contactId)
      .in('tag_id', toRemove);
    if (error) throw new ContactError('Failed to update contact tags', 500);
  }
  if (toAdd.length > 0) {
    const { error } = await db
      .from('contact_tags')
      .insert(toAdd.map((tag_id) => ({ contact_id: contactId, tag_id })));
    if (error) throw new ContactError('Failed to update contact tags', 500);
  }
}

/** Fetch + serialize a single contact scoped to the account, or null. */
export async function getContactById(
  db: SupabaseClient,
  accountId: string,
  contactId: string
): Promise<ApiContact | null> {
  const { data, error } = await db
    .from('contacts')
    .select(CONTACT_SELECT)
    .eq('id', contactId)
    .eq('account_id', accountId)
    .maybeSingle();
  if (error || !data) return null;
  return serializeContact(data as Record<string, unknown>);
}
