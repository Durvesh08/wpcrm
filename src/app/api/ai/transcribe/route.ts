import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { loadAiConfig } from '@/lib/ai/config'
import { transcribeAudio } from '@/lib/ai/transcribe'
import { AiError } from '@/lib/ai/types'
import { claimManagedAiCredit, MANAGED_AI_LIMITS } from '@/lib/ai/managed-usage'

/**
 * POST /api/ai/transcribe  (agent+)
 *
 * Body: { message_id }
 * Returns: { transcription, summary }
 *
 * Transcribes an audio message using the account's configured AI provider.
 * Saves the transcription to the message record.
 */
export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent')

    const userLimit = checkRateLimit(`ai-transcribe:${userId}`, RATE_LIMITS.aiDraft)
    if (!userLimit.success) return rateLimitResponse(userLimit)

    const body = await request.json().catch(() => null)
    const messageId =
      body && typeof body.message_id === 'string' ? body.message_id : ''
    if (!messageId) {
      return NextResponse.json(
        { error: 'message_id is required' },
        { status: 400 },
      )
    }

    // Fetch the message and verify it's an audio message
    const { data: message, error: msgErr } = await supabase
      .from('messages')
      .select('id, content_type, media_url, transcription_text')
      .eq('id', messageId)
      .maybeSingle()

    if (msgErr || !message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 },
      )
    }

    if (message.content_type !== 'audio') {
      return NextResponse.json(
        { error: 'Message is not an audio message' },
        { status: 400 },
      )
    }

    // Return existing transcription if already done
    if (message.transcription_text) {
      return NextResponse.json({
        transcription: message.transcription_text,
        summary: '',
        cached: true,
      })
    }

    if (!message.media_url) {
      return NextResponse.json(
        { error: 'Audio file URL is not available' },
        { status: 400 },
      )
    }

    const config = await loadAiConfig(supabase, accountId).catch((err) => {
      console.error('[ai/transcribe] loadAiConfig error:', err)
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

    if (config.managedAi) {
      const hasCredit = await claimManagedAiCredit(supabase, userId, 'copilot')
      if (!hasCredit) {
        return NextResponse.json(
          {
            error: `Your included AI allowance of ${MANAGED_AI_LIMITS.copilot} requests has been used. Add your own API key in AI Agents to continue.`,
            code: 'managed_copilot_limit_reached',
          },
          { status: 402 },
        )
      }
    }

    // Build absolute URL for internal media proxy
    const audioUrl = message.media_url.startsWith('/')
      ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${message.media_url}`
      : message.media_url

    const { transcription, summary } = await transcribeAudio(config, audioUrl)

    // Save transcription to the message
    const fullText = summary
      ? `${transcription}\n\n📋 ${summary}`
      : transcription

    await supabase
      .from('messages')
      .update({ transcription_text: fullText })
      .eq('id', messageId)

    return NextResponse.json({ transcription: fullText, summary })
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
