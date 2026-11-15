'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Phone, ChevronDown, Calendar, ArrowRight } from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';

interface MeetingItem {
  id: string;
  contactName: string;
  time: string;
  type: string;
}

interface BentoMeetingsCardProps {
  upcomingCount?: number;
}

export function BentoMeetingsCard({ upcomingCount = 3 }: BentoMeetingsCardProps) {
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(3); // Default to Thu
  const [selectedMonth, setSelectedMonth] = useState('November');

  // Generate 6 days starting from current week Monday
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday

  const days = Array.from({ length: 6 }).map((_, index) => {
    const d = addDays(weekStart, index);
    return {
      dateNumber: format(d, 'd'),
      dayName: format(d, 'EEE'),
      fullDate: d,
      offset: index,
    };
  });

  const activeDay = days[selectedDayOffset] || days[0];

  return (
    <div className="bento-card-white p-6 sm:p-7 flex flex-col justify-between min-h-[300px]">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
            Upcoming Meetings
          </h2>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Phone className="h-3.5 w-3.5 text-emerald-500" />
            <span>
              {upcomingCount} calls • {activeDay.dayName}, {activeDay.dateNumber}
            </span>
          </div>
        </div>

        {/* Month Selector Pill */}
        <div className="relative">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="appearance-none rounded-full bg-muted/60 hover:bg-muted px-3.5 py-1.5 text-xs font-semibold text-foreground outline-none cursor-pointer pr-7 transition-colors"
          >
            <option value="September">September</option>
            <option value="October">October</option>
            <option value="November">November</option>
            <option value="December">December</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        </div>
      </div>

      {/* Center: Horizontal Interactive Date Pill Tokens */}
      <div className="my-5 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-none">
        <div className="flex items-center justify-between gap-2 min-w-[340px]">
          {days.map((day) => {
            const isSelected = selectedDayOffset === day.offset;
            return (
              <button
                key={day.offset}
                type="button"
                onClick={() => setSelectedDayOffset(day.offset)}
                className={`bento-date-token group transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bento-date-token-active scale-105'
                    : 'bg-muted/40 hover:bg-muted text-foreground'
                }`}
              >
                <span className="text-base font-bold">{day.dateNumber}</span>
                <span
                  className={`text-[10px] font-medium ${
                    isSelected ? 'text-[#0D120D]/80 font-bold' : 'text-muted-foreground'
                  }`}
                >
                  {day.dayName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom: Pagination Indicator Dots & Quick Link */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3, 4].map((dotIndex) => (
            <div
              key={dotIndex}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                dotIndex === selectedDayOffset
                  ? 'w-4 bg-foreground'
                  : 'w-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        <Link
          href="/calendar"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <span>Open Calendar</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
