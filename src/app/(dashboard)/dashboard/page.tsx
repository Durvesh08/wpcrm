'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';

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

  const roleLabel = isOwner ? 'Super Admin' : isAdmin ? 'Admin' : 'Agent';

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
            <BentoUpcomingFollowups />
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
            <BentoEfficiencyWave
              range={range}
              onRangeChange={handleRangeChange}
              series={series}
              responseTime={responseTime}
            />
          </div>

          {/* Right Column: Volume Card + AI Assistant */}
          <div className="lg:col-span-4 flex flex-col gap-4 lg:gap-5 justify-between">
            <BentoVolumeCard
              pipelineValue={metrics?.openDealsValue ?? 0}
              currency={defaultCurrency}
            />
            <BentoAiAssistant />
          </div>
        </div>
      </section>

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
