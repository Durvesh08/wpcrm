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
import { BentoHeroEngine } from '@/components/dashboard/bento-hero-engine';
import { BentoUpcomingFollowups } from '@/components/dashboard/bento-upcoming-followups';
import { BentoPipelineRoadmap } from '@/components/dashboard/bento-pipeline-roadmap';
import { BentoDateCapsule } from '@/components/dashboard/bento-date-capsule';
import { BentoEfficiencyWave } from '@/components/dashboard/bento-efficiency-wave';
import { BentoVolumeCard } from '@/components/dashboard/bento-volume-card';
import { BentoAiAssistant } from '@/components/dashboard/bento-ai-assistant';

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
      {/* 7-CARD NEO-BENTO MISSION CONTROL (INSPIRED BY REFERENCE IMAGE) */}
      <section className="space-y-4 lg:space-y-5">
        {/* Row 1: Hero Lime Card (7 cols) + Upcoming Follow-ups (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
          <div className="lg:col-span-7">
            <BentoHeroEngine
              profile={profile}
              account={account}
              metrics={metrics}
              roleLabel={roleLabel}
            />
          </div>
          <div className="lg:col-span-5">
            <BentoUpcomingFollowups activity={activity} />
          </div>
        </div>

        {/* Row 2: Pipeline Roadmap (5 cols) + Center Date & Efficiency Stack (3 cols) + Right Volume & AI Stack (4 cols) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 lg:gap-5">
          {/* Left: Pipeline Roadmap */}
          <div className="lg:col-span-5">
            <BentoPipelineRoadmap pipeline={pipeline} />
          </div>

          {/* Center Column: Date Capsule + Efficiency Wave */}
          <div className="lg:col-span-3 flex flex-col gap-4 lg:gap-5 justify-between">
            <BentoDateCapsule />
            <BentoEfficiencyWave efficiencyDelta="+40%" />
          </div>

          {/* Right Column: Volume Card + AI Assistant */}
          <div className="lg:col-span-4 flex flex-col gap-4 lg:gap-5 justify-between">
            <BentoVolumeCard
              pipelineValue={metrics?.openDealsValue ?? 145000}
              currency={defaultCurrency}
            />
            <BentoAiAssistant />
          </div>
        </div>
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
