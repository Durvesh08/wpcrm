'use client';

import { Clock } from 'lucide-react';

interface BentoTimeCardProps {
  totalHours?: number;
  label?: string;
}

export function BentoTimeCard({
  totalHours = 645,
  label = 'Total project time',
}: BentoTimeCardProps) {
  return (
    <div className="bento-card-olive p-5 sm:p-6 flex flex-col justify-between min-h-[140px] text-white">
      <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
          <Clock className="h-3.5 w-3.5 text-white" />
        </div>
        <span>{label}</span>
      </div>

      <div className="mt-3">
        <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          {totalHours}
          <span className="text-2xl font-normal text-white/80">h</span>
        </span>
      </div>
    </div>
  );
}
