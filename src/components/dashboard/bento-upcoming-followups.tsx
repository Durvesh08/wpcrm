'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PhoneCall, Calendar, ChevronRight, Video, Clock3, Plus } from 'lucide-react';
import { format } from 'date-fns';

export interface UpcomingReminderItem {
  id: string;
  contact_id?: string;
  kind: 'call' | 'meeting' | 'whatsapp' | 'follow_up' | 'note';
  title: string;
  due_at: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  contacts?: {
    name: string | null;
    phone: string;
  } | null;
}

interface BentoUpcomingFollowupsProps {
  initialReminders?: UpcomingReminderItem[] | null;
}

export function BentoUpcomingFollowups({ initialReminders }: BentoUpcomingFollowupsProps) {
  const [reminders, setReminders] = useState<UpcomingReminderItem[] | null>(initialReminders ?? null);
  const [loading, setLoading] = useState(!initialReminders);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0); // 0 = Today

  useEffect(() => {
    let cancelled = false;
    async function fetchReminders() {
      try {
        const res = await fetch('/api/reminders');
        const json = await res.json().catch(() => null);
        if (!cancelled && res.ok && Array.isArray(json?.reminders)) {
          setReminders(json.reminders);
        }
      } catch (err) {
        console.error('[bento-followups] Failed to fetch reminders:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (!initialReminders) {
      void fetchReminders();
    }
    return () => {
      cancelled = true;
    };
  }, [initialReminders]);

  // Current real calendar week (6 days starting from today)
  const dateTokens = useMemo(() => {
    const base = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const dayKey = d.toISOString().split('T')[0];
      return {
        date: d,
        dayNum: d.getDate(),
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        monthName: d.toLocaleDateString('en-US', { month: 'long' }),
        isToday: i === 0,
        dayKey,
      };
    });
  }, []);

  // Filter ONLY valid upcoming future reminders (strictly due_at >= now, never old/past calls)
  const upcomingReminders = useMemo(() => {
    const now = Date.now();
    return (reminders ?? []).filter((r) => {
      const isScheduled = r.status === 'scheduled';
      const isFuture = new Date(r.due_at).getTime() >= now;
      return isScheduled && isFuture;
    });
  }, [reminders]);

  const selectedDay = dateTokens[selectedDayIndex] ?? dateTokens[0];

  // Real scheduled calls/meetings for the selected date
  const callsForSelectedDate = useMemo(() => {
    return upcomingReminders.filter((r) => {
      const rKey = new Date(r.due_at).toISOString().split('T')[0];
      return rKey === selectedDay.dayKey;
    });
  }, [upcomingReminders, selectedDay]);

  const count = callsForSelectedDate.length;

  return (
    <div className="bento-card-white p-6 sm:p-7 flex flex-col justify-between min-h-[340px] relative overflow-hidden transition-all duration-300">
      {/* Header Row: Title & Month */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-[28px] font-extrabold tracking-[-0.03em] text-foreground leading-tight">
            Upcoming Meetings
          </h2>
          <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <PhoneCall className="h-3.5 w-3.5 text-primary" />
            <span>
              {count === 0
                ? `0 calls scheduled • ${selectedDay.dayName}, ${selectedDay.dayNum}`
                : `${count} call${count === 1 ? '' : 's'} scheduled • ${selectedDay.dayName}, ${selectedDay.dayNum}`}
            </span>
          </div>
        </div>

        {/* Real Current Month Pill */}
        <div className="shrink-0 rounded-full bg-muted/60 px-3.5 py-1.5 text-xs font-bold text-foreground border border-border/50">
          {selectedDay.monthName}
        </div>
      </div>

      {/* Center: Row of 6 Dynamic Date Pills */}
      <div className="my-5">
        <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
          {dateTokens.map((token, idx) => {
            const isSelected = idx === selectedDayIndex;
            // Check if this date has any real scheduled calls
            const hasCallsOnDay = upcomingReminders.some(
              (r) => new Date(r.due_at).toISOString().split('T')[0] === token.dayKey
            );

            return (
              <button
                key={token.dayKey}
                type="button"
                onClick={() => setSelectedDayIndex(idx)}
                className={`relative flex flex-col items-center justify-center py-3.5 sm:py-4 px-1 rounded-full transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-[#D7FA00] text-[#0D120D] font-bold shadow-[0_6px_20px_-4px_rgba(215,250,0,0.6)] scale-[1.04]'
                    : 'bg-slate-100/90 hover:bg-slate-200/90 dark:bg-muted/40 text-slate-700 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-foreground font-medium'
                }`}
              >
                <span className="text-base sm:text-lg font-bold leading-none">
                  {token.dayNum}
                </span>
                <span className="text-[10px] sm:text-[11px] mt-1 font-semibold leading-none opacity-85">
                  {token.dayName}
                </span>
                {hasCallsOnDay && !isSelected && (
                  <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>

        {/* Dynamic Day Schedule Details (Real Data Only) */}
        <div className="mt-4">
          {loading ? (
            <div className="py-4 text-center text-xs text-muted-foreground animate-pulse">
              Checking scheduled meetings...
            </div>
          ) : callsForSelectedDate.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 p-3.5 text-center bg-muted/15 flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">
                No calls scheduled for {selectedDay.dayName}, {selectedDay.dayNum}.
              </span>
              <Link
                href="/calendar"
                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline shrink-0"
              >
                <Plus className="h-3 w-3" /> Book Call
              </Link>
            </div>
          ) : (
            <div className="space-y-2 max-h-24 overflow-y-auto">
              {callsForSelectedDate.slice(0, 2).map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-border/70 bg-card/80 p-2.5 flex items-center justify-between text-xs shadow-xs"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      {item.kind === 'meeting' ? (
                        <Video className="h-3 w-3" />
                      ) : (
                        <PhoneCall className="h-3 w-3" />
                      )}
                    </span>
                    <div className="truncate">
                      <span className="font-bold text-foreground block truncate">
                        {item.contacts?.name || item.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(item.due_at), 'h:mm a')}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/calendar`}
                    className="text-[11px] font-bold text-primary shrink-0 hover:underline"
                  >
                    Details →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Summary Link */}
      <div className="pt-2 border-t border-border/40 flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">
          {upcomingReminders.length} total upcoming across calendar
        </span>
        <Link
          href="/calendar"
          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
        >
          View Full Calendar <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
