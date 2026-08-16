import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'

const GOOGLE_TRANSLATE_ENDPOINT =
  'https://translation.googleapis.com/language/translate/v2'

const LANGUAGE_CODES: Record<string, string> = {
  english: 'en',
  hindi: 'hi',
  marathi: 'mr',
  gujarati: 'gu',
  tamil: 'ta',
  telugu: 'te',
  kannada: 'kn',
  malayalam: 'ml',
  bengali: 'bn',
  punjabi: 'pa',
  urdu: 'ur',
}

type GoogleTranslateResponse = {
  data?: {
    translations?: Array<{
      translatedText?: string
      detectedSourceLanguage?: string
    }>
  }
  error?: { message?: string }
}

export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent')

    const limit = checkRateLimit(`ai-translate:${userId}`, RATE_LIMITS.aiDraft)
    if (!limit.success) return rateLimitResponse(limit)

    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY?.trim()
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'Google Translate API key is not configured. Add GOOGLE_TRANSLATE_API_KEY in Vercel environment variables.',
          code: 'google_translate_key_missing',
        },
        { status: 500 },
      )
    }

    const body = await request.json().catch(() => null)
    const text = typeof body?.text === 'string' ? body.text.trim() : ''
    if (!text) {
      return NextResponse.json({ error: 'Text is required.' }, { status: 400 })
    }

    const configuredTargetLanguage = await loadTranslationTargetLanguage(
      supabase,
      accountId,
    )
    const targetLanguage =
      typeof body?.target_language === 'string' && body.target_language.trim()
        ? body.target_language.trim().slice(0, 80)
        : configuredTargetLanguage
    const target = languageToCode(targetLanguage)
    if (!target) {
      return NextResponse.json(
        {
          error: `Unsupported translation language: ${targetLanguage}`,
          code: 'unsupported_translation_language',
        },
        { status: 400 },
      )
    }

    const response = await fetch(
      `${GOOGLE_TRANSLATE_ENDPOINT}?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          target,
          format: 'text',
        }),
      },
    )
    const result = (await response.json().catch(() => null)) as
      | GoogleTranslateResponse
      | null

    if (!response.ok) {
      console.error('[google translate] failed:', result?.error ?? result)
      return NextResponse.json(
        {
          error:
            result?.error?.message ??
            'Google Translate could not translate this message.',
          code: 'google_translate_failed',
        },
        { status: response.status >= 400 ? response.status : 502 },
      )
    }

    const translation = decodeHtmlEntities(
      result?.data?.translations?.[0]?.translatedText ?? '',
    ).trim()
    if (!translation) {
      return NextResponse.json(
        {
          error: 'Google Translate returned an empty translation.',
          code: 'google_translate_empty',
        },
        { status: 502 },
      )
    }

    return NextResponse.json({
      translation,
      target_language: targetLanguage,
      provider: 'google_translate',
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}

async function loadTranslationTargetLanguage(
  supabase: SupabaseClient,
  accountId: string,
) {
  const { data, error } = await supabase
    .from('ai_configs')
    .select('translation_target_language')
    .eq('account_id', accountId)
    .maybeSingle()

  if (error) {
    const candidate = error as { code?: string; message?: string }
    const missingTranslationColumn =
      candidate.code === '42703' ||
      candidate.code === 'PGRST204' ||
      candidate.message?.includes('translation_target_language')
    if (!missingTranslationColumn) {
      console.error('[google translate] target language load failed:', error)
    }
  }

  return data?.translation_target_language || 'English'
}

function languageToCode(language: string) {
  const normalized = language.trim().toLowerCase()
  return LANGUAGE_CODES[normalized] ?? null
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}
