"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ModeToggle } from "@/components/layout/mode-toggle";
import {
  CheckCircle,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

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
  const inviteToken = searchParams.get("invite");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    // If we have an invite token, point Supabase's verification
    // email back at the join page so the user can accept after
    // verifying. Without a token, Supabase uses its default
    // redirect (the app root).
    const emailRedirectTo = inviteToken
      ? `${window.location.origin}/join/${encodeURIComponent(inviteToken)}`
      : undefined;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        ...(emailRedirectTo ? { emailRedirectTo } : {}),
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
      <div className="adsrahu-chat-bg flex min-h-screen items-center justify-center bg-background px-4">
        <div className="absolute right-4 top-4">
          <ModeToggle />
        </div>
        <Card className="w-full max-w-md border-border bg-card/95 shadow-2xl shadow-black/10">
          <CardHeader className="items-center text-center">
            <div className="relative mb-2 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-primary/30 bg-black shadow-lg shadow-primary/10">
              <Image
                src="/adsrahu-logo.png"
                alt="ADSRAHU logo"
                fill
                sizes="80px"
                priority
                className="object-cover"
              />
            </div>
            <CheckCircle className="size-7 text-primary" />
            <CardTitle className="text-xl text-foreground">
              Check your email
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              We&apos;ve sent a confirmation link to{" "}
              <span className="text-foreground">{email}</span>. Please check your
              inbox and click the link to verify your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={
                inviteToken
                  ? `/login?invite=${encodeURIComponent(inviteToken)}`
                  : "/login"
              }
            >
              <Button
                variant="outline"
                className="w-full border-border text-muted-foreground hover:bg-muted hover:text-foreground"
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
    <div className="adsrahu-chat-bg grid min-h-screen bg-background text-foreground lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden min-h-screen items-center justify-center overflow-hidden border-r border-border px-10 py-12 lg:flex">
        <div className="relative z-10 flex w-full max-w-xl flex-col items-center text-center">
          <div className="adsrahu-brand-mark relative mb-8 h-52 w-52 overflow-hidden rounded-[2rem] border border-primary/30 bg-black shadow-2xl shadow-primary/20">
            <Image
              src="/adsrahu-logo.png"
              alt="ADSRAHU logo"
              fill
              sizes="208px"
              priority
              className="object-cover"
            />
          </div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <MessageSquare className="size-3.5" />
            WhatsApp-style CRM
          </div>
          <h1 className="adsrahu-wordmark text-5xl font-black leading-tight text-foreground">
            ADSRAHU CRM
          </h1>
          <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">
            Bring every WhatsApp conversation, contact, campaign, and sales
            follow-up into one fast ADSRAHU workspace.
          </p>
          <div className="mt-8 grid w-full max-w-md grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-card/70 p-4 text-left">
              <ShieldCheck className="mb-3 size-5 text-primary" />
              <p className="text-sm font-semibold text-foreground">Secure access</p>
              <p className="mt-1 text-xs text-muted-foreground">Supabase auth and roles</p>
            </div>
            <div className="rounded-lg border border-border bg-card/70 p-4 text-left">
              <Sparkles className="mb-3 size-5 text-amber-400" />
              <p className="text-sm font-semibold text-foreground">Built to move</p>
              <p className="mt-1 text-xs text-muted-foreground">Inbox, flows, and CRM tools</p>
            </div>
          </div>
        </div>
      </section>

      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="absolute right-4 top-4">
          <ModeToggle />
        </div>
        <Card className="w-full max-w-md border-border bg-card/95 shadow-2xl shadow-black/10">
        <CardHeader className="items-center text-center">
          <div className="relative mb-2 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-primary/30 bg-black shadow-lg shadow-primary/10 lg:hidden">
            <Image
              src="/adsrahu-logo.png"
              alt="ADSRAHU logo"
              fill
              sizes="80px"
              priority
              className="object-cover"
            />
          </div>
          <div className="mb-2 hidden h-12 w-12 items-center justify-center rounded-xl bg-primary/10 lg:flex">
            {inviteToken ? (
              <UsersRound className="h-6 w-6 text-primary" />
            ) : (
              <MessageSquare className="h-6 w-6 text-primary" />
            )}
          </div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-primary">
            ADSRAHU CRM
          </p>
          <CardTitle className="text-xl text-foreground">
            {inviteToken ? "Create account & join" : "Create account"}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {inviteToken
              ? "Verify your email, then accept the invitation to join your team."
              : "Get started with ADSRAHU CRM"}
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
              <Label htmlFor="confirmPassword" className="text-muted-foreground">
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
              className="mt-2 h-10 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href={
                inviteToken
                  ? `/login?invite=${encodeURIComponent(inviteToken)}`
                  : "/login"
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
