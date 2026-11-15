'use client';

import { Clock, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

interface BentoVolumeCardProps {
  pipelineValue?: number;
  currency?: string;
}

export function BentoVolumeCard({
  pipelineValue = 0,
  currency = 'INR',
}: BentoVolumeCardProps) {
  return (
    <div className="bento-card-olive p-5.5 flex flex-col justify-between min-h-[155px] relative overflow-hidden transition-all duration-300">
      {/* Top Header: Circular Icon Badge & Label */}
      <div className="flex items-center gap-2.5 z-10">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
          <Clock className="h-3.5 w-3.5" />
        </div>
        <span className="text-xs font-semibold text-white/80">
          Total pipeline value
        </span>
      </div>

      {/* Center: Massive Bold Stat */}
      <div className="my-2 z-10">
        <h3 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.03em] text-white font-mono leading-none">
          {formatCurrency(pipelineValue, currency)}
        </h3>
        <p className="text-[11px] font-semibold text-white/70 mt-1 flex items-center gap-1">
          <TrendingUp className="h-3 w-3 text-[#D7FA00]" />
          <span>Active deal volume in pipeline</span>
        </p>
      </div>

      {/* Ambient background blur */}
      <div className="pointer-events-none absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-white/10 blur-xl" />
    </div>
  );
}
