import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  serializeContact,
  findOrCreateContact,
  ContactError,
} from './contacts';

describe('serializeContact', () => {
  it('flattens contact_tags(tags(*)) onto a tags array and nulls missing fields', () => {
    const row = {
      id: 'c1',
      phone: '+14155550123',
      name: 'Jane',
      email: null,
      company: 'Acme',
      avatar_url: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
      lead_source: null,
      lead_score: 0,
      lead_stage: 'new_lead',
      industry: null,
      business_type: null,
      requirement: null,
      problem: null,
      desired_outcome: null,
      budget: null,
      timeline: null,
      location: null,
      decision_maker: null,
      assigned_user_id: null,
      last_contacted_at: null,
      next_follow_up_at: null,
      conversation_summary: null,
      contact_tags: [
        { tags: { id: 't1', name: 'vip', color: '#fff' } },
        { tags: null }, // orphaned join — dropped
      ],
    };
    expect(serializeContact(row)).toEqual({
      id: 'c1',
      phone: '+14155550123',
      name: 'Jane',
      email: null,
      company: 'Acme',
      avatar_url: null,
      tags: [{ id: 't1', name: 'vip', color: '#fff' }],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
      lead_source: null,
      lead_score: 0,
      lead_stage: 'new_lead',
      industry: null,
      business_type: null,
      requirement: null,
      problem: null,
      desired_outcome: null,
      budget: null,
      timeline: null,
      location: null,
      decision_maker: null,
      assigned_user_id: null,
      last_contacted_at: null,
      next_follow_up_at: null,
      conversation_summary: null,
    });
  });

  it('tolerates a row with no contact_tags key', () => {
    const row = {
      id: 'c2',
      phone: '+1',
      name: null,
      email: null,
      company: null,
      avatar_url: null,
      created_at: 'a',
      updated_at: 'b',
      lead_source: null,
      lead_score: 0,
      lead_stage: 'new_lead',
      industry: null,
      business_type: null,
      requirement: null,
      problem: null,
      desired_outcome: null,
      budget: null,
      timeline: null,
      location: null,
      decision_maker: null,
      assigned_user_id: null,
      last_contacted_at: null,
      next_follow_up_at: null,
      conversation_summary: null,
    };
    expect(serializeContact(row).tags).toEqual([]);
  });
});

describe('findOrCreateContact', () => {
  const noopDb = {} as SupabaseClient;

  it('rejects a non-E.164 phone with a 400 ContactError', async () => {
    await expect(
      findOrCreateContact(noopDb, 'acc', 'user', { phone: 'not-a-number' })
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      findOrCreateContact(noopDb, 'acc', 'user', { phone: 'not-a-number' })
    ).rejects.toBeInstanceOf(ContactError);
  });
});
