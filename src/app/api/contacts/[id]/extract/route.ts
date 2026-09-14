import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
import { loadAiConfig } from '@/lib/ai/config';
import { generateReply } from '@/lib/ai/generate';
import { AiError } from '@/lib/ai/types';
import { claimManagedAiCredit, MANAGED_AI_LIMITS } from '@/lib/ai/managed-usage';
import { calculateLeadScore } from '@/lib/contacts/lead-scoring';
import { parseBookingDateTime } from '@/lib/ai/booking-parser';

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

function escapeNewlinesInsideStrings(jsonStr: string): string {
  let result = '';
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];

    if (char === '"' && !isEscaped) {
      inString = !inString;
      result += char;
    } else if (inString) {
      if (char === '\n') {
        result += '\\n';
      } else if (char === '\r') {
        result += '\\r';
      } else if (char === '\t') {
        result += '\\t';
      } else {
        result += char;
      }
    } else {
      result += char;
    }

    if (char === '\\' && !isEscaped) {
      isEscaped = true;
    } else {
      isEscaped = false;
    }
  }

  return result;
}

export function extractJsonObject(text: string): Record<string, unknown> | null {
  if (!text || typeof text !== 'string') return null;

  // 1. Try matching markdown code fence
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  let candidate = (fenced ?? text).trim();

  // 2. Find outermost JSON object
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start >= 0 && end > start) {
    candidate = candidate.slice(start, end + 1);
  } else if (start >= 0) {
    candidate = candidate.slice(start);
  } else {
    const rawStart = text.indexOf('{');
    const rawEnd = text.lastIndexOf('}');
    if (rawStart >= 0 && rawEnd > rawStart) {
      candidate = text.slice(rawStart, rawEnd + 1);
    }
  }

  // 3. Direct JSON.parse
  try {
    const parsed = JSON.parse(candidate);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      if (parsed.profile && typeof parsed.profile === 'object' && !Array.isArray(parsed.profile)) {
        return parsed.profile as Record<string, unknown>;
      }
      if (parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)) {
        return parsed.data as Record<string, unknown>;
      }
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Proceed to repair
  }

  // 4. Repair common LLM syntax flaws
  let repaired = candidate;

  // 4a. Replace Python / non-standard JSON literals
  repaired = repaired
    .replace(/:\s*None\b/g, ': null')
    .replace(/:\s*True\b/g, ': true')
    .replace(/:\s*False\b/g, ': false')
    .replace(/:\s*undefined\b/g, ': null');

  // 4b. Strip trailing commas before closing braces/brackets
  repaired = repaired.replace(/,\s*([}\]])/g, '$1');

  // 4c. Escape raw unescaped newlines/tabs inside double-quoted string literals
  repaired = escapeNewlinesInsideStrings(repaired);

  // 4d. Fix single-quoted properties and values if present
  if (repaired.includes("'")) {
    repaired = repaired.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_m, content) => {
      return `"${content.replace(/"/g, '\\"')}"`;
    });
  }

  // 4e. Ensure matching braces if response was cut off
  const openBraces = (repaired.match(/\{/g) || []).length;
  const closeBraces = (repaired.match(/\}/g) || []).length;
  if (openBraces > closeBraces) {
    const quotes = (repaired.match(/"/g) || []).length;
    if (quotes % 2 !== 0) {
      repaired += '"';
    }
    repaired += '}'.repeat(openBraces - closeBraces);
  }

  try {
    const parsed = JSON.parse(repaired);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      if (parsed.profile && typeof parsed.profile === 'object' && !Array.isArray(parsed.profile)) {
        return parsed.profile as Record<string, unknown>;
      }
      if (parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)) {
        return parsed.data as Record<string, unknown>;
      }
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Proceed to regex fallback
  }

  // 5. Fallback: regex field extraction for known CRM fields
  const fallbackResult: Record<string, unknown> = {};
  let foundAny = false;

const ALL_PROFILE_FIELDS: Array<keyof ExtractedLeadProfile> = [
  ...TEXT_FIELDS,
  'next_follow_up_at',
];

  for (const field of ALL_PROFILE_FIELDS) {
    const re = new RegExp(
      `["']?${field}["']?\\s*:\\s*(?:"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"|'([^'\\\\]*(?:\\\\.[^'\\\\]*)*)'|null|None|([^,}\\n]+))`,
      'i'
    );
    const m = text.match(re);
    if (m) {
      foundAny = true;
      const val =
        m[1] ??
        m[2] ??
        (m[3]?.trim().toLowerCase() === 'null' || m[3]?.trim().toLowerCase() === 'none'
          ? null
          : m[3]?.trim());
      fallbackResult[field] = val || null;
    }
  }

  if (foundAny) {
    return fallbackResult;
  }

  return null;
}

function normalizeProfile(raw: Record<string, unknown>, contextMessages?: string): ExtractedLeadProfile {
  const profile: ExtractedLeadProfile = {};
  for (const field of TEXT_FIELDS) {
    profile[field] = cleanText(raw[field]);
  }

  const followUp = cleanText(raw.next_follow_up_at, 120);
  if (followUp) {
    const parsed = parseBookingDateTime(followUp);
    if (parsed) {
      profile.next_follow_up_at = parsed;
    } else {
      const date = new Date(followUp);
      profile.next_follow_up_at = Number.isNaN(date.getTime()) ? null : date.toISOString();
    }
  }

  // Ensure "Meta Ads" isn't generic "Ads Agency", and "Trading" / "Share Market" are accurately captured
  const combinedContext = `${contextMessages || ''} ${String(raw.conversation_summary || '')} ${String(raw.requirement || '')} ${String(raw.industry || '')}`;
  if (/\b(meta ads?|facebook ads?|fb ads?|insta(?:gram)? ads?)\b/i.test(combinedContext)) {
    if (profile.requirement === 'Ads Agency' || !profile.requirement) {
      profile.requirement = 'Meta Ads';
    }
  }
  if (/\b(share\s*market|trading|stocks?|forex|crypto)\b/i.test(combinedContext)) {
    if (profile.industry === 'Finance' || !profile.industry) {
      profile.industry = 'Trading';
    }
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

    const nowIso = new Date().toISOString();
    const istTime = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().replace('Z', '+05:30');

    const systemPrompt = [
      'Extract sales CRM facts from the WhatsApp conversation. Return JSON only. No markdown, no explanation.',
      'Only use the supplied contact and message data. If a value is unknown, return null.',
      `Current reference time: ${nowIso} (IST: ${istTime}).`,
      'Use this exact JSON shape: {"name": string|null, "company": string|null, "industry": string|null, "business_type": string|null, "requirement": string|null, "problem": string|null, "desired_outcome": string|null, "budget": string|null, "timeline": string|null, "location": string|null, "decision_maker": string|null, "lead_source": string|null, "next_follow_up_at": string|null, "conversation_summary": string|null}.',
      'Rules:',
      '- For industry, capture specific niches like "Trading", "Share Market", "Real Estate", "Healthcare", "Restaurant", "Finance", "D2C".',
      '- For requirement, capture specific services like "Meta Ads", "Google Ads", "Automation", "Web Dev", "App Dev" (NEVER use generic "Ads Agency" when Meta Ads or Facebook Ads was requested).',
      '- For next_follow_up_at, return a valid UTC ISO-8601 date string if a future call or follow-up was confirmed (e.g. "kal din me 12 baje" is tomorrow 12:00 PM IST). Otherwise null.',
      '- Keep conversation_summary under 90 words on a single line without raw unescaped newlines.',
      `Existing contact data:\n${JSON.stringify(contact)}`,
      `Recent conversation, oldest first:\n${messages}`,
    ].join('\n\n');

    const { text } = await generateReply({
      config,
      systemPrompt,
      messages: [{ role: 'user', content: 'Extract the CRM profile JSON now.' }],
    });

    let parsed = extractJsonObject(text);
    if (!parsed) {
      console.warn('[contacts/extract] Direct JSON parsing failed, running intelligent message fallback. AI text was:', text);
      parsed = {
        industry: /\b(share\s*market|trading)\b/i.test(messages) ? 'Trading' : null,
        requirement: /\b(meta ads?|facebook ads?)\b/i.test(messages) ? 'Meta Ads' : null,
        conversation_summary: cleanText(messages.split('\n').slice(-4).join(' ').slice(0, 300)),
        next_follow_up_at: parseBookingDateTime(messages),
      };
    }

    const extracted = normalizeProfile(parsed, messages);
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
