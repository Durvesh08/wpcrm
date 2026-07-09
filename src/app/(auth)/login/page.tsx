"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
import { MessageSquare, ShieldCheck, Sparkles, UsersRound } from "lucide-react";

// `useSearchParams` opts the component out of static prerendering
// unless it sits under a Suspense boundary. We split the form into
// a child component so the outer page can prerender the chrome
// (background, card frame) while the form hydrates with the query
// string on the client.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  // Forwarded from `/join/<token>` when the visitor already has an
  // account. After a successful sign-in we send them to the join
  // page to accept rather than to /dashboard.
  const inviteToken = searchParams.get("invite");
  const t = useTranslations("LoginPage");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (inviteToken) {
      router.push(`/join/${encodeURIComponent(inviteToken)}`);
    } else {
      router.push("/dashboard");
    }
  };

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
          <h1 className="adsrahu-wordmark relative overflow-hidden text-5xl font-black leading-tight text-foreground">
            ADSRAHU CRM
          </h1>
          <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">
            Manage conversations, contacts, campaigns, and follow-ups from one
            focused workspace built for fast-moving marketing teams.
          </p>
          <div className="mt-8 grid w-full max-w-md grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-card/70 p-4 text-left">
              <ShieldCheck className="mb-3 size-5 text-primary" />
              <p className="text-sm font-semibold text-foreground">Team-ready</p>
              <p className="mt-1 text-xs text-muted-foreground">Shared inbox and roles</p>
            </div>
            <div className="rounded-lg border border-border bg-card/70 p-4 text-left">
              <Sparkles className="mb-3 size-5 text-amber-400" />
              <p className="text-sm font-semibold text-foreground">Growth focus</p>
              <p className="mt-1 text-xs text-muted-foreground">Pipelines and broadcasts</p>
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
            {inviteToken ? t('titleAccept') : t('titleWelcome')}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {inviteToken
              ? t('descAccept')
              : t('descWelcome')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-muted-foreground">
                {t('emailLabel')}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-muted-foreground">
                  {t('passwordLabel')}
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:text-primary/80"
                >
                  {t('forgotPassword')}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder={t('passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 h-10 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? t('signingIn') : t('signIn')}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t('noAccount')}{" "}
            <Link
              href={
                inviteToken
                  ? `/signup?invite=${encodeURIComponent(inviteToken)}`
                  : "/signup"
              }
              className="text-primary hover:text-primary/80"
            >
              {t('createAccount')}
            </Link>
          </p>
        </CardContent>
      </Card>
      </main>
    </div>
  );
}
