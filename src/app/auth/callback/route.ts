import { NextResponse, type NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/dashboard';
  }
  return value;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const code = url.searchParams.get('code');
  const next = safeNextPath(url.searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      url.pathname = next;
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  url.pathname = '/login';
  url.searchParams.set('error', 'auth_callback_failed');
  return NextResponse.redirect(url);
}
