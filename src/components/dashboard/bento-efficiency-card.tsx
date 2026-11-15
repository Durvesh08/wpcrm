'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface BentoEfficiencyCardProps {
  growthRate?: string;
}

export function BentoEfficiencyCard({ growthRate = '+40%' }: BentoEfficiencyCardProps) {
  const [selectedMonth, setSelectedMonth] = useState('November');

  return (
    <div className="bento-card-dark relative overflow-hidden p-5 sm:p-6 flex flex-col justify-between min-h-[175px]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 z-10">
        <h3 className="text-base font-bold text-white tracking-tight">Efficiency</h3>

        <div className="relative">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="appearance-none rounded-full bg-white/10 hover:bg-white/15 px-3 py-1 text-[11px] font-semibold text-white/90 outline-none cursor-pointer pr-6 transition-colors"
          >
            <option value="November" className="text-black">
              November
            </option>
            <option value="December" className="text-black">
              December
            </option>
            <option value="January" className="text-black">
              January
            </option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/60" />
        </div>
      </div>

      {/* Center Growth Pill Badge */}
      <div className="my-2 flex justify-center z-10">
        <span className="inline-flex items-center rounded-full bg-white text-[#0D120D] px-3.5 py-1 text-xs font-extrabold shadow-sm">
          {growthRate}
        </span>
      </div>

      {/* Glowing Lime Waveform Graphic at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none overflow-hidden">
        <svg
          viewBox="0 0 300 60"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="limeGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D7FA00" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#D7FA00" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Filled Area */}
          <path
            d="M0,45 Q35,20 75,40 T150,25 T225,45 T300,20 L300,60 L0,60 Z"
            fill="url(#limeGlow)"
          />
          {/* Glowing Stroke Curve */}
          <path
            d="M0,45 Q35,20 75,40 T150,25 T225,45 T300,20"
            fill="none"
            stroke="#D7FA00"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}
