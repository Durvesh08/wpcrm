import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { encrypt, decrypt } from '@/lib/whatsapp/encryption';

export async function GET() {
  try {
    const { supabase, accountId } = await requireRole('admin');

    const { data, error } = await supabase
      .from('payment_configs')
      .select('*')
      .eq('account_id', accountId)
      .eq('provider', 'stripe')
      .maybeSingle();

    if (error) {
      console.error('[payments/config GET] error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch payment configuration' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ config: null });
    }

    let apiKeyId = '';
    let apiKeySecret = '';
    let webhookSecret = null;

    try {
      apiKeyId = decrypt(data.api_key_id);
      apiKeySecret = decrypt(data.api_key_secret);
      if (data.webhook_secret) {
        webhookSecret = decrypt(data.webhook_secret);
      }
    } catch {
      return NextResponse.json(
        { error: 'Stored keys could not be decrypted. Please re-enter them.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      config: {
        id: data.id,
        provider: data.provider,
        api_key_id: apiKeyId,
        api_key_secret: apiKeySecret,
        webhook_secret: webhookSecret,
        is_active: data.is_active,
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('admin');

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const provider = body.provider || 'stripe';
    if (provider !== 'stripe') {
      return NextResponse.json({ error: 'Only stripe is supported currently' }, { status: 400 });
    }

    // if not provided, check if we're updating existing
    let { data: existing, error: existingError } = await supabase
      .from('payment_configs')
      .select('id, api_key_id, api_key_secret, webhook_secret')
      .eq('account_id', accountId)
      .eq('provider', provider)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: 'Could not load existing configuration' }, { status: 500 });
    }

    const rawKeyId = typeof body.api_key_id === 'string' ? body.api_key_id.trim() : '';
    const rawKeySecret = typeof body.api_key_secret === 'string' ? body.api_key_secret.trim() : '';
    const rawWebhookSecret = typeof body.webhook_secret === 'string' ? body.webhook_secret.trim() : '';

    let finalKeyId = existing?.api_key_id || '';
    let finalKeySecret = existing?.api_key_secret || '';
    let finalWebhookSecret = existing?.webhook_secret || null;

    if (rawKeyId) {
      finalKeyId = encrypt(rawKeyId);
    }
    if (rawKeySecret) {
      finalKeySecret = encrypt(rawKeySecret);
    }
    if (rawWebhookSecret) {
      finalWebhookSecret = encrypt(rawWebhookSecret);
    }

    if (!finalKeyId || !finalKeySecret) {
      return NextResponse.json({ error: 'api_key_id and api_key_secret are required' }, { status: 400 });
    }

    const isActive = body.is_active !== undefined ? body.is_active === true : true;

    if (existing) {
      const { error: upErr } = await supabase
        .from('payment_configs')
        .update({
          api_key_id: finalKeyId,
          api_key_secret: finalKeySecret,
          webhook_secret: finalWebhookSecret,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (upErr) {
        console.error('[payments/config POST] update error:', upErr);
        return NextResponse.json({ error: 'Failed to update payment configuration' }, { status: 500 });
      }
    } else {
      const { error: insErr } = await supabase
        .from('payment_configs')
        .insert({
          account_id: accountId,
          provider,
          api_key_id: finalKeyId,
          api_key_secret: finalKeySecret,
          webhook_secret: finalWebhookSecret,
          is_active: isActive,
        });

      if (insErr) {
        console.error('[payments/config POST] insert error:', insErr);
        return NextResponse.json({ error: 'Failed to save payment configuration' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
