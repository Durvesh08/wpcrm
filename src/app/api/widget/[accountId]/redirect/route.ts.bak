import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPhoneNumber } from '@/lib/whatsapp/meta-api';
import { decrypt } from '@/lib/whatsapp/encryption';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // unauthenticated read

export async function GET(
  request: Request,
  context: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await context.params;
  const { searchParams } = new URL(request.url);
  const text = searchParams.get('text') || '';

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: config, error } = await supabase
    .from('whatsapp_config')
    .select('phone_number_id, access_token')
    .eq('account_id', accountId)
    .single();

  if (error || !config) {
    return new NextResponse('WhatsApp configuration not found.', { status: 404 });
  }

  try {
    const accessToken = decrypt(config.access_token);
    const phoneInfo = await verifyPhoneNumber({
      phoneNumberId: config.phone_number_id,
      accessToken,
    });

    const phone = phoneInfo.display_phone_number.replace(/\D/g, '');

    const waUrl = new URL(`https://wa.me/${phone}`);
    if (text) {
      waUrl.searchParams.set('text', text);
    }

    return NextResponse.redirect(waUrl.toString());
  } catch (err) {
    console.error('Widget redirect error:', err);
    return new NextResponse('Error generating redirect.', { status: 500 });
  }
}
