'use client';

import { Suspense, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ModeToggle } from '@/components/layout/mode-toggle';
import { CheckCircle, MessageSquare, UsersRound } from 'lucide-react';

// `useSearchParams` opts the component out of static prerendering
// unless wrapped in Suspense — same pattern as /login.
export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupPageInner />
    </Suspense>
  );
}

function SignupPageInner() {
  const searchParams = useSearchParams();
  // When the user lands here from `/join/<token>` we carry the
  // invite token in the query so it survives the signup → email
  // verification → redirect round-trip. `emailRedirectTo` below
  // points back at /join/<token> so the user lands on the redeem
  // step after verifying instead of being dropped on /dashboard.
  const inviteToken = searchParams.get('invite');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

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

    // Always send Supabase email confirmations through our callback
    // route so PKCE links exchange their code into a browser session.
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
      <div className="zovaix-chat-bg bg-background flex min-h-screen items-center justify-center px-4">
        <div className="absolute top-4 right-4">
          <ModeToggle />
        </div>
        <Card className="border-border bg-card/95 w-full max-w-md shadow-2xl shadow-black/10">
          <CardHeader className="items-center text-center">
            <div className="border-primary/30 shadow-primary/10 relative mb-2 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border bg-black shadow-lg">
              <Image
                src="/zovaix-logo.png"
                alt="ZOVAIX logo"
                fill
                sizes="80px"
                priority
                className="object-cover"
              />
            </div>
            <CheckCircle className="text-primary size-7" />
            <CardTitle className="text-foreground text-xl">
              Check your email
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              We&apos;ve sent a confirmation link to{' '}
              <span className="text-foreground">{email}</span>. Please check
              your inbox and click the link to verify your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={
                inviteToken
                  ? `/login?invite=${encodeURIComponent(inviteToken)}`
                  : '/login'
              }
            >
              <Button
                variant="outline"
                className="border-border text-muted-foreground hover:bg-muted hover:text-foreground w-full"
              >
                Back to sign in
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="zovaix-chat-bg bg-background text-foreground grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="border-border relative hidden min-h-screen items-center justify-center overflow-hidden border-r px-10 py-12 lg:flex">
        <div className="relative z-10 flex w-full max-w-xl flex-col items-center text-center">
          <div className="zovaix-brand-mark border-primary/30 shadow-primary/20 relative mb-8 h-52 w-52 overflow-hidden rounded-[2rem] border bg-black shadow-2xl">
            <Image
              src="/zovaix-logo.png"
              alt="ZOVAIX logo"
              fill
              sizes="208px"
              priority
              className="object-cover"
            />
          </div>
          <div className="border-primary/25 bg-primary/10 text-primary mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-wider uppercase">
            <MessageSquare className="size-3.5" />
            WhatsApp-style CRM
          </div>
          <h1 className="zovaix-wordmark text-foreground text-5xl leading-tight font-black">
            ZOVAIX
          </h1>
        </div>
      </section>

      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="absolute top-4 right-4">
          <ModeToggle />
        </div>
        <Card className="border-border bg-card/95 w-full max-w-md shadow-2xl shadow-black/10">
          <CardHeader className="items-center text-center">
            <div className="border-primary/30 shadow-primary/10 relative mb-2 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border bg-black shadow-lg lg:hidden">
              <Image
                src="/zovaix-logo.png"
                alt="ZOVAIX logo"
                fill
                sizes="80px"
                priority
                className="object-cover"
              />
            </div>
            <div className="bg-primary/10 mb-2 hidden h-12 w-12 items-center justify-center rounded-xl lg:flex">
              {inviteToken ? (
                <UsersRound className="text-primary h-6 w-6" />
              ) : (
                <MessageSquare className="text-primary h-6 w-6" />
              )}
            </div>
            <p className="text-primary text-xs font-black tracking-[0.28em] uppercase">
              ZOVAIX
            </p>
            <CardTitle className="text-foreground text-xl">
              {inviteToken ? 'Create account & join' : 'Create account'}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {inviteToken
                ? 'Verify your email, then accept the invitation to join your team.'
                : 'Get started with ZOVAIX'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="flex flex-col gap-4">
              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="fullName" className="text-muted-foreground">
                  Full name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="password" className="text-muted-foreground">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="confirmPassword"
                  className="text-muted-foreground"
                >
                  Confirm password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="bg-primary text-primary-foreground hover:bg-primary/90 mt-2 h-10 w-full disabled:opacity-50"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>

            <p className="text-muted-foreground mt-6 text-center text-sm">
              Already have an account?{' '}
              <Link
                href={
                  inviteToken
                    ? `/login?invite=${encodeURIComponent(inviteToken)}`
                    : '/login'
                }
                className="text-primary hover:text-primary/80"
              >
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
