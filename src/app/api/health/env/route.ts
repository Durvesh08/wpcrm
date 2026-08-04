import { NextResponse } from 'next/server';

type EnvCheck = {
  name: string;
  present: boolean;
  valid: boolean;
  required: boolean;
  hint?: string;
};

const ENV_VALUES = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_APP_LOCALE: process.env.NEXT_PUBLIC_APP_LOCALE,
  META_APP_SECRET: process.env.META_APP_SECRET,
  FIREBASE_SERVICE_ACCOUNT_JSON: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
} as const;

type EnvName = keyof typeof ENV_VALUES;

const REQUIRED: EnvName[] = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ENCRYPTION_KEY',
  'NEXT_PUBLIC_SITE_URL',
];

const OPTIONAL: EnvName[] = [
  'NEXT_PUBLIC_APP_LOCALE',
  'META_APP_SECRET',
  'FIREBASE_SERVICE_ACCOUNT_JSON',
];

function check(name: EnvName): EnvCheck {
  const value = ENV_VALUES[name]?.trim() ?? '';
  const present = value.length > 0;
  let valid = present;
  let hint: string | undefined;
  const required = REQUIRED.includes(name);

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
    valid = !present || /^[a-z]{2}(-[A-Z]{2})?$/.test(value);
    hint = 'Example: en';
  } else if (name === 'META_APP_SECRET') {
    valid = !present || value.length >= 16;
    hint = 'Needed for strict Meta webhook signature verification';
  } else if (name === 'FIREBASE_SERVICE_ACCOUNT_JSON') {
    valid = !present || value.startsWith('{');
    hint = 'Needed only for Android push notifications';
  }

  return { name, present, valid, required, hint };
}

export async function GET() {
  const checks = [...REQUIRED, ...OPTIONAL].map(check);
  return NextResponse.json({
    ok: checks.every((item) => (!item.required || item.present) && item.valid),
    checks,
  });
}
