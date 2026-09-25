import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { decrypt } from '@/lib/whatsapp/encryption';

export async function POST(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('agent');

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { amount, description, contact_id, conversation_id, deal_id } = body;

    if (!amount || typeof amount !== 'number') {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    // 1. Fetch stripe config
    const { data: config, error: configError } = await supabase
      .from('payment_configs')
      .select('*')
      .eq('account_id', accountId)
      .eq('provider', 'stripe')
      .eq('is_active', true)
      .maybeSingle();

    if (configError || !config) {
      return NextResponse.json({ error: 'Stripe configuration not found or inactive' }, { status: 400 });
    }

    let apiKeySecret = '';
    try {
      apiKeySecret = decrypt(config.api_key_secret);
    } catch {
      return NextResponse.json({ error: 'Invalid Stripe API key in configuration' }, { status: 500 });
    }

    // 2. Create Stripe Checkout Session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const params = new URLSearchParams({
      'line_items[0][price_data][currency]': 'inr',
      'line_items[0][price_data][product_data][name]': description || 'Payment Link',
      'line_items[0][price_data][unit_amount]': String(Math.round(amount * 100)),
      'line_items[0][quantity]': '1',
      mode: 'payment',
      success_url: `${appUrl}?payment_status=success`,
      cancel_url: `${appUrl}?payment_status=cancelled`,
    });

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKeySecret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[payments/create-link] Stripe API Error:', errorData);
      return NextResponse.json({ error: 'Failed to create payment link with Stripe' }, { status: 500 });
    }

    const session = await response.json();

    // 3. Store in payment_links
    const { data: link, error: insertError } = await supabase
      .from('payment_links')
      .insert({
        account_id: accountId,
        contact_id: contact_id || null,
        conversation_id: conversation_id || null,
        deal_id: deal_id || null,
        provider: 'stripe',
        provider_link_id: session.id,
        amount: amount,
        currency: 'INR',
        description: description || 'Payment Link',
        status: 'created',
        payment_url: session.url,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[payments/create-link] DB Insert Error:', insertError);
      return NextResponse.json({ error: 'Failed to save payment link to database' }, { status: 500 });
    }

    return NextResponse.json({ success: true, link });
  } catch (err) {
    return toErrorResponse(err);
  }
}
