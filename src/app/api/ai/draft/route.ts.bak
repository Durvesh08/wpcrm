import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { loadAiConfig } from '@/lib/ai/config'
import { buildConversationContext } from '@/lib/ai/context'
import { retrieveKnowledge } from '@/lib/ai/knowledge'
import { generateReply } from '@/lib/ai/generate'
import { buildSystemPrompt } from '@/lib/ai/defaults'
import { latestUserMessage } from '@/lib/ai/query'
import { AiError } from '@/lib/ai/types'
import { claimManagedAiCredit, MANAGED_AI_LIMITS } from '@/lib/ai/managed-usage'

/**
 * POST /api/ai/draft  (agent+)
 *
 * Body: { conversation_id }
 * Returns: { draft } — a suggested reply for the agent to edit + send.
 *
 * Uses the account's configured provider/key (BYO). Read-only: it never
 * sends or stores anything, just hands text back to the composer.
 */
export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent')

    const userLimit = checkRateLimit(`ai-draft:${userId}`, RATE_LIMITS.aiDraft)
    if (!userLimit.success) return rateLimitResponse(userLimit)
    // Also cap the whole team's draws on the shared BYO provider key.
    const accountLimit = checkRateLimit(
      `ai-draft-acct:${accountId}`,
      RATE_LIMITS.aiDraftAccount,
    )
    if (!accountLimit.success) return rateLimitResponse(accountLimit)

    const body = await request.json().catch(() => null)
    const conversationId =
      body && typeof body.conversation_id === 'string' ? body.conversation_id : ''
    const mode = body?.mode === 'suggestions' ? 'suggestions' : 'draft'
    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversation_id is required' },
        { status: 400 },
      )
    }

    // RLS scopes the SSR client to the caller's account, so a missing
    // row means "not yours / not found" either way.
    const { data: conversation, error: convErr } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .maybeSingle()
    if (convErr) {
      console.error('[ai/draft] conversation lookup error:', convErr)
      return NextResponse.json({ error: 'Failed to load conversation' }, { status: 500 })
    }
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const config = await loadAiConfig(supabase, accountId).catch((err) => {
      // Decrypt failure — surface distinctly from "not configured".
      console.error('[ai/draft] loadAiConfig error:', err)
      throw new AiError('Stored API key could not be decrypted.', {
        code: 'key_decrypt_failed',
        status: 400,
      })
    })
    if (!config) {
      return NextResponse.json(
        {
          error: 'AI assistant is not set up. Enable it in Settings → AI Assistant.',
          code: 'ai_not_configured',
        },
        { status: 400 },
      )
    }

    const messages = await buildConversationContext(supabase, conversationId)
    // Nothing to draft from — a brand-new thread with no customer text
    // would otherwise produce a nonsensical reply-to-nothing.
    if (messages.length === 0) {
      return NextResponse.json(
        {
          error: 'No messages to draft from yet.',
          code: 'no_messages',
        },
        { status: 400 },
      )
    }

    // Ground the draft in the account's knowledge base (best-effort —
    // returns [] when there's no KB or retrieval fails).
    const knowledge = await retrieveKnowledge(
      supabase,
      accountId,
      config,
      latestUserMessage(messages),
    )

    const systemPrompt = mode === 'suggestions'
      ? `You are a sales reply assistant. Based on the conversation history, generate exactly 3 short reply options the sales agent can send. Each reply should be 1-3 sentences max.

Return ONLY a JSON array of 3 strings, nothing else. Example:
["Thanks for your interest! I'd love to share our pricing. When's a good time for a quick call?", "Hi! Our packages start at ₹15,000/month. Want me to send you the detailed brochure?", "Got it, let me check availability and get back to you within the hour."]

The 3 replies should have these tones:
1. Professional & consultative
2. Friendly & warm  
3. Direct & action-oriented`
      : buildSystemPrompt({
          userPrompt: config.systemPrompt,
          mode: 'draft',
          knowledge,
        })

    if (config.managedAi) {
      const hasCredit = await claimManagedAiCredit(supabase, userId, 'copilot')
      if (!hasCredit) {
        return NextResponse.json(
          {
            error: `Your included AI allowance of ${MANAGED_AI_LIMITS.copilot} manual requests has been used. Add your own API key in AI Agents to continue.`,
            code: 'managed_copilot_limit_reached',
          },
          { status: 402 },
        )
      }
    }

    const { text } = await generateReply({ config, systemPrompt, messages })
    
    if (mode === 'suggestions') {
      let parsedArray: string[] = []
      try {
        parsedArray = JSON.parse(text)
        if (!Array.isArray(parsedArray)) throw new Error('Not an array')
      } catch (err) {
        parsedArray = text
          .split('\n')
          .map(line => line.trim().replace(/^[\d\.\-\*\[\]"']+|["'\]]+$/g, '').trim())
          .filter(Boolean)
      }
      return NextResponse.json({ suggestions: parsedArray.slice(0, 3) })
    }

    return NextResponse.json({ draft: text })
  } catch (err) {
    if (err instanceof AiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      )
    }
    return toErrorResponse(err)
  }
}
