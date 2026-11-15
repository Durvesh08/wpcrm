'use client';

import Link from 'next/link';
import { Plus, GitBranch, ArrowRight } from 'lucide-react';
import type { PipelineDonutData } from '@/lib/dashboard/types';

interface BentoPipelineRoadmapProps {
  pipeline: PipelineDonutData | null;
}

export function BentoPipelineRoadmap({ pipeline }: BentoPipelineRoadmapProps) {
  const totalDeals =
    pipeline?.stages.reduce((sum, s) => sum + s.dealCount, 0) ?? 0;

  // Real database stages sorted by deal count or natural order
  const realStages = pipeline?.stages ?? [];

  return (
    <div className="bento-card-white p-6 sm:p-7 flex flex-col justify-between min-h-[300px] relative overflow-hidden transition-all duration-300">
      {/* Header: Title & "+ Add deal" Pill CTA */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-[-0.03em] text-foreground leading-tight">
            Pipeline Roadmap
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalDeals > 0
              ? `${totalDeals} active deal${totalDeals === 1 ? '' : 's'} across ${realStages.length} stage${realStages.length === 1 ? '' : 's'}`
              : 'Real stage velocity & live pipeline status'}
          </p>
        </div>

        <Link
          href="/pipelines"
          className="rounded-full bg-[#111417] text-white hover:bg-black px-4 py-2 text-xs font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add deal</span>
        </Link>
      </div>

      {/* Center: Real Horizontal Capsule Stage Bars */}
      <div className="my-5 relative">
        {totalDeals === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 p-6 text-center bg-muted/15 flex flex-col items-center justify-center">
            <GitBranch className="h-7 w-7 text-muted-foreground/60 mb-2" />
            <p className="text-xs font-semibold text-foreground">No active deals in pipeline</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Move leads through stages by creating your first deal.
            </p>
            <Link
              href="/pipelines"
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/15 text-primary border border-primary/25 px-3 py-1 text-xs font-bold hover:bg-primary/20 transition-all"
            >
              <Plus className="h-3 w-3" /> Create First Deal
            </Link>
          </div>
        ) : (
          <div className="space-y-3.5">
            {realStages.map((stage) => {
              const pct = totalDeals > 0 ? Math.round((stage.dealCount / totalDeals) * 100) : 0;
              const fillWidth = Math.max(10, pct);

              return (
                <div key={stage.id} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-foreground">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: stage.color || '#D7FA00' }}
                      />
                      <span className="truncate">{stage.name}</span>
                    </span>
                    <span className="font-mono text-muted-foreground text-[10px]">
                      {stage.dealCount} deal{stage.dealCount === 1 ? '' : 's'} ({pct}%)
                    </span>
                  </div>
                  <div className="relative h-6 rounded-full bg-muted/40 overflow-hidden flex items-center p-0.5 border border-border/40">
                    <div
                      className="h-full rounded-full transition-all duration-700 flex items-center justify-end pr-2"
                      style={{
                        width: `${fillWidth}%`,
                        backgroundColor: stage.color ? `${stage.color}35` : '#D7FA0030',
                        borderRight: `2px solid ${stage.color || '#D7FA00'}`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Summary Link */}
      <div className="pt-2 border-t border-border/40 flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">
          Automated deal stage tracking
        </span>
        <Link
          href="/pipelines"
          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
        >
          Open Kanban Board <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
