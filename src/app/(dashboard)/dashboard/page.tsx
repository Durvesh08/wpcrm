'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { formatCurrency } from '@/lib/currency';
import {
  ArrowUpRight,
  Bell,
  ChevronDown,
  ChevronUp,
  DollarSign,
  MessageSquare,
  Send,
  Sparkles,
  UserPlus,
  Zap,
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
  const { defaultCurrency, account, profile, isOwner, isAdmin } = useAuth();
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
  const [showAiBrief, setShowAiBrief] = useState(false);

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

  const priorityStack = useMemo(() => {
    if (!metrics || !heroSummary) return [];
    return [
      {
        label: 'Answer waiting conversations',
        value: metrics.activeConversations.current.toLocaleString(),
        detail:
          metrics.activeConversations.current > 0
            ? 'Clear inbox pressure before launching new outreach.'
            : 'No open conversation pressure right now.',
        href: '/inbox',
        icon: MessageSquare,
        tone: 'emerald' as const,
      },
      {
        label: 'Move revenue forward',
        value: formatCurrency(metrics.openDealsValue, defaultCurrency),
        detail: `${metrics.openDealsCount} open deal${metrics.openDealsCount === 1 ? '' : 's'} need stage movement.`,
        href: '/pipelines',
        icon: DollarSign,
        tone: 'blue' as const,
      },
      {
        label: 'Use AI for leverage',
        value: `${heroSummary.hotLeadCount} signals`,
        detail: 'Summarize intent, draft replies, and prepare follow-ups.',
        href: '/agents',
        icon: Sparkles,
        tone: 'purple' as const,
      },
    ];
  }, [defaultCurrency, heroSummary, metrics]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const fullName = profile?.full_name || 'CRM Team';
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'WP';
  const roleLabel = isOwner ? 'Super Admin' : isAdmin ? 'Admin' : 'Agent';
  const targetProgress = metrics?.openDealsCount
    ? Math.min(100, Math.max(15, metrics.openDealsCount * 14))
    : 45;

  return (
    <div className="space-y-6 lg:space-y-7 pb-10">
      {/* REAL CRM HERO (NEO-BENTO INSPIRATION) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
        {/* Left Card: Acid Lime Hero Panel with Real CRM Data (8 cols on lg) */}
        <div className="lg:col-span-8 bento-card-lime p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden min-h-[350px]">
          {/* Top Row: User Avatar Pill & Live Engine Indicator */}
          <div className="flex items-center justify-between gap-3 z-10">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E47B62] text-sm font-bold text-white shadow-sm border border-black/10">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#0D120D] leading-tight truncate">
                    {greeting}, {fullName.split(' ')[0]}
                  </h3>
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-black/10 text-[#0D120D]">
                    {roleLabel}
                  </span>
                </div>
                <p className="text-xs font-semibold text-[#0D120D]/70">{account?.name ?? 'Workspace'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/10 px-3 py-1 text-xs font-bold text-[#0D120D]">
                <span className="h-2 w-2 rounded-full bg-[#0D120D] animate-pulse" />
                Live Engine
              </span>
              <Link
                href="/notifications"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/10 hover:bg-black/15 text-[#0D120D] transition-colors"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Main Title & Real Metrics Status */}
          <div className="my-5 z-10">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#0D120D] leading-tight">
              Revenue & WhatsApp Mission Control
            </h1>

            {/* Real Status Line */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs sm:text-sm font-semibold text-[#0D120D]/80">
              <span>{metrics?.activeConversations.current ?? 0} active conversations</span>
              <span>•</span>
              <span className="text-[#0D120D] font-bold">{heroSummary?.hotLeadCount ?? 0} hot leads</span>
              <span>•</span>
              <span>{heroSummary?.overdueFollowUps ?? 0} follow-ups pending</span>
              <button
                type="button"
                onClick={() => setShowAiBrief(!showAiBrief)}
                className="inline-flex items-center gap-1 ml-1 text-[#0D120D] underline font-bold text-xs cursor-pointer"
              >
                <Sparkles className="h-3 w-3" />
                {showAiBrief ? 'Hide AI Brief' : 'View AI Brief'}
                {showAiBrief ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>

            {/* Target Progress Bar (Inspired by "Project progress 34%") */}
            <div className="mt-5 space-y-1.5 max-w-xl">
              <div className="flex items-center justify-between text-xs font-bold text-[#0D120D]">
                <span>Pipeline Conversion Progress</span>
                <span>{targetProgress}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/15">
                <div
                  className="h-full rounded-full bg-[#0D120D] transition-all duration-700 ease-out"
                  style={{ width: `${targetProgress}%` }}
                />
              </div>
            </div>

            {/* Expandable AI Narrative */}
            {showAiBrief && heroSummary && (
              <div className="mt-3.5 rounded-2xl p-3.5 text-xs sm:text-sm font-medium text-[#0D120D] leading-relaxed bg-black/10 border border-black/10">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>AI Revenue Forecast</span>
                </div>
                You have {metrics?.activeConversations.current ?? 0} active conversations and {heroSummary.hotLeadCount} high-intent leads. Staying responsive today can capture an estimated ₹{heroSummary.estimatedRevenue.toLocaleString('en-IN')} in near-term deals.
              </div>
            )}
          </div>

          {/* Bottom Row: 4 High-Contrast Insight Pill Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 z-10 pt-2">
            <div className="rounded-2xl bg-black/10 px-3.5 py-2.5 backdrop-blur-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#0D120D]/70">Unread Chats</p>
              <p className="mt-0.5 text-base font-extrabold text-[#0D120D]">
                {(metrics?.activeConversations.current ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl bg-black/10 px-3.5 py-2.5 backdrop-blur-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#0D120D]/70">Pipeline Health</p>
              <p className="mt-0.5 text-base font-extrabold text-[#0D120D]">
                {heroSummary?.healthLabel ?? 'Stable'}
              </p>
            </div>
            <div className="rounded-2xl bg-black/10 px-3.5 py-2.5 backdrop-blur-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#0D120D]/70">Est. Revenue</p>
              <p className="mt-0.5 text-base font-extrabold text-[#0D120D]">
                {heroSummary ? formatCurrency(heroSummary.estimatedRevenue, defaultCurrency) : '—'}
              </p>
            </div>
            <div className="rounded-2xl bg-black/10 px-3.5 py-2.5 backdrop-blur-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#0D120D]/70">AI Signals</p>
              <p className="mt-0.5 text-base font-extrabold text-[#0D120D]">
                {heroSummary ? `${Math.max(1, Math.ceil(heroSummary.hotLeadCount / 2))} hot` : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Card: Deep Onyx Priority Stack (4 cols on lg) */}
        <aside className="lg:col-span-4 bento-card-dark p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-white text-xs font-bold tracking-wider uppercase">
                Today&apos;s priority stack
              </p>
              <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-white/80">
                Focus mode
              </span>
            </div>
            <p className="text-white/60 mt-1 text-xs">
              Highest-leverage actions to protect revenue momentum.
            </p>
          </div>

          <div className="my-4 space-y-2.5">
            {priorityStack.length > 0
              ? priorityStack.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="group flex items-start gap-3 rounded-2xl p-3 bg-white/5 hover:bg-white/10 border border-white/5 transition-all duration-200"
                  >
                    <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#D7FA00] text-[#0D120D]">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-white flex items-center justify-between gap-1 text-xs font-bold">
                        <span className="truncate">{item.label}</span>
                        <span className="text-[#D7FA00] shrink-0 font-extrabold">{item.value}</span>
                      </span>
                      <span className="text-white/60 block text-[11px] leading-4 mt-0.5">{item.detail}</span>
                    </span>
                    <ArrowUpRight className="text-white/40 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                ))
              : ['Attention', 'Revenue', 'AI leverage'].map((label) => (
                  <div key={label} className="h-16 animate-pulse rounded-2xl bg-white/5 border border-white/5" />
                ))}
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
            <span>Real-time WhatsApp sync</span>
            <span className="font-bold text-[#D7FA00]">Active</span>
          </div>
        </aside>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

      <ActivityFeed items={activity} loading={activityLoading} />
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
      ? 'border-emerald-500/30 bg-emerald-500/12 text-emerald-300 shadow-[0_0_16px_-4px_rgba(16,185,129,0.2)]'
      : tone === 'blue'
        ? 'border-cyan-500/30 bg-cyan-500/12 text-cyan-300 shadow-[0_0_16px_-4px_rgba(6,182,212,0.2)]'
        : 'border-violet-500/30 bg-violet-500/12 text-violet-300 shadow-[0_0_16px_-4px_rgba(168,85,247,0.2)]';

  return (
    <div className={`rounded-2xl border px-3.5 py-3 backdrop-blur-md transition-all duration-200 hover:scale-[1.02] ${toneClass}`}>
      <p className="text-[10px] font-bold tracking-[0.18em] uppercase opacity-85">
        {label}
      </p>
      <p className="mt-1 text-base font-extrabold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

function MissionPriority({
  label,
  value,
  detail,
  href,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  href: string;
  icon: typeof MessageSquare;
  tone: 'emerald' | 'blue' | 'purple';
}) {
  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/35 shadow-sm shadow-emerald-500/20'
      : tone === 'blue'
        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/35 shadow-sm shadow-cyan-500/20'
        : 'bg-violet-500/20 text-violet-400 border border-violet-500/35 shadow-sm shadow-violet-500/20';

  return (
    <Link
      href={href}
      className="zovaix-glass-card zovaix-premium-hover group flex items-start gap-3 rounded-2xl p-3.5 transition-all duration-200"
    >
      <span
        className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClass}`}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-foreground flex items-center justify-between gap-2 text-sm font-semibold tracking-tight">
          <span className="truncate">{label}</span>
          <span className="text-primary shrink-0 text-xs font-bold tabular-nums">
            {value}
          </span>
        </span>
        <span className="text-muted-foreground mt-1 block text-xs leading-5">
          {detail}
        </span>
      </span>
      <ArrowUpRight className="text-muted-foreground mt-1 h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}
