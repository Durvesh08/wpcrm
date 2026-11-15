'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';

interface RoadmapStage {
  id: string;
  name: string;
  percentage: number;
  highlight?: boolean;
  avatars: { initials: string; bg: string }[];
  offsetPercent: number; // For milestone positioning
}

export function BentoRoadmapCard() {
  const stages: RoadmapStage[] = [
    {
      id: '1',
      name: 'New Leads',
      percentage: 100,
      offsetPercent: 10,
      avatars: [{ initials: 'AM', bg: 'bg-[#E47B62]' }],
    },
    {
      id: '2',
      name: 'Qualified Demo',
      percentage: 59,
      offsetPercent: 32,
      avatars: [
        { initials: 'RJ', bg: 'bg-[#5B7BE8]' },
        { initials: 'TK', bg: 'bg-[#3E5284]' },
      ],
    },
    {
      id: '3',
      name: 'Negotiation',
      percentage: 75,
      highlight: true,
      offsetPercent: 18,
      avatars: [
        { initials: 'AM', bg: 'bg-[#E47B62]' },
        { initials: 'SD', bg: 'bg-[#5B7BE8]' },
        { initials: 'LN', bg: 'bg-[#2E3C2B]' },
      ],
    },
  ];

  return (
    <div className="bento-card-white p-6 sm:p-7 flex flex-col justify-between min-h-[300px]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
          Project Roadmap
        </h2>

        <Link
          href="/pipelines"
          className="inline-flex items-center gap-1.5 rounded-full bg-[#0D120D] text-[#D7FA00] hover:bg-black px-4 py-2 text-xs font-bold transition-transform active:scale-95 shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add task</span>
        </Link>
      </div>

      {/* Stage Capsules with Timeline */}
      <div className="relative my-6 space-y-4">
        {/* Vertical Milestone Marker Line (at ~65% width, e.g. Thu 15) */}
        <div className="pointer-events-none absolute bottom-0 top-0 left-[68%] w-px border-l-2 border-dashed border-muted-foreground/30 flex flex-col items-center">
          <div className="h-2.5 w-2.5 rounded-full bg-foreground -translate-y-1.5" />
        </div>

        {stages.map((stage) => {
          return (
            <div
              key={stage.id}
              className="relative flex items-center"
              style={{ paddingLeft: `${stage.offsetPercent}%` }}
            >
              <div
                className={`inline-flex items-center gap-2.5 rounded-full px-4 py-1.5 shadow-sm transition-transform hover:scale-[1.02] ${
                  stage.highlight
                    ? 'bg-[#D7FA00] text-[#0D120D] font-bold'
                    : 'bg-muted/60 text-foreground font-semibold'
                }`}
              >
                <span className="text-xs">{stage.name}</span>
                <span className="text-xs font-bold opacity-80">{stage.percentage}%</span>

                {/* Avatar Circles Stack */}
                <div className="flex items-center -space-x-1.5">
                  {stage.avatars.map((av, idx) => (
                    <div
                      key={idx}
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white border border-background shadow-xs ${av.bg}`}
                    >
                      {av.initials}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Timeline Axis */}
      <div className="flex items-center justify-between border-t border-border/40 pt-3 text-[11px] font-medium text-muted-foreground">
        <span>Mon 12</span>
        <span>Tue 13</span>
        <span>Wed 14</span>
        <span className="font-bold text-foreground">Thu 15</span>
        <span>Fri 16</span>
      </div>
    </div>
  );
}
