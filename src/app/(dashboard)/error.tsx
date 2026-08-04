'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch('/api/diagnostics/client-error', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        stack: error.stack,
        path: window.location.pathname,
        userAgent: window.navigator.userAgent,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [error]);

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="border-border bg-card max-w-lg rounded-2xl border p-6 text-center shadow-sm">
        <h1 className="text-foreground text-lg font-semibold">
          Dashboard could not load
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          The browser hit an app error. I logged the exact crash in Vercel so it
          can be fixed from the runtime logs.
        </p>
        {error.message ? (
          <pre className="border-border bg-muted text-muted-foreground mt-4 max-h-32 overflow-auto rounded-xl border p-3 text-left text-xs whitespace-pre-wrap">
            {error.message}
          </pre>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="bg-primary text-primary-foreground mt-5 rounded-xl px-4 py-2 text-sm font-medium"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
