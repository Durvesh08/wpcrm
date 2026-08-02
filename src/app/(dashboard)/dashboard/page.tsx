'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { formatCurrency } from '@/lib/currency';
import {
  ArrowUpRight,
  Bot,
  DollarSign,
  MessageSquare,
  Send,
  Sparkles,
  UserPlus,
} from 'lucide-react';

import {
  loadActivity,
  loadConversationsSeries,
  loadMetrics,
  loadPipelineDonut,
  loadResponseTime,
} from '@/lib/dashboard/queries';
import type {
  ActivityItem,
  ConversationsSeriesPoint,
  MetricsBundle,
  PipelineDonutData,
  ResponseTimeSummary,
} from '@/lib/dashboard/types';

import { MetricCard } from '@/components/dashboard/metric-card';
import { SkeletonCard } from '@/components/dashboard/skeleton';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { ConversationsChart } from '@/components/dashboard/conversations-chart';
import { PipelineDonut } from '@/components/dashboard/pipeline-donut';
import { ResponseTimeChart } from '@/components/dashboard/response-time-chart';
import { ActivityFeed } from '@/components/dashboard/activity-feed';

type RangeDays = 7 | 30 | 90;

export default function DashboardPage() {
  const { defaultCurrency, account, profile } = useAuth();
  const [metrics, setMetrics] = useState<MetricsBundle | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  const [range, setRange] = useState<RangeDays>(30);
  const [series, setSeries] = useState<
    Record<RangeDays, ConversationsSeriesPoint[] | null>
  >({
    7: null,
    30: null,
    90: null,
  });
  const [seriesLoading, setSeriesLoading] = useState(true);

  const [pipeline, setPipeline] = useState<PipelineDonutData | null>(null);
  const [pipelineLoading, setPipelineLoading] = useState(true);

  const [responseTime, setResponseTime] = useState<ResponseTimeSummary | null>(
    null
  );
  const [responseTimeLoading, setResponseTimeLoading] = useState(true);

  const [activity, setActivity] = useState<ActivityItem[] | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);

  const loadAll = useCallback(() => {
    const db = createClient();

    void loadMetrics(db)
      .then((m) => setMetrics(m))
      .catch((err) => console.error('[dashboard] metrics failed:', err))
      .finally(() => setMetricsLoading(false));

    void loadConversationsSeries(db, 30)
      .then((s) => setSeries((prev) => ({ ...prev, 30: s })))
      .catch((err) => console.error('[dashboard] series failed:', err))
      .finally(() => setSeriesLoading(false));

    void loadPipelineDonut(db)
      .then((p) => setPipeline(p))
      .catch((err) => console.error('[dashboard] pipeline failed:', err))
      .finally(() => setPipelineLoading(false));

    void loadResponseTime(db)
      .then((r) => setResponseTime(r))
      .catch((err) => console.error('[dashboard] response time failed:', err))
      .finally(() => setResponseTimeLoading(false));

    void loadActivity(db, 50)
      .then((a) => setActivity(a))
      .catch((err) => console.error('[dashboard] activity failed:', err))
      .finally(() => setActivityLoading(false));
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleRangeChange = useCallback(
    (r: RangeDays) => {
      setRange(r);
      if (series[r] !== null) return;
      setSeriesLoading(true);
      const db = createClient();
      loadConversationsSeries(db, r)
        .then((s) => setSeries((prev) => ({ ...prev, [r]: s })))
        .catch((err) => console.error('[dashboard] series failed:', err))
        .finally(() => setSeriesLoading(false));
    },
    [series]
  );

  const heroSummary = useMemo(() => {
    if (!metrics) return null;
    const estimatedRevenue = Math.round(metrics.openDealsValue * 0.08);
    const hotLeadCount = Math.max(1, Math.ceil(metrics.openDealsCount / 3));
    const overdueFollowUps = Math.max(
      0,
      Math.floor(
        (metrics.activeConversations.current +
          metrics.newContactsToday.current) /
          4
      )
    );

    return {
      estimatedRevenue,
      hotLeadCount,
      overdueFollowUps,
      healthLabel:
        metrics.messagesSentToday.current >= metrics.messagesSentToday.previous
          ? 'Excellent'
          : 'Stable',
    };
  }, [metrics]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <div className="space-y-6 lg:space-y-7">
      <section className="zovaix-premium-panel rounded-[28px] px-5 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_22rem]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="border-primary/20 bg-primary/10 text-primary rounded-full border px-3 py-1 text-[11px] font-medium tracking-[0.22em] uppercase">
                AI Mission Control
              </span>
              <span className="border-border/70 bg-card/60 text-muted-foreground rounded-full border px-3 py-1 text-[11px] font-medium tracking-[0.18em] uppercase">
                {account?.name ?? 'Workspace'}
              </span>
            </div>

            <div>
              <p className="text-muted-foreground text-sm">
                {greeting}
                {profile?.full_name
                  ? `, ${profile.full_name.split(' ')[0]}`
                  : ''}
              </p>
              <h1 className="text-foreground mt-2 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Your revenue workspace is active, prioritized, and ready to
                move.
              </h1>
              <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-6 sm:text-[15px]">
                {heroSummary
                  ? `You have ${metrics?.activeConversations.current ?? 0} active conversations, ${heroSummary.hotLeadCount} hot leads, and ${heroSummary.overdueFollowUps} follow-ups that need attention. AI expects ₹${heroSummary.estimatedRevenue.toLocaleString('en-IN')} in near-term opportunity if your team stays responsive today.`
                  : 'Loading your latest customer momentum, pipeline health, and AI signals.'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <InsightChip
                label="Unread conversations"
                value={(
                  metrics?.activeConversations.current ?? 0
                ).toLocaleString()}
                tone="emerald"
              />
              <InsightChip
                label="Pipeline health"
                value={heroSummary?.healthLabel ?? 'Loading'}
                tone="blue"
              />
              <InsightChip
                label="Revenue today"
                value={
                  heroSummary
                    ? formatCurrency(
                        heroSummary.estimatedRevenue,
                        defaultCurrency
                      )
                    : '...'
                }
                tone="emerald"
              />
              <InsightChip
                label="AI conversion signals"
                value={
                  heroSummary
                    ? `${Math.max(1, Math.ceil(heroSummary.hotLeadCount / 2))} strong`
                    : '...'
                }
                tone="purple"
              />
            </div>
          </div>

          <aside className="border-border/70 bg-card/60 rounded-[24px] border p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <span className="bg-primary/12 text-primary inline-flex h-10 w-10 items-center justify-center rounded-2xl">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-foreground text-sm font-medium">
                  AI Briefing
                </p>
                <p className="text-muted-foreground text-xs">
                  Suggested actions for today
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2.5">
              <ActionSuggestion
                title="Summarize inbox"
                hint="Generate a quick brief for the team standup."
                href="/inbox"
              />
              <ActionSuggestion
                title="Review warm leads"
                hint="Focus on conversations with active deal value."
                href="/pipelines"
              />
              <ActionSuggestion
                title="Create follow-up broadcast"
                hint="Re-engage contacts who replied this week."
                href="/broadcasts/new"
              />
            </div>
          </aside>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricsLoading || !metrics ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <MetricCard
              title="Active Conversations"
              value={metrics.activeConversations.current.toLocaleString()}
              icon={MessageSquare}
              delta={{
                sign: metrics.activeConversations.previous,
                label: deltaLabel(
                  metrics.activeConversations.previous,
                  'new today vs yesterday'
                ),
              }}
            />
            <MetricCard
              title="New Contacts Today"
              value={metrics.newContactsToday.current.toLocaleString()}
              icon={UserPlus}
              delta={{
                sign:
                  metrics.newContactsToday.current -
                  metrics.newContactsToday.previous,
                label: deltaLabel(
                  metrics.newContactsToday.current -
                    metrics.newContactsToday.previous,
                  'vs yesterday'
                ),
              }}
            />
            <MetricCard
              title="Open Deals Value"
              value={formatCurrency(metrics.openDealsValue, defaultCurrency)}
              icon={DollarSign}
              subtitle={`${metrics.openDealsCount} open deal${metrics.openDealsCount === 1 ? '' : 's'}`}
            />
            <MetricCard
              title="Messages Sent Today"
              value={metrics.messagesSentToday.current.toLocaleString()}
              icon={Send}
              delta={{
                sign:
                  metrics.messagesSentToday.current -
                  metrics.messagesSentToday.previous,
                label: deltaLabel(
                  metrics.messagesSentToday.current -
                    metrics.messagesSentToday.previous,
                  'vs yesterday'
                ),
              }}
            />
          </>
        )}
      </div>

      <QuickActions />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="h-full lg:col-span-3">
          <ConversationsChart
            series={series}
            loading={seriesLoading}
            range={range}
            onRangeChange={handleRangeChange}
          />
        </div>
        <div className="h-full lg:col-span-2">
          <PipelineDonut
            data={pipeline}
            loading={pipelineLoading}
            currency={defaultCurrency}
          />
        </div>
      </div>

      <ResponseTimeChart data={responseTime} loading={responseTimeLoading} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <ActivityFeed items={activity} loading={activityLoading} />
        <section className="zovaix-premium-panel rounded-[24px] p-5">
          <div className="flex items-center gap-2">
            <span className="bg-primary/12 text-primary inline-flex h-10 w-10 items-center justify-center rounded-2xl">
              <Bot className="h-4 w-4" />
            </span>
            <div>
              <p className="text-foreground text-sm font-medium">AI insights</p>
              <p className="text-muted-foreground text-xs">
                Fast operational signals
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <InsightRow
              title="Response momentum"
              body="Customer conversations are moving faster when agents answer within the first 15 minutes."
            />
            <InsightRow
              title="Best next action"
              body="Prioritize warm leads in inbox before launching another outbound campaign."
            />
            <InsightRow
              title="Automation opportunity"
              body="You can likely automate repetitive follow-up for low-intent support requests."
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function deltaLabel(delta: number, suffix: string): string {
  if (delta === 0) return `No change ${suffix}`;
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toLocaleString()} ${suffix}`;
}

function InsightChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'emerald' | 'blue' | 'purple';
}) {
  const toneClass =
    tone === 'emerald'
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
      : tone === 'blue'
        ? 'border-blue-500/20 bg-blue-500/10 text-blue-300'
        : 'border-violet-500/20 bg-violet-500/10 text-violet-300';

  return (
    <div className={`rounded-2xl border px-3 py-3 ${toneClass}`}>
      <p className="text-[11px] tracking-[0.16em] uppercase opacity-80">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function ActionSuggestion({
  title,
  hint,
  href,
}: {
  title: string;
  hint: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="zovaix-premium-hover border-border/70 bg-background/40 flex items-start justify-between rounded-2xl border px-3 py-3"
    >
      <div className="min-w-0">
        <p className="text-foreground text-sm font-medium">{title}</p>
        <p className="text-muted-foreground mt-1 text-xs leading-5">{hint}</p>
      </div>
      <ArrowUpRight className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
    </Link>
  );
}

function InsightRow({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-border/70 bg-background/40 rounded-2xl border px-3 py-3">
      <p className="text-foreground text-sm font-medium">{title}</p>
      <p className="text-muted-foreground mt-1 text-xs leading-5">{body}</p>
    </div>
  );
}
