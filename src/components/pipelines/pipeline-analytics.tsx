"use client";

import { useMemo } from "react";
import type { Deal, PipelineStage } from "@/types";
import {
  DollarSign,
  TrendingUp,
  Target,
  BarChart3,
  Trophy,
  XCircle,
  Info,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/currency";

interface PipelineAnalyticsProps {
  stages: PipelineStage[];
  deals: Deal[];
}

/**
 * Weighted pipeline value: value × per-stage probability.
 * First stage ≈ 10%, stages interpolate up to 90% before the final stage,
 * final stage (Won) = 100%. Lost deals excluded.
 */
function computeStageProbability(
  stage: PipelineStage,
  sortedStages: PipelineStage[],
): number {
  const n = sortedStages.length;
  if (n <= 1) return 1;
  const index = sortedStages.findIndex((s) => s.id === stage.id);
  if (index < 0) return 0;
  if (index === n - 1) return 1;
  const slots = n - 1;
  if (slots <= 1) return 0.1;
  const t = index / (slots - 1);
  return 0.1 + t * (0.9 - 0.1);
}

export function PipelineAnalytics({ stages, deals }: PipelineAnalyticsProps) {
  const { defaultCurrency } = useAuth();
  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.position - b.position),
    [stages],
  );

  const stats = useMemo(() => {
    const active = deals.filter((d) => d.status !== "lost");
    const openDeals = active.filter((d) => d.status !== "won");

    const totalCount = active.length;
    const totalValue = active.reduce((sum, d) => sum + Number(d.value || 0), 0);
    const avgValue = totalCount > 0 ? totalValue / totalCount : 0;

    const stageById = new Map(sortedStages.map((s) => [s.id, s]));
    const weightedValue = openDeals.reduce((sum, d) => {
      const stage = stageById.get(d.stage_id);
      if (!stage) return sum;
      const prob = computeStageProbability(stage, sortedStages);
      return sum + Number(d.value || 0) * prob;
    }, 0);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = (d: Deal) => {
      const ts = d.updated_at ?? d.created_at;
      return ts ? new Date(ts) >= monthStart : false;
    };
    const wonThisMonth = deals.filter(
      (d) => d.status === "won" && thisMonth(d),
    ).length;
    const lostThisMonth = deals.filter(
      (d) => d.status === "lost" && thisMonth(d),
    ).length;

    return {
      totalCount,
      totalValue,
      avgValue,
      weightedValue,
      wonThisMonth,
      lostThisMonth,
    };
  }, [deals, sortedStages]);

  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-6 mb-2">
      {/* 1. Total Deals */}
      <div className="zovaix-glass-card rounded-[22px] p-4 flex flex-col justify-between hover:border-primary/40 hover:-translate-y-0.5 transition-all group relative overflow-hidden">
        <div className="flex items-center justify-between gap-1 mb-2">
          <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-muted-foreground uppercase truncate">
            Total Deals
          </span>
          <div className="flex items-center gap-1">
            <span
              title="Count of every active deal in this pipeline, excluding Lost deals."
              aria-label="How Total Deals is calculated"
              className="text-muted-foreground/60 hover:text-foreground cursor-help p-0.5 inline-flex items-center"
            >
              <Info className="h-3 w-3" />
            </span>
            <div className="w-8 h-8 rounded-[11px] bg-muted/70 border border-border/60 flex items-center justify-center text-primary group-hover:scale-105 transition-transform shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-black text-foreground font-mono tracking-tight">
            {stats.totalCount}
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground font-medium">
          <span>In active pipeline</span>
          <span className="font-mono text-primary font-bold">{sortedStages.length} stages</span>
        </div>
      </div>

      {/* 2. Pipeline Value (Hero Card with Electric Lime Glow) */}
      <div className="rounded-[22px] bg-gradient-to-br from-card/90 via-card/70 to-primary/10 border border-primary/40 p-4 flex flex-col justify-between shadow-xs shadow-primary/5 hover:border-primary hover:-translate-y-0.5 transition-all group relative overflow-hidden backdrop-blur-xl">
        <div className="flex items-center justify-between gap-1 mb-2">
          <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-primary uppercase truncate">
            Pipeline Value
          </span>
          <div className="flex items-center gap-1">
            <span
              title="Sum of values of all active deals in this pipeline (excluding Lost)."
              aria-label="How Pipeline Value is calculated"
              className="text-primary/60 hover:text-primary cursor-help p-0.5 inline-flex items-center"
            >
              <Info className="h-3 w-3" />
            </span>
            <div className="w-8 h-8 rounded-[11px] bg-primary text-primary-foreground flex items-center justify-center shadow-xs shrink-0">
              <DollarSign className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-black text-foreground font-mono tracking-tight truncate">
            {formatCurrency(stats.totalValue, defaultCurrency)}
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-primary/20 flex items-center justify-between text-[10px] text-primary font-medium">
          <span>Gross pipeline</span>
          <span className="font-mono font-bold">100% target</span>
        </div>
      </div>

      {/* 3. Avg Deal Size */}
      <div className="zovaix-glass-card rounded-[22px] p-4 flex flex-col justify-between hover:border-primary/40 hover:-translate-y-0.5 transition-all group relative overflow-hidden">
        <div className="flex items-center justify-between gap-1 mb-2">
          <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-muted-foreground uppercase truncate">
            Avg Deal Size
          </span>
          <div className="flex items-center gap-1">
            <span
              title="Pipeline Value divided by Total Deals — average value per deal."
              aria-label="How Avg Deal Size is calculated"
              className="text-muted-foreground/60 hover:text-foreground cursor-help p-0.5 inline-flex items-center"
            >
              <Info className="h-3 w-3" />
            </span>
            <div className="w-8 h-8 rounded-[11px] bg-muted/70 border border-border/60 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform shrink-0">
              <Target className="w-4 h-4" />
            </div>
          </div>
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-black text-foreground font-mono tracking-tight truncate">
            {formatCurrency(stats.avgValue, defaultCurrency)}
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground font-medium">
          <span>Per active deal</span>
          <span className="font-mono text-foreground font-semibold">Average</span>
        </div>
      </div>

      {/* 4. Weighted Value */}
      <div className="zovaix-glass-card rounded-[22px] p-4 flex flex-col justify-between hover:border-primary/40 hover:-translate-y-0.5 transition-all group relative overflow-hidden">
        <div className="flex items-center justify-between gap-1 mb-2">
          <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-muted-foreground uppercase truncate">
            Weighted Value
          </span>
          <div className="flex items-center gap-1">
            <span
              title="Expected revenue: deal value × stage probability (10% to 90%, Won = 100%)."
              aria-label="How Weighted Value is calculated"
              className="text-muted-foreground/60 hover:text-foreground cursor-help p-0.5 inline-flex items-center"
            >
              <Info className="h-3 w-3" />
            </span>
            <div className="w-8 h-8 rounded-[11px] bg-muted/70 border border-border/60 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-black text-foreground font-mono tracking-tight truncate">
            {formatCurrency(stats.weightedValue, defaultCurrency)}
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground font-medium">
          <span>Probability weighted</span>
          <span className="font-mono text-purple-400 font-bold">Confidence</span>
        </div>
      </div>

      {/* 5. Won This Month */}
      <div className="zovaix-glass-card rounded-[22px] p-4 flex flex-col justify-between hover:border-emerald-500/40 hover:-translate-y-0.5 transition-all group relative overflow-hidden">
        <div className="flex items-center justify-between gap-1 mb-2">
          <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-emerald-400 uppercase truncate">
            Won Month
          </span>
          <div className="flex items-center gap-1">
            <span
              title="Deals marked as Won since the first day of the current month."
              aria-label="How Won This Month is calculated"
              className="text-emerald-400/60 hover:text-emerald-400 cursor-help p-0.5 inline-flex items-center"
            >
              <Info className="h-3 w-3" />
            </span>
            <div className="w-8 h-8 rounded-[11px] bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-black text-foreground font-mono tracking-tight">
            {stats.wonThisMonth}
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-[10px] text-emerald-400 font-medium">
          <span>Closed wins</span>
          <span className="font-mono font-bold">This Month</span>
        </div>
      </div>

      {/* 6. Lost This Month */}
      <div className="zovaix-glass-card rounded-[22px] p-4 flex flex-col justify-between hover:border-rose-500/40 hover:-translate-y-0.5 transition-all group relative overflow-hidden">
        <div className="flex items-center justify-between gap-1 mb-2">
          <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-rose-400 uppercase truncate">
            Lost Month
          </span>
          <div className="flex items-center gap-1">
            <span
              title="Deals marked as Lost since the first day of the current month."
              aria-label="How Lost This Month is calculated"
              className="text-rose-400/60 hover:text-rose-400 cursor-help p-0.5 inline-flex items-center"
            >
              <Info className="h-3 w-3" />
            </span>
            <div className="w-8 h-8 rounded-[11px] bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform shrink-0">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-black text-foreground font-mono tracking-tight">
            {stats.lostThisMonth}
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-[10px] text-rose-400 font-medium">
          <span>Lost deals</span>
          <span className="font-mono font-bold">This Month</span>
        </div>
      </div>
    </div>
  );
}
