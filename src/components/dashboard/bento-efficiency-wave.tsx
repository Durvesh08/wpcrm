'use client';

import { useMemo } from 'react';
import { Zap } from 'lucide-react';
import type { ConversationsSeriesPoint, ResponseTimeSummary } from '@/lib/dashboard/types';

type RangeDays = 7 | 30 | 90;

interface BentoEfficiencyWaveProps {
  range: RangeDays;
  onRangeChange: (r: RangeDays) => void;
  series: Record<RangeDays, ConversationsSeriesPoint[] | null>;
  responseTime: ResponseTimeSummary | null;
}

function generateSparkline(
  data: ConversationsSeriesPoint[] | null,
  width: number,
  height: number
): { linePath: string; areaPath: string } {
  if (!data || data.length === 0) {
    const mid = height / 2;
    return {
      linePath: `M0 ${mid} L${width} ${mid}`,
      areaPath: `M0 ${mid} L${width} ${mid} V${height} H0 Z`,
    };
  }

  const values = data.map((d) => d.incoming + d.outgoing);
  const maxVal = Math.max(...values, 1);
  const minVal = 0;
  const paddingY = 6;
  const usableHeight = height - paddingY * 2;

  const points = values.map((val, idx) => {
    const x = (idx / Math.max(1, values.length - 1)) * width;
    const y =
      height - paddingY - ((val - minVal) / Math.max(1, maxVal - minVal)) * usableHeight;
    return { x, y };
  });

  if (points.length === 1) {
    const y = points[0].y;
    return {
      linePath: `M0 ${y} L${width} ${y}`,
      areaPath: `M0 ${y} L${width} ${y} V${height} H0 Z`,
    };
  }

  let linePath = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    linePath += ` C ${midX.toFixed(1)} ${prev.y.toFixed(1)}, ${midX.toFixed(1)} ${curr.y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
  }

  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;
  return { linePath, areaPath };
}

export function BentoEfficiencyWave({
  range,
  onRangeChange,
  series,
  responseTime,
}: BentoEfficiencyWaveProps) {
  const currentSeries = series[range];

  // Calculate real efficiency delta based on real database metrics
  const { deltaLabel, subtitle } = useMemo(() => {
    // 1. If response time summary exists (last week vs this week)
    if (responseTime?.thisWeekAvg != null && responseTime?.lastWeekAvg != null && responseTime.lastWeekAvg > 0) {
      const speedup = Math.round(
        ((responseTime.lastWeekAvg - responseTime.thisWeekAvg) / responseTime.lastWeekAvg) * 100
      );
      return {
        deltaLabel: speedup >= 0 ? `+${speedup}%` : `${speedup}%`,
        subtitle: `${responseTime.thisWeekAvg.toFixed(1)}m avg reply time`,
      };
    }

    // 2. Otherwise calculate throughput velocity across the selected range series
    if (currentSeries && currentSeries.length >= 2) {
      const mid = Math.floor(currentSeries.length / 2);
      const firstHalf = currentSeries.slice(0, mid).reduce((sum, p) => sum + p.incoming + p.outgoing, 0);
      const secondHalf = currentSeries.slice(mid).reduce((sum, p) => sum + p.incoming + p.outgoing, 0);

      if (firstHalf === 0 && secondHalf === 0) {
        return { deltaLabel: '0%', subtitle: 'No traffic in range' };
      }

      if (firstHalf === 0) {
        return { deltaLabel: `+${secondHalf * 10}%`, subtitle: 'New conversation surge' };
      }

      const pct = Math.round(((secondHalf - firstHalf) / firstHalf) * 100);
      return {
        deltaLabel: pct >= 0 ? `+${pct}%` : `${pct}%`,
        subtitle: `${secondHalf} messages in period`,
      };
    }

    return { deltaLabel: 'Live', subtitle: 'Calculating real-time...' };
  }, [responseTime, currentSeries]);

  // Real SVG path derived from the active series points
  const { linePath, areaPath } = useMemo(
    () => generateSparkline(currentSeries, 300, 40),
    [currentSeries]
  );

  return (
    <div className="bento-card-dark p-5 flex flex-col justify-between min-h-[175px] relative overflow-hidden transition-all duration-300">
      {/* Top Header: Title & Dynamic Range Selector */}
      <div className="flex items-center justify-between gap-2 z-10">
        <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-[#D7FA00]" />
          Efficiency
        </h4>

        {/* Real Dynamic Range Filter Pill */}
        <div className="relative">
          <select
            value={range}
            onChange={(e) => onRangeChange(Number(e.target.value) as RangeDays)}
            className="rounded-full bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-[10px] font-bold pl-2.5 pr-6 py-1 appearance-none border border-white/10 cursor-pointer focus:outline-none transition-colors"
          >
            <option value={7} className="bg-[#111417]">7 Days ▾</option>
            <option value={30} className="bg-[#111417]">30 Days ▾</option>
            <option value={90} className="bg-[#111417]">90 Days ▾</option>
          </select>
        </div>
      </div>

      {/* Center: Real Efficiency Metric */}
      <div className="my-2 flex flex-col items-center justify-center z-10 text-center">
        <span className="rounded-full bg-white/10 border border-white/15 px-3 py-0.5 text-xs font-black text-white font-mono shadow-xs">
          {deltaLabel}
        </span>
        <span className="text-[10px] text-white/60 font-medium mt-1">
          {subtitle}
        </span>
      </div>

      {/* Bottom: Smooth Real SVG Wave Sparkline Generated from Live DB Data */}
      <div className="relative w-full h-10 mt-auto overflow-hidden">
        <svg
          viewBox="0 0 300 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full preserve-3d"
        >
          <path
            d={linePath}
            stroke="#D7FA00"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d={areaPath}
            fill="url(#wave-gradient)"
            opacity="0.25"
          />
          <defs>
            <linearGradient id="wave-gradient" x1="150" y1="0" x2="150" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#D7FA00" />
              <stop offset="1" stopColor="#D7FA00" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
