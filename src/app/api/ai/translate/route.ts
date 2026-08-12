import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { loadAiConfig } from '@/lib/ai/config'
import { generateReply } from '@/lib/ai/generate'
import { AiError } from '@/lib/ai/types'
import { claimManagedAiCredit, MANAGED_AI_LIMITS } from '@/lib/ai/managed-usage'

export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent')

    const limit = checkRateLimit(`ai-translate:${userId}`, RATE_LIMITS.aiDraft)
    if (!limit.success) return rateLimitResponse(limit)

    const body = await request.json().catch(() => null)
    const text = typeof body?.text === 'string' ? body.text.trim() : ''
    if (!text) {
      return NextResponse.json({ error: 'Text is required.' }, { status: 400 })
    }

    const config = await loadAiConfig(supabase, accountId, { requireActive: false })
    if (!config) {
      return NextResponse.json(
        { error: 'AI provider is not configured.' },
        { status: 400 },
      )
    }
    const targetLanguage =
      typeof body?.target_language === 'string' && body.target_language.trim()
        ? body.target_language.trim().slice(0, 80)
        : config.translationTargetLanguage

    if (config.managedAi) {
      const hasCredit = await claimManagedAiCredit(supabase, userId, 'translation')
      if (!hasCredit) {
        return NextResponse.json(
          {
            error: `Your included translation allowance of ${MANAGED_AI_LIMITS.translation} messages has been used. Add your own API key in AI Agents to continue.`,
            code: 'managed_translation_limit_reached',
          },
          { status: 402 },
        )
      }
    }

    const result = await generateReply({
      config,
      systemPrompt:
        `Translate customer WhatsApp messages into ${targetLanguage}. ` +
        'Return only the translated message. Preserve URLs, phone numbers, prices, names, emojis, and line breaks. ' +
        'Do not answer the customer and do not add explanations.',
      messages: [{ role: 'user', content: text }],
    })

    return NextResponse.json({
      translation: result.text,
      target_language: targetLanguage,
    })
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
