import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from '@/lib/rate-limit';
import { loadAiConfig } from '@/lib/ai/config';
import { generateReply } from '@/lib/ai/generate';
import { AiError } from '@/lib/ai/types';
import { claimManagedAiCredit, MANAGED_AI_LIMITS } from '@/lib/ai/managed-usage';

const ACTIONS = [
  'daily_briefing',
  'blocked_work',
  'weekly_report',
  'summarize_unread',
  'translate_messages',
  'buying_signals',
  'inactive_customers',
  'generate_tags',
  'group_contacts',
  'stalled_deals',
  'forecast_revenue',
  'predict_close_rate',
  'best_segment',
  'draft_campaign',
  'review_delivery',
  'create_automation',
  'audit_workflow',
  'today_priorities',
] as const;

type CopilotAction = (typeof ACTIONS)[number];

const ACTION_GUIDANCE: Record<CopilotAction, string> = {
  daily_briefing:
    'Provide an executive operational briefing: 1) ## ⚡ Executive Pulse (2 punchy sentences on active chats, unread waiting count, pipeline value, and today\'s top opportunity), 2) ## 🎯 Priority Lead Actions (top waiting leads: Lead Name, Category, exact customer request, and the specific next reply/action to convert them), 3) ## 💰 Deal & Revenue Moves (overdue or near-close deals to push), 4) ## 📅 Schedule & Calls (scheduled discovery calls or calendar follow-ups).',
  blocked_work:
    'Analyze bottlenecks: 1) Leads waiting longest without reply, 2) Overdue deals past expected close date, 3) Urgent follow-ups. Provide concrete unblocking steps.',
  weekly_report:
    'Create an executive owner update: overall activity, revenue in pipeline, deals won/in progress, and top 3 focus areas for the week.',
  summarize_unread:
    'Summarize all unread customer conversations: Contact name, industry/service, their exact latest message, and a recommended 1-sentence reply for each.',
  translate_messages:
    'Identify recent non-English customer messages and state which conversations need language translation in the inbox.',
  buying_signals:
    'Pinpoint every customer showing high purchase intent (asking for a call, meeting, pricing, service package, or demo). Quote their exact words and recommend an immediate closing action.',
  inactive_customers:
    'Recommend a focused reactivation segment from available contact and deal history.',
  generate_tags:
    'Suggest actionable contact tags based on actual customer conversations, industries, and requested services.',
  group_contacts:
    'Recommend 2 or 3 targeted broadcast outreach groups based on customer industry categories and deal stages.',
  stalled_deals:
    'Identify open deals that are overdue or stalled. Provide a tailored WhatsApp follow-up angle to revive each one.',
  forecast_revenue:
    'Provide a realistic near-term revenue forecast from open deals, noting high-confidence deals vs at-risk ones.',
  predict_close_rate:
    'Give a qualitative close-rate assessment using available deal stages and customer responsiveness signals.',
  best_segment:
    'Recommend the highest-converting customer segment for a WhatsApp broadcast campaign and explain why.',
  draft_campaign:
    'Draft one high-converting, compliant WhatsApp campaign concept: target audience, hook, and short message draft.',
  review_delivery:
    'Review recent broadcast campaigns and identify delivery rates and practical improvements.',
  create_automation:
    'Recommend one high-ROI auto-reply or routing automation based on repeated customer questions visible in the snapshot.',
  audit_workflow:
    'Identify operational friction points between inbox, calendar, and pipelines and recommend a concrete fix.',
  today_priorities:
    'Rank the three most impactful revenue actions for today based on waiting leads and deal milestones.',
};

function isAction(value: unknown): value is CopilotAction {
  return typeof value === 'string' && ACTIONS.includes(value as CopilotAction);
}

function cleanText(value: unknown, maxLength = 240): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function valueOrZero(value: unknown): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

const INTENT_KEYWORDS = /(call|talk|phone|zoom|meet|price|cost|charges|rate|package|demo|quote|proposal|start|buy|interested|appointment|schedule|service)/i;

/**
 * Build a compact, high-density, real-time snapshot of the workspace.
 * Uses <450 tokens of prompt context to keep API cost ultra-low (~$0.0001/req)
 * while providing 100% real, actionable CRM data.
 */
async function buildWorkspaceSnapshot(
  supabase: Awaited<ReturnType<typeof requireRole>>['supabase'],
  accountId: string
) {
  const [
    conversationsResult,
    dealsResult,
    contactsResult,
    remindersResult,
    broadcastsResult,
  ] = await Promise.all([
    supabase
      .from('conversations')
      .select(`
        id, status, last_message_text, last_message_at, unread_count, labels,
        contacts(id, name, phone, lead_stage, lead_score, industry, requirement, budget, tags)
      `)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(30),
    supabase
      .from('deals')
      .select('id, title, value, currency, status, expected_close_date, updated_at')
      .order('updated_at', { ascending: false })
      .limit(25),
    supabase.from('contacts').select('id', { count: 'exact', head: true }),
    supabase
      .from('follow_up_reminders')
      .select('id, title, kind, due_at, status, contacts(name)')
      .eq('account_id', accountId)
      .order('due_at', { ascending: true })
      .limit(15),
    supabase
      .from('broadcasts')
      .select('name, status, total_recipients, delivered_count, read_count, replied_count, failed_count, updated_at')
      .order('updated_at', { ascending: false })
      .limit(5),
  ]);

  const conversations = (conversationsResult.data ?? []) as Array<Record<string, unknown>>;
  const deals = (dealsResult.data ?? []) as Array<Record<string, unknown>>;
  const reminders = (remindersResult?.data ?? []) as Array<Record<string, unknown>>;
  const broadcasts = (broadcastsResult.data ?? []) as Array<Record<string, unknown>>;

  const openConversations = conversations.filter((r) => r.status === 'open');
  const unreadConversations = conversations.filter((r) => valueOrZero(r.unread_count) > 0);
  const openDeals = deals.filter((r) => ['open', 'active', 'lead', 'in_progress'].includes(String(r.status ?? '').toLowerCase()));
  const totalOpenDealValue = openDeals.reduce((sum, d) => sum + valueOrZero(d.value), 0);

  // High-priority waiting leads
  const waitingLeads = conversations
    .filter((c) => valueOrZero(c.unread_count) > 0 || INTENT_KEYWORDS.test(String(c.last_message_text ?? '')))
    .slice(0, 10)
    .map((c) => {
      const contact = c.contacts as { name?: string; industry?: string; requirement?: string } | null;
      const name = cleanText(contact?.name, 60) || 'Customer';
      const industry = cleanText(contact?.industry, 40);
      const requirement = cleanText(contact?.requirement, 50);
      const category = [industry, requirement].filter(Boolean).join(' | ');
      const unread = valueOrZero(c.unread_count);
      const lastMsg = cleanText(c.last_message_text, 160);
      const isCall = /call|talk|phone|zoom|meet|appointment/i.test(lastMsg);
      const isPrice = /price|cost|charges|rate|quote/i.test(lastMsg);
      const flag = isCall ? '[Explicit Call Request]' : isPrice ? '[Pricing Inquiry]' : unread > 0 ? '[Unread Reply]' : '';
      return `- **${name}**${category ? ` (${category})` : ''}: "${lastMsg}" (Unread: ${unread}) ${flag}`;
    });

  // Active open pipeline deals
  const activeDeals = openDeals.slice(0, 8).map((d) => {
    const title = cleanText(d.title, 60);
    const val = valueOrZero(d.value);
    const curr = cleanText(d.currency, 10) || '₹';
    const closeDate = cleanText(d.expected_close_date, 20);
    const isOverdue = closeDate && new Date(closeDate).getTime() < Date.now();
    return `- "${title}": ${curr}${val.toLocaleString('en-IN')} (Close: ${closeDate || 'Not set'}${isOverdue ? ' ⚠️ OVERDUE' : ''})`;
  });

  // Scheduled discovery calls & calendar tasks
  const scheduledCalls = reminders
    .filter((r) => ['scheduled', 'pending'].includes(String(r.status ?? 'scheduled').toLowerCase()))
    .slice(0, 5)
    .map((r) => {
      const title = cleanText(r.title, 80);
      const contact = (r.contacts as { name?: string } | null)?.name;
      const due = cleanText(r.due_at, 25);
      const kind = cleanText(r.kind, 15);
      return `- [${kind.toUpperCase()}] "${title}" ${contact ? `with ${contact}` : ''} at ${due}`;
    });

  const recentBroadcasts = broadcasts.slice(0, 3).map((b) => {
    const name = cleanText(b.name, 50);
    const sent = valueOrZero(b.total_recipients);
    const replies = valueOrZero(b.replied_count);
    return `- "${name}": Sent to ${sent}, ${replies} replies`;
  });

  // Dense, compact text format that costs minimal tokens and provides high clarity
  const crmContextText = [
    `REAL-TIME CRM METRICS:`,
    `• Total Contacts: ${contactsResult.count ?? conversations.length}`,
    `• Active Conversations: ${openConversations.length} (${unreadConversations.length} unread waiting for reply)`,
    `• Open Pipeline: ${openDeals.length} deals totaling ₹${totalOpenDealValue.toLocaleString('en-IN')}`,
    `• Scheduled Calendar Calls: ${scheduledCalls.length}`,
    ``,
    `WAITING & HIGH-INTENT LEADS:`,
    waitingLeads.length > 0 ? waitingLeads.join('\n') : '- No waiting unread messages.',
    ``,
    `ACTIVE PIPELINE DEALS:`,
    activeDeals.length > 0 ? activeDeals.join('\n') : '- No active deals in pipeline.',
    ``,
    `SCHEDULED DISCOVERY CALLS & TASKS:`,
    scheduledCalls.length > 0 ? scheduledCalls.join('\n') : '- No upcoming calls in calendar.',
    recentBroadcasts.length > 0 ? `\nRECENT BROADCASTS:\n${recentBroadcasts.join('\n')}` : '',
  ].filter(Boolean).join('\n');

  return { crmContextText };
}

/** POST /api/ai/copilot (agent+) — advisory workspace analysis only. */
export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent');
    const limit = checkRateLimit(`ai-copilot:${userId}`, RATE_LIMITS.aiCopilot);
    if (!limit.success) return rateLimitResponse(limit);

    const body = await request.json().catch(() => null);
    const action = body?.action;
    if (!isAction(action)) {
      return NextResponse.json(
        { error: 'Unknown Copilot action.' },
        { status: 400 }
      );
    }

    const config = await loadAiConfig(supabase, accountId, {
      requireActive: false,
    }).catch((error) => {
      console.error('[ai/copilot] loadAiConfig error:', error);
      throw new AiError(
        'Stored API key could not be decrypted. Re-enter it in AI Setup.',
        {
          code: 'key_decrypt_failed',
          status: 400,
        }
      );
    });

    if (!config) {
      return NextResponse.json(
        {
          error: 'Set up an AI provider key in AI Agents before using Copilot.',
          code: 'ai_not_configured',
        },
        { status: 400 }
      );
    }

    if (config.managedAi) {
      const hasCredit = await claimManagedAiCredit(supabase, userId, 'copilot');
      if (!hasCredit) {
        return NextResponse.json({
          error: `Your included AI Copilot allowance of ${MANAGED_AI_LIMITS.copilot} requests has been used. Add your own API key in AI Agents to continue.`,
          code: 'managed_copilot_limit_reached',
        }, { status: 429 });
      }
    }

    const { crmContextText } = await buildWorkspaceSnapshot(supabase, accountId);

    const systemPrompt = [
      'You are the ZOVAIX CRM AI Copilot, an elite real-time operational advisor for a WhatsApp sales, marketing, and revenue team.',
      'Your job is to provide high-impact, actionable, real-world advice strictly based on the live CRM data below. Never hallucinate fake contact names, fake amounts, or pretend you performed actions.',
      'Format your response in clean, modern Markdown with bold headings (##) and bold lead names/tags.',
      'Be concise, sharp, and practical. Keep the entire response under 350 words so it is quick to read and zero fluff.',
      config.systemPrompt?.trim()
        ? `Business Context:\n${config.systemPrompt.trim()}`
        : '',
      `Current Task:\n${ACTION_GUIDANCE[action]}`,
      `Live CRM Data:\n${crmContextText}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    const { text } = await generateReply({
      config,
      systemPrompt,
      messages: [
        {
          role: 'user',
          content: 'Generate the requested CRM operational analysis using the live data.',
        },
      ],
    });

    return NextResponse.json({ result: text });
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
