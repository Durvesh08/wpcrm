import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getCurrentAccount,
  requireRole,
  toErrorResponse,
} from '@/lib/auth/account';
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from '@/lib/rate-limit';
import { encrypt, decrypt } from '@/lib/whatsapp/encryption';
import { validateAiCredentials } from '@/lib/ai/validate';
import { embedTexts } from '@/lib/ai/embeddings';
import { MANAGED_AI_LIMITS } from '@/lib/ai/managed-usage';
import { AiError, type AiProvider } from '@/lib/ai/types';
import { isAiProvider } from '@/lib/ai/defaults';

function bad(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

const CONFIG_COLUMNS =
  'provider, model, system_prompt, is_active, auto_reply_enabled, auto_reply_max_per_conversation, translation_enabled, translation_target_language, api_key, embeddings_api_key, platform_ai_enabled';
const LEGACY_CONFIG_COLUMNS =
  'provider, model, system_prompt, is_active, auto_reply_enabled, auto_reply_max_per_conversation, api_key, embeddings_api_key';

function hasMissingOptionalAiColumns(error: unknown) {
  const candidate = error as { code?: string; message?: string } | null;
  return Boolean(candidate && (candidate.code === '42703' || candidate.code === 'PGRST204') && (candidate.message?.includes('translation_') || candidate.message?.includes('platform_ai_enabled')));
}

/**
 * GET /api/ai/config
 *
 * Any member may read the config so the inbox/settings can reflect
 * whether AI is set up. The encrypted key is NEVER returned — only a
 * `has_key` flag; the settings form shows a masked placeholder.
 */
export async function GET() {
  try {
    const { supabase, accountId, userId } = await getCurrentAccount();

    let { data, error } = await supabase
      .from('ai_configs')
      // `api_key` is selected only to derive `has_key` — it is stripped
      // out below and never returned to the client.
      .select(CONFIG_COLUMNS)
      .eq('account_id', accountId)
      .maybeSingle();

    const optionalColumnsAvailable = !hasMissingOptionalAiColumns(error);
    const translationAvailable = optionalColumnsAvailable;
    const googleTranslateConfigured = Boolean(
      process.env.GOOGLE_TRANSLATE_API_KEY?.trim()
    );
    if (!optionalColumnsAvailable) {
      ({ data, error } = await supabase
        .from('ai_configs')
        .select(LEGACY_CONFIG_COLUMNS)
        .eq('account_id', accountId)
        .maybeSingle());
    }

    if (error) {
      console.error('[ai/config GET] fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to load AI configuration' },
        { status: 500 }
      );
    }

    const managedCredits = await loadManagedAiCredits(supabase, userId);

    if (!data) {
      return NextResponse.json({
        configured: false,
        translation_available: translationAvailable,
        translation_enabled: googleTranslateConfigured,
        translation_target_language: 'English',
        google_translate_configured: googleTranslateConfigured,
        managed_ai_credits: managedCredits,
      });
    }
    // The keys are selected only to derive the has_* flags; neither is
    // returned to the client.
    const {
      api_key,
      embeddings_api_key,
      translation_enabled,
      translation_target_language,
      platform_ai_enabled,
      ...safe
    } = data;
    return NextResponse.json({
      configured: true,
      has_key: !!api_key,
      has_embeddings_key: !!embeddings_api_key,
      translation_available: translationAvailable,
      google_translate_configured: googleTranslateConfigured,
      platform_ai_enabled: platform_ai_enabled === true,
      translation_enabled: translation_enabled ?? googleTranslateConfigured,
      translation_target_language: translation_target_language ?? 'English',
      managed_ai_credits: managedCredits,
      ...safe,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

async function loadManagedAiCredits(supabase: SupabaseClient, userId: string) {
  const limits = {
    auto_reply: MANAGED_AI_LIMITS.autoReply,
    copilot: MANAGED_AI_LIMITS.copilot,
    translation: MANAGED_AI_LIMITS.translation,
  };

  const unlimited = false;

  const { data, error } = await supabase
    .from('ai_usage_credits')
    .select(
      'managed_auto_reply_count, managed_copilot_count, managed_translation_count'
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    const candidate = error as { code?: string; message?: string };
    const missingCreditsMigration =
      candidate.code === '42P01' ||
      candidate.code === 'PGRST205' ||
      candidate.code === '42703' ||
      candidate.code === 'PGRST204' ||
      candidate.message?.includes('ai_usage_credits');
    if (!missingCreditsMigration) {
      console.error('[ai/config GET] credit usage fetch error:', error);
    }
    return {
      available: false,
      unlimited,
      limits,
      used: { auto_reply: 0, copilot: 0, translation: 0 },
      remaining: {
        auto_reply: limits.auto_reply,
        copilot: limits.copilot,
        translation: limits.translation,
      },
    };
  }

  const autoReplyUsed = Math.max(0, data?.managed_auto_reply_count ?? 0);
  const copilotUsed = Math.max(0, data?.managed_copilot_count ?? 0);
  const translationUsed = Math.max(0, data?.managed_translation_count ?? 0);
  return {
    available: true,
    unlimited,
    limits,
    used: {
      auto_reply: autoReplyUsed,
      copilot: copilotUsed,
      translation: translationUsed,
    },
    remaining: {
      auto_reply: unlimited
        ? null
        : Math.max(0, limits.auto_reply - autoReplyUsed),
      copilot: unlimited ? null : Math.max(0, limits.copilot - copilotUsed),
      translation: unlimited
        ? null
        : Math.max(0, limits.translation - translationUsed),
    },
  };
}

/**
 * POST /api/ai/config  (admin+)
 *
 * Upsert the account's AI config. Validates the key with the provider
 * before persisting (mirrors the WhatsApp config verifying with Meta
 * first), then stores the key AES-256-GCM-encrypted. When `api_key` is
 * omitted the existing stored key is reused (the form sends it only
 * when the user re-enters it).
 */
export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('admin');

    const limit = checkRateLimit(
      `ai-config:${userId}`,
      RATE_LIMITS.adminAction
    );
    if (!limit.success) return rateLimitResponse(limit);

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return bad('Invalid request body');

    const usePlatformAi = body.platform_ai_enabled === true;
    const provider = (usePlatformAi ? 'gemini' : body.provider) as AiProvider;
    if (!isAiProvider(provider)) {
      return bad('provider must be "openai", "anthropic", or "gemini"');
    }
    const model = usePlatformAi ? 'gemini-2.5-flash' : typeof body.model === 'string' ? body.model.trim() : '';
    if (!model) return bad('model is required');

    const systemPrompt =
      typeof body.system_prompt === 'string' && body.system_prompt.trim()
        ? body.system_prompt.trim()
        : null;
    const isActive = body.is_active === true;
    const autoReplyEnabled = body.auto_reply_enabled === true;
    const translationEnabled = body.translation_enabled === true;
    const translationTargetLanguage =
      typeof body.translation_target_language === 'string' &&
      body.translation_target_language.trim()
        ? body.translation_target_language.trim().slice(0, 80)
        : 'English';

    let maxPer = Number(body.auto_reply_max_per_conversation);
    if (!Number.isFinite(maxPer)) maxPer = 3;
    maxPer = Math.min(20, Math.max(1, Math.floor(maxPer)));

    const rawKey = typeof body.api_key === 'string' ? body.api_key.trim() : '';

    // Embeddings key (optional, for semantic KB search): a non-empty
    // string sets/replaces it; an explicit null clears it; absent leaves
    // it unchanged. The form only sends it when the admin edits it.
    const rawEmbeddingsKey =
      typeof body.embeddings_api_key === 'string'
        ? body.embeddings_api_key.trim()
        : '';
    const clearEmbeddingsKey = body.embeddings_api_key === null;

    // Reuse the stored key when the form didn't send a fresh one.
    let { data: existing, error: existingError } = await supabase
      .from('ai_configs')
      .select('id, provider, model, api_key, platform_ai_enabled')
      .eq('account_id', accountId)
      .maybeSingle();
    const platformColumnAvailable = !hasMissingOptionalAiColumns(existingError);
    if (!platformColumnAvailable) {
      ({ data: existing, error: existingError } = await supabase
        .from('ai_configs')
        .select('id, provider, model, api_key')
        .eq('account_id', accountId)
        .maybeSingle());
    }
    if (existingError) return bad('Could not load AI configuration.');
    if (usePlatformAi && !platformColumnAvailable) {
      return bad('Included ZOVAIX AI needs Supabase migration 036_managed_ai_credits.sql before it can be enabled.');
    }

    let apiKeyPlain: string;
    if (usePlatformAi) {
      apiKeyPlain = process.env.ZOVAIX_GEMINI_API_KEY?.trim() ?? '';
      if (!apiKeyPlain) return bad('ZOVAIX_GEMINI_API_KEY is not configured on the server.');
    } else if (rawKey) {
      apiKeyPlain = rawKey;
    } else if (existing?.api_key) {
      try {
        apiKeyPlain = decrypt(existing.api_key);
      } catch {
        return bad(
          'Stored API key could not be decrypted — re-enter your key.'
        );
      }
    } else {
      return bad('api_key is required');
    }

    // Only spend a provider round-trip when the credentials that affect
    // reachability actually changed. A save that just flips a toggle or
    // edits the system prompt on an existing, already-validated config
    // skips the call — no wasted token/latency on the account's key.
    const credentialsChanged =
      !existing ||
      rawKey !== '' ||
      provider !== existing.provider ||
      model !== existing.model ||
      usePlatformAi !== (existing.platform_ai_enabled === true);

    if (credentialsChanged) {
      try {
        await validateAiCredentials({
          provider,
          model,
          apiKey: apiKeyPlain,
          systemPrompt,
          isActive,
          autoReplyEnabled,
          autoReplyMaxPerConversation: maxPer,
          translationEnabled,
          translationTargetLanguage,
          embeddingsApiKey: null,
        });
      } catch (err) {
        if (err instanceof AiError) {
          return NextResponse.json(
            { error: err.message, code: err.code },
            { status: 400 }
          );
        }
        console.error('[ai/config POST] validation error:', err);
        return bad('Could not validate the API key with the provider.');
      }
    }

    // Validate a new embeddings key before storing (a cheap 1-input
    // embed), same "verify before save" discipline as the chat key.
    if (rawEmbeddingsKey) {
      try {
        await embedTexts(rawEmbeddingsKey, ['ping']);
      } catch (err) {
        if (err instanceof AiError) {
          return NextResponse.json(
            { error: `Embeddings key: ${err.message}`, code: err.code },
            { status: 400 }
          );
        }
        console.error('[ai/config POST] embeddings validation error:', err);
        return bad('Could not validate the embeddings key.');
      }
    }

    const encryptedKey = usePlatformAi ? encrypt('zovaix-managed-key') : rawKey ? encrypt(rawKey) : null;
    const shared: Record<string, unknown> = {
      provider,
      model,
      system_prompt: systemPrompt,
      is_active: isActive,
      auto_reply_enabled: autoReplyEnabled,
      auto_reply_max_per_conversation: maxPer,
      translation_enabled: translationEnabled,
      translation_target_language: translationTargetLanguage,
      platform_ai_enabled: usePlatformAi,
    };
    if (rawEmbeddingsKey) {
      shared.embeddings_api_key = encrypt(rawEmbeddingsKey);
    } else if (clearEmbeddingsKey) {
      shared.embeddings_api_key = null;
    }
    const {
      translation_enabled: _translationEnabled,
      translation_target_language: _translationTargetLanguage,
      platform_ai_enabled: _platformAiEnabled,
      ...legacyShared
    } = shared;

    let translationAvailable = true;

    if (existing) {
      const update = encryptedKey
        ? { ...shared, api_key: encryptedKey }
        : shared;
      let { error: upErr } = await supabase
        .from('ai_configs')
        .update(update)
        .eq('account_id', accountId);
      if (hasMissingOptionalAiColumns(upErr)) {
        translationAvailable = false;
        const legacyUpdate = encryptedKey
          ? { ...legacyShared, api_key: encryptedKey }
          : legacyShared;
        ({ error: upErr } = await supabase
          .from('ai_configs')
          .update(legacyUpdate)
          .eq('account_id', accountId));
      }
      if (upErr) {
        console.error('[ai/config POST] update error:', upErr);
        return NextResponse.json(
          { error: 'Failed to save AI configuration' },
          { status: 500 }
        );
      }
    } else {
      const insert = {
        account_id: accountId,
        created_by: userId,
        api_key: encryptedKey, // guaranteed non-null: rawKey required when no existing row
        ...shared,
      };
      let { error: insErr } = await supabase.from('ai_configs').insert(insert);
      if (hasMissingOptionalAiColumns(insErr)) {
        translationAvailable = false;
        ({ error: insErr } = await supabase.from('ai_configs').insert({
          account_id: accountId,
          created_by: userId,
          api_key: encryptedKey,
          ...legacyShared,
        }));
      }
      if (insErr) {
        console.error('[ai/config POST] insert error:', insErr);
        return NextResponse.json(
          { error: 'Failed to save AI configuration' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      translation_available: translationAvailable,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * DELETE /api/ai/config  (admin+)
 *
 * Removes the account's AI config (turns everything off and forgets the
 * key). Also used to recover from a corrupted encrypted key.
 */
export async function DELETE() {
  try {
    const { supabase, accountId } = await requireRole('admin');
    const { error } = await supabase
      .from('ai_configs')
      .delete()
      .eq('account_id', accountId);
    if (error) {
      console.error('[ai/config DELETE] error:', error);
      return NextResponse.json(
        { error: 'Failed to delete AI configuration' },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
