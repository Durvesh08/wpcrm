import { NextResponse } from 'next/server';

import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

const DEFAULT_LANGUAGE = 'English';

function isMissingTranslationSettings(error: unknown) {
  const candidate = error as { code?: string; message?: string } | null;
  return Boolean(
    candidate &&
      (candidate.code === '42P01' ||
        candidate.code === 'PGRST205' ||
        candidate.message?.includes('translation_settings')),
  );
}

export async function GET() {
  try {
    const { supabase, accountId } = await getCurrentAccount();
    const googleTranslateConfigured = Boolean(
      process.env.GOOGLE_TRANSLATE_API_KEY?.trim(),
    );

    const { data, error } = await supabase
      .from('translation_settings')
      .select('enabled, target_language')
      .eq('account_id', accountId)
      .maybeSingle();

    if (error && !isMissingTranslationSettings(error)) {
      console.error('[translation/config GET] fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to load translation settings' },
        { status: 500 },
      );
    }

    if (error && isMissingTranslationSettings(error)) {
      return NextResponse.json({
        available: false,
        enabled: googleTranslateConfigured,
        target_language: DEFAULT_LANGUAGE,
        google_translate_configured: googleTranslateConfigured,
      });
    }

    return NextResponse.json({
      available: true,
      enabled: data?.enabled ?? googleTranslateConfigured,
      target_language: data?.target_language ?? DEFAULT_LANGUAGE,
      google_translate_configured: googleTranslateConfigured,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('admin');
    const limit = checkRateLimit(
      `translation-config:${userId}`,
      RATE_LIMITS.adminAction,
    );
    if (!limit.success) return rateLimitResponse(limit);

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const enabled = body.enabled === true;
    const targetLanguage =
      typeof body.target_language === 'string' && body.target_language.trim()
        ? body.target_language.trim().slice(0, 80)
        : DEFAULT_LANGUAGE;

    const { error } = await supabase.from('translation_settings').upsert(
      {
        account_id: accountId,
        enabled,
        target_language: targetLanguage,
        created_by: userId,
      },
      { onConflict: 'account_id' },
    );

    if (error) {
      if (isMissingTranslationSettings(error)) {
        return NextResponse.json(
          {
            error:
              'Translation settings migration is pending. Run 038_translation_settings_google.sql in Supabase.',
            code: 'translation_settings_migration_missing',
          },
          { status: 409 },
        );
      }
      console.error('[translation/config POST] save error:', error);
      return NextResponse.json(
        { error: 'Failed to save translation settings' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
