'use client';

import { useState } from 'react';
import { Zap } from 'lucide-react';

interface BentoEfficiencyWaveProps {
  efficiencyDelta?: string;
}

export function BentoEfficiencyWave({
  efficiencyDelta = '+40%',
}: BentoEfficiencyWaveProps) {
  const [selectedRange, setSelectedRange] = useState('This Month');

  return (
    <div className="bento-card-dark p-5 flex flex-col justify-between min-h-[175px] relative overflow-hidden transition-all duration-300">
      {/* Top Header: Title & Dropdown Pill */}
      <div className="flex items-center justify-between gap-2 z-10">
        <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-[#D7FA00]" />
          Efficiency
        </h4>

        <div className="relative">
          <select
            value={selectedRange}
            onChange={(e) => setSelectedRange(e.target.value)}
            className="rounded-full bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-[10px] font-semibold pl-2.5 pr-6 py-1 appearance-none border border-white/10 cursor-pointer focus:outline-none transition-colors"
          >
            <option value="This Month" className="bg-[#111417]">This Month ▾</option>
            <option value="Last 30 Days" className="bg-[#111417]">Last 30 Days ▾</option>
            <option value="All Time" className="bg-[#111417]">All Time ▾</option>
          </select>
        </div>
      </div>

      {/* Center: Efficiency Delta Pill */}
      <div className="my-2 flex items-center justify-center z-10">
        <span className="rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-extrabold text-white font-mono shadow-xs">
          {efficiencyDelta}
        </span>
      </div>

      {/* Bottom: Smooth Neon Wave Sparkline SVG */}
      <div className="relative w-full h-10 mt-auto overflow-hidden">
        <svg
          viewBox="0 0 300 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full preserve-3d"
        >
          <path
            d="M0 32C30 32 45 15 75 15C105 15 120 35 150 35C180 35 195 20 225 20C255 20 270 30 300 30"
            stroke="#D7FA00"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M0 32C30 32 45 15 75 15C105 15 120 35 150 35C180 35 195 20 225 20C255 20 270 30 300 30V40H0V32Z"
            fill="url(#wave-gradient)"
            opacity="0.25"
          />
          <defs>
            <linearGradient id="wave-gradient" x1="150" y1="15" x2="150" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#D7FA00" />
              <stop offset="1" stopColor="#D7FA00" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
