import { NextResponse } from 'next/server';

const MAX_FIELD_LENGTH = 2000;

function clean(value: unknown) {
  if (typeof value !== 'string') return undefined;
  return value.slice(0, MAX_FIELD_LENGTH);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    message?: unknown;
    digest?: unknown;
    stack?: unknown;
    path?: unknown;
    userAgent?: unknown;
  } | null;

  console.error('[client-error]', {
    message: clean(body?.message),
    digest: clean(body?.digest),
    stack: clean(body?.stack),
    path: clean(body?.path),
    userAgent: clean(body?.userAgent),
  });

  return NextResponse.json({ ok: true });
}
