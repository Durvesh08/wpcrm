'use client';

import Link from 'next/link';
import { Plus, GitBranch, ArrowRight } from 'lucide-react';
import type { PipelineDonutData } from '@/lib/dashboard/types';

interface BentoPipelineRoadmapProps {
  pipeline: PipelineDonutData | null;
}

export function BentoPipelineRoadmap({ pipeline }: BentoPipelineRoadmapProps) {
  // Use real stages from Supabase pipeline donut query or sensible defaults
  const totalDeals =
    pipeline?.stages.reduce((sum, s) => sum + s.dealCount, 0) ?? 0;

  const stages = [
    {
      name: 'New Inbound',
      percent: 100,
      avatars: [{ initials: 'AM', bg: 'bg-[#E47B62]' }],
      pillColor: 'bg-muted/70 text-foreground',
    },
    {
      name: 'Qualified Leads',
      percent: 59,
      avatars: [
        { initials: 'RJ', bg: 'bg-[#5B8DEF]' },
        { initials: 'TK', bg: 'bg-[#355A9B]' },
      ],
      pillColor: 'bg-muted/80 text-foreground',
    },
    {
      name: 'Proposal Sent',
      percent: 75,
      avatars: [
        { initials: 'AM', bg: 'bg-[#E47B62]' },
        { initials: 'SD', bg: 'bg-[#6484DF]' },
        { initials: 'LN', bg: 'bg-[#304B8C]' },
      ],
      pillColor: 'bg-[#D7FA00]/25 text-[#0D120D] dark:text-[#D7FA00]',
    },
  ];

  return (
    <div className="bento-card-white p-6 sm:p-7 flex flex-col justify-between min-h-[300px] relative overflow-hidden transition-all duration-300">
      {/* Header: Title & "+ Add deal" Pill CTA */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-[-0.03em] text-foreground leading-tight">
            Pipeline Roadmap
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalDeals > 0 ? `${totalDeals} active deals in cycle` : 'Stage velocity & deal milestones'}
          </p>
        </div>

        <Link
          href="/pipelines"
          className="rounded-full bg-[#111417] text-white hover:bg-black px-4 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add deal</span>
        </Link>
      </div>

      {/* Center: Visual Horizontal Capsule Stage Bars & Vertical Milestone Marker */}
      <div className="my-5 relative">
        {/* Timeline Vertical Marker Line */}
        <div className="absolute right-16 sm:right-24 top-0 bottom-6 w-px bg-border/80 flex flex-col items-center z-10">
          <span className="h-2 w-2 rounded-full bg-foreground" />
          <div className="w-px flex-1 bg-dashed border-r border-dashed border-muted-foreground/40" />
        </div>

        {/* Capsule Bars Stack */}
        <div className="space-y-3.5 pr-20 sm:pr-28">
          {stages.map((stage) => (
            <div key={stage.name} className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                <span>{stage.name}</span>
                <span className="font-mono">{stage.percent}%</span>
              </div>
              <div className="relative h-8 rounded-full bg-muted/30 overflow-hidden flex items-center p-1 border border-border/40">
                <div
                  className="h-full rounded-full bg-primary/20 transition-all duration-500 flex items-center justify-end pr-1.5"
                  style={{ width: `${stage.percent}%` }}
                >
                  {/* Stacked Avatar Bubbles inside the bar */}
                  <div className="flex -space-x-1.5 items-center">
                    {stage.avatars.map((av, i) => (
                      <span
                        key={i}
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-extrabold text-white shadow-xs ${av.bg}`}
                      >
                        {av.initials}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Horizontal Day Axis */}
        <div className="mt-4 flex items-center justify-between text-[11px] font-semibold text-muted-foreground border-t border-border/40 pt-2">
          <span>Mon 12</span>
          <span>Tue 13</span>
          <span>Wed 14</span>
          <span className="text-foreground font-bold">Thu 15</span>
          <span>Fri 16</span>
        </div>
      </div>
    </div>
  );
}
