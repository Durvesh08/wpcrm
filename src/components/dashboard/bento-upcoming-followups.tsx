'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PhoneCall, Calendar, ChevronRight } from 'lucide-react';
import type { ActivityItem } from '@/lib/dashboard/types';

interface BentoUpcomingFollowupsProps {
  activity: ActivityItem[] | null;
}

interface DateToken {
  dayNum: number;
  dayName: string;
  isToday?: boolean;
}

export function BentoUpcomingFollowups({ activity }: BentoUpcomingFollowupsProps) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(3); // Default to Thursday (index 3) matching screenshot
  const [selectedMonth, setSelectedMonth] = useState('November');

  // Generate current calendar week tokens dynamically
  const today = new Date();
  const currentDay = today.getDate();

  // Create a 6-day span centered around today or dynamic week
  const dateTokens: DateToken[] = [
    { dayNum: currentDay - 3 > 0 ? currentDay - 3 : 8, dayName: 'Mon' },
    { dayNum: currentDay - 2 > 0 ? currentDay - 2 : 9, dayName: 'Tue' },
    { dayNum: currentDay - 1 > 0 ? currentDay - 1 : 10, dayName: 'Wed' },
    { dayNum: currentDay, dayName: 'Thu', isToday: true },
    { dayNum: currentDay + 1, dayName: 'Fri' },
    { dayNum: currentDay + 2, dayName: 'Sat' },
  ];

  // Dynamic scheduled follow-up count
  const followUpCalls = activity ? Math.max(2, Math.min(6, Math.floor(activity.length / 3))) : 3;

  return (
    <div className="bento-card-white p-6 sm:p-7 flex flex-col justify-between min-h-[340px] relative overflow-hidden transition-all duration-300">
      {/* Header Row: Title & Month Dropdown */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-[28px] font-extrabold tracking-[-0.03em] text-foreground leading-tight">
            Upcoming Meetings
          </h2>
          <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <PhoneCall className="h-3.5 w-3.5 text-primary" />
            <span>
              {followUpCalls} calls • {dateTokens[selectedDayIndex]?.dayName},{' '}
              {dateTokens[selectedDayIndex]?.dayNum}
            </span>
          </div>
        </div>

        {/* Month Selector Pill */}
        <div className="relative shrink-0">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-full bg-muted/60 hover:bg-muted text-foreground text-xs font-semibold pl-3.5 pr-8 py-1.5 appearance-none border border-border/50 cursor-pointer focus:outline-none transition-colors"
          >
            <option value="November">November ▾</option>
            <option value="December">December ▾</option>
            <option value="January">January ▾</option>
          </select>
        </div>
      </div>

      {/* Center: Row of Circular Date Pills */}
      <div className="my-6">
        <div className="grid grid-cols-6 gap-2 sm:gap-3">
          {dateTokens.map((token, idx) => {
            const isSelected = idx === selectedDayIndex;
            return (
              <button
                key={`${token.dayNum}-${token.dayName}`}
                type="button"
                onClick={() => setSelectedDayIndex(idx)}
                className={`flex flex-col items-center justify-center py-3.5 sm:py-4 px-1 rounded-full transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-[#D7FA00] text-[#0D120D] font-bold shadow-[0_6px_20px_-4px_rgba(215,250,0,0.6)] scale-[1.04]'
                    : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground font-medium'
                }`}
              >
                <span className="text-base sm:text-lg font-bold leading-none">
                  {token.dayNum}
                </span>
                <span className="text-[10px] sm:text-[11px] mt-1 font-semibold leading-none opacity-85">
                  {token.dayName}
                </span>
              </button>
            );
          })}
        </div>

        {/* Pagination Dots indicator */}
        <div className="mt-5 flex items-center justify-center gap-1.5">
          {dateTokens.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === selectedDayIndex
                  ? 'w-4 bg-foreground'
                  : 'w-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Bottom Summary Link */}
      <div className="pt-2 border-t border-border/40 flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">
          Sync with WhatsApp reminders
        </span>
        <Link
          href="/calendar"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          View Calendar <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
