'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ModeToggle } from '@/components/layout/mode-toggle';
import { ZovaixMotionLogo } from '@/components/ui/zovaix-motion-logo';
import { CheckCircle, ArrowLeft, Mail, Loader2, ArrowRight } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground flex items-center justify-center overflow-hidden px-4 py-8">
      {/* Ambient background glows */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[340px] rounded-full bg-gradient-to-b from-[#d7fc00]/12 via-[#00f8e7]/8 to-transparent blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div className="absolute top-5 right-5 z-20">
        <ModeToggle className="zovaix-glass-panel zovaix-premium-hover h-9 w-9 rounded-full border border-border/60 shadow-sm" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-border/60 bg-card/70 backdrop-blur-2xl p-7 sm:p-9 shadow-2xl shadow-black/20">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3 flex items-center justify-center">
            <div className="w-14 h-auto">
              <ZovaixMotionLogo mode="once" className="w-full h-auto drop-shadow-md" />
            </div>
          </div>

          {success ? (
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-full bg-primary/10 p-3 text-primary">
                <CheckCircle className="size-7" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-foreground">
                Check your email
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We&apos;ve sent a password reset link to{' '}
                <span className="font-semibold text-foreground">{email}</span>. Please check your inbox.
              </p>
              <Link href="/login" className="w-full pt-3">
                <Button
                  variant="outline"
                  className="w-full h-11 rounded-xl border-border/60 bg-muted/40 hover:bg-muted text-foreground text-xs font-bold"
                >
                  Back to sign in
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-black tracking-tight text-foreground">
                Reset your password
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Enter your account email to receive a secure recovery link.
              </p>
            </>
          )}
        </div>

        {!success && (
          <form onSubmit={handleReset} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-medium text-red-400">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground">
                Email
              </Label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 pl-10 rounded-xl border-border/60 bg-muted/40 text-foreground placeholder:text-muted-foreground/60 text-sm focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 h-11 w-full rounded-xl bg-gradient-to-r from-[#d7fc00] to-[#b3f400] text-[#070b10] font-black text-sm tracking-wide shadow-[0_4px_20px_rgba(215,252,0,0.25)] hover:shadow-[0_4px_28px_rgba(215,252,0,0.4)] hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin text-black" />
                  Sending recovery link...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  Send reset link
                  <ArrowRight className="size-4 text-black" />
                </span>
              )}
            </Button>

            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mt-3 transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
