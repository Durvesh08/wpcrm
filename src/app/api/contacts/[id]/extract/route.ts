import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
import { loadAiConfig } from '@/lib/ai/config';
import { generateReply } from '@/lib/ai/generate';
import { AiError } from '@/lib/ai/types';
import { claimManagedAiCredit, MANAGED_AI_LIMITS } from '@/lib/ai/managed-usage';
import { calculateLeadScore } from '@/lib/contacts/lead-scoring';

type ExtractedLeadProfile = {
  name?: string | null;
  company?: string | null;
  industry?: string | null;
  business_type?: string | null;
  requirement?: string | null;
  problem?: string | null;
  desired_outcome?: string | null;
  budget?: string | null;
  timeline?: string | null;
  location?: string | null;
  decision_maker?: string | null;
  lead_source?: string | null;
  next_follow_up_at?: string | null;
  conversation_summary?: string | null;
};

const TEXT_FIELDS: Array<keyof ExtractedLeadProfile> = [
  'name',
  'company',
  'industry',
  'business_type',
  'requirement',
  'problem',
  'desired_outcome',
  'budget',
  'timeline',
  'location',
  'decision_maker',
  'lead_source',
  'conversation_summary',
];

function cleanText(value: unknown, max = 800) {
  return typeof value === 'string' ? value.trim().slice(0, max) || null : null;
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const source = fenced ?? text;
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(source.slice(start, end + 1));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function normalizeProfile(raw: Record<string, unknown>): ExtractedLeadProfile {
  const profile: ExtractedLeadProfile = {};
  for (const field of TEXT_FIELDS) {
    profile[field] = cleanText(raw[field]);
  }

  const followUp = cleanText(raw.next_follow_up_at, 80);
  if (followUp) {
    const date = new Date(followUp);
    profile.next_follow_up_at = Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return profile;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent');
    const { id } = await params;

    const limit = checkRateLimit(`contact-extract:${userId}`, RATE_LIMITS.aiDraft);
    if (!limit.success) return rateLimitResponse(limit);

    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, name, phone, email, company, lead_source, industry, business_type, requirement, problem, desired_outcome, budget, timeline, location, decision_maker, next_follow_up_at, conversation_summary')
      .eq('id', id)
      .eq('account_id', accountId)
      .maybeSingle();
    if (contactError) throw contactError;
    if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

    const { data: conversations, error: conversationError } = await supabase
      .from('conversations')
      .select('id')
      .eq('contact_id', id)
      .eq('account_id', accountId)
      .order('last_message_at', { ascending: false })
      .limit(3);
    if (conversationError) throw conversationError;

    const conversationIds = (conversations ?? []).map((row) => row.id as string);
    if (conversationIds.length === 0) {
      return NextResponse.json(
        { error: 'No conversation history found for this contact.' },
        { status: 400 }
      );
    }

    const { data: messageRows, error: messageError } = await supabase
      .from('messages')
      .select('sender_type, content_type, content_text, created_at')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false })
      .limit(50);
    if (messageError) throw messageError;

    const messages = (messageRows ?? [])
      .reverse()
      .map((message) => {
        const text =
          typeof message.content_text === 'string' && message.content_text.trim()
            ? message.content_text.trim().slice(0, 1200)
            : `[${message.content_type}]`;
        return `${message.sender_type}: ${text}`;
      })
      .join('\n');

    if (!messages.trim()) {
      return NextResponse.json(
        { error: 'No readable messages found for this contact.' },
        { status: 400 }
      );
    }

    const config = await loadAiConfig(supabase, accountId, {
      requireActive: false,
    }).catch((error) => {
      console.error('[contacts/extract] loadAiConfig error:', error);
      throw new AiError('Stored API key could not be decrypted. Re-enter it in AI Setup.', {
        code: 'key_decrypt_failed',
        status: 400,
      });
    });
    if (!config) {
      return NextResponse.json(
        { error: 'Set up an AI provider key in AI Agents before extracting lead data.' },
        { status: 400 }
      );
    }
    if (config.managedAi) {
      const hasCredit = await claimManagedAiCredit(supabase, userId, 'copilot');
      if (!hasCredit) {
        return NextResponse.json(
          {
            error: `Your included AI Copilot allowance of ${MANAGED_AI_LIMITS.copilot} requests has been used. Add your own API key in AI Agents to continue.`,
            code: 'managed_copilot_limit_reached',
          },
          { status: 429 }
        );
      }
    }

    const systemPrompt = [
      'Extract sales CRM facts from the WhatsApp conversation. Return JSON only. No markdown, no explanation.',
      'Only use the supplied contact and message data. If a value is unknown, return null.',
      'Use this exact JSON shape: {"name": string|null, "company": string|null, "industry": string|null, "business_type": string|null, "requirement": string|null, "problem": string|null, "desired_outcome": string|null, "budget": string|null, "timeline": string|null, "location": string|null, "decision_maker": string|null, "lead_source": string|null, "next_follow_up_at": string|null, "conversation_summary": string|null}.',
      'For next_follow_up_at, return an ISO date only if the customer or agent clearly discussed a future follow-up/call time. Otherwise null.',
      'Keep conversation_summary under 90 words and make it useful for a sales executive.',
      `Existing contact data:\n${JSON.stringify(contact)}`,
      `Recent conversation, oldest first:\n${messages}`,
    ].join('\n\n');

    const { text } = await generateReply({
      config,
      systemPrompt,
      messages: [{ role: 'user', content: 'Extract the CRM profile JSON now.' }],
    });

    const parsed = extractJsonObject(text);
    if (!parsed) {
      return NextResponse.json(
        { error: 'AI returned an unreadable extraction. Try again.' },
        { status: 502 }
      );
    }

    const extracted = normalizeProfile(parsed);
    const priority = calculateLeadScore(extracted);
    const updates = {
      ...extracted,
      lead_score: priority.score,
      lead_stage: priority.stage,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updateError } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .eq('account_id', accountId)
      .select('*')
      .single();
    if (updateError) throw updateError;

    return NextResponse.json({ contact: updated, extracted, lead_score: priority.score, lead_stage: priority.stage });
  } catch (error) {
    if (error instanceof AiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    return toErrorResponse(error);
  }
}
