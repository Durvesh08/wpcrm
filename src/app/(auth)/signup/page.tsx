'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ModeToggle } from '@/components/layout/mode-toggle';
import { ZovaixMotionLogo } from '@/components/ui/zovaix-motion-logo';
import {
  CheckCircle,
  UsersRound,
  Mail,
  Lock,
  User,
  ArrowRight,
  Loader2,
} from 'lucide-react';

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupPageInner />
    </Suspense>
  );
}

function SignupPageInner() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [motionComplete, setMotionComplete] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // First motion animation runs (~1.4s), then the signup card smoothly reveals
    const timer = setTimeout(() => {
      setMotionComplete(true);
    }, 1400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        if (inviteToken) {
          router.push(`/join/${encodeURIComponent(inviteToken)}`);
        } else {
          router.push('/dashboard');
        }
      }
    }
    checkAuth();
  }, [router, supabase, inviteToken]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const emailRedirectTo = inviteToken
      ? `${window.location.origin}/auth/callback?next=/join/${encodeURIComponent(inviteToken)}`
      : `${window.location.origin}/auth/callback?next=/dashboard`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="relative min-h-screen bg-background text-foreground flex items-center justify-center px-4 overflow-hidden">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[340px] rounded-full bg-gradient-to-b from-[#d7fc00]/12 via-[#00f8e7]/8 to-transparent blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div className="absolute top-5 right-5 z-20">
          <ModeToggle className="zovaix-glass-panel zovaix-premium-hover h-9 w-9 rounded-full border border-border/60 shadow-sm" />
        </div>
        <div className="relative z-10 w-full max-w-md rounded-3xl border border-border/60 bg-card/70 backdrop-blur-2xl p-8 sm:p-10 shadow-2xl shadow-black/20 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-auto">
              <ZovaixMotionLogo mode="static" className="w-full h-auto drop-shadow-md" />
            </div>
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <CheckCircle className="size-8" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-2xl font-black tracking-tight text-foreground">
                Check your email
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We&apos;ve sent a confirmation link to{' '}
                <span className="font-semibold text-foreground">{email}</span>. Click the link to activate your account.
              </p>
            </div>
            <Link
              href={
                inviteToken
                  ? `/login?invite=${encodeURIComponent(inviteToken)}`
                  : '/login'
              }
              className="w-full pt-2"
            >
              <Button
                variant="outline"
                className="w-full h-11 rounded-xl border-border/60 bg-muted/40 hover:bg-muted text-foreground text-xs font-bold"
              >
                Back to sign in
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground flex items-center justify-center overflow-hidden px-4 py-8">
      {/* Ambient background glows */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[680px] h-[380px] rounded-full bg-gradient-to-b from-[#d7fc00]/12 via-[#00f8e7]/8 to-transparent blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-24 -left-20 w-[420px] h-[340px] rounded-full bg-gradient-to-tr from-[#00f8e7]/10 to-transparent blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="absolute top-5 right-5 z-20">
        <ModeToggle className="zovaix-glass-panel zovaix-premium-hover h-9 w-9 rounded-full border border-border/60 shadow-sm" />
      </div>

      {/* 1. First Motion Stage: Motion logo plays in the center */}
      <div
        className={`fixed inset-0 z-30 flex flex-col items-center justify-center transition-all duration-700 ease-out pointer-events-none ${
          motionComplete
            ? 'opacity-0 scale-95 pointer-events-none'
            : 'opacity-100 scale-100'
        }`}
        aria-hidden={motionComplete}
      >
        <div className="w-36 sm:w-44 h-auto drop-shadow-2xl">
          <ZovaixMotionLogo mode="once" className="w-full h-auto" />
        </div>
        <div className="mt-5 text-center">
          <span className="text-foreground block text-sm font-black tracking-[0.28em] uppercase">
            ZOVAIX
          </span>
          <span className="text-muted-foreground block text-[10px] font-medium tracking-[0.22em] uppercase mt-1">
            AI Revenue Workspace
          </span>
        </div>
      </div>

      {/* 2. Signup Card: Becomes visible after initial motion */}
      <div
        className={`relative z-20 w-full max-w-md mx-auto transition-all duration-700 ease-out ${
          motionComplete
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-6 scale-[0.98] pointer-events-none'
        }`}
      >
        <div className="rounded-3xl border border-border/60 bg-card/70 backdrop-blur-2xl p-7 sm:p-9 shadow-2xl shadow-black/20">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-3 flex items-center justify-center">
              <div className="w-14 h-auto">
                <ZovaixMotionLogo mode="static" className="w-full h-auto drop-shadow-md" />
              </div>
            </div>

            {inviteToken ? (
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
                <UsersRound className="size-3.5" />
                Team Invitation
              </div>
            ) : null}

            <h1 className="text-2xl font-black tracking-tight text-foreground">
              {inviteToken ? 'Create account & join' : 'Create your account'}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {inviteToken
                ? 'Verify your email to accept your team invitation.'
                : 'Start orchestrating revenue on WhatsApp today.'}
            </p>
          </div>

          <form onSubmit={handleSignup} className="flex flex-col gap-3.5">
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-medium text-red-400">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName" className="text-xs font-semibold text-muted-foreground">
                Full name
              </Label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-11 pl-10 rounded-xl border-border/60 bg-muted/40 text-foreground placeholder:text-muted-foreground/60 text-sm focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground">
                Work Email
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

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground">
                Password
              </Label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pl-10 rounded-xl border-border/60 bg-muted/40 text-foreground placeholder:text-muted-foreground/60 text-sm focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmPassword" className="text-xs font-semibold text-muted-foreground">
                Confirm Password
              </Label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                  Creating account...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  Create account
                  <ArrowRight className="size-4 text-black" />
                </span>
              )}
            </Button>
          </form>

          <p className="text-muted-foreground mt-6 text-center text-xs">
            Already have an account?{' '}
            <Link
              href={
                inviteToken
                  ? `/login?invite=${encodeURIComponent(inviteToken)}`
                  : '/login'
              }
              className="text-primary hover:text-primary/80 font-bold transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
