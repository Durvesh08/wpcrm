import { NextResponse } from 'next/server';

type EnvCheck = {
  name: string;
  present: boolean;
  valid: boolean;
  hint?: string;
};

const REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ENCRYPTION_KEY',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_APP_LOCALE',
] as const;

function check(name: (typeof REQUIRED)[number]): EnvCheck {
  const value = process.env[name]?.trim() ?? '';
  const present = value.length > 0;
  let valid = present;
  let hint: string | undefined;

  if (name === 'NEXT_PUBLIC_SUPABASE_URL') {
    valid = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(value);
    hint = 'Must look like https://project-ref.supabase.co';
  } else if (name === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
    valid = value.startsWith('eyJ') || value.startsWith('sb_publishable_');
    hint = 'Use the Supabase anon/publishable client key';
  } else if (name === 'SUPABASE_SERVICE_ROLE_KEY') {
    valid = value.startsWith('eyJ');
    hint = 'Use the Supabase service_role JWT key';
  } else if (name === 'ENCRYPTION_KEY') {
    valid = /^[0-9a-f]{64}$/i.test(value);
    hint = 'Must be exactly 64 hex characters';
  } else if (name === 'NEXT_PUBLIC_SITE_URL') {
    valid = /^https?:\/\/.+/i.test(value);
    hint = 'Must be the public CRM URL, including https://';
  } else if (name === 'NEXT_PUBLIC_APP_LOCALE') {
    valid = /^[a-z]{2}(-[A-Z]{2})?$/.test(value);
    hint = 'Example: en';
  }

  return { name, present, valid, hint };
}

export async function GET() {
  const checks = REQUIRED.map(check);
  return NextResponse.json({
    ok: checks.every((item) => item.present && item.valid),
    checks,
  });
}
