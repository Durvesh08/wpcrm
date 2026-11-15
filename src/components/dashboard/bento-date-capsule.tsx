'use client';

import { format } from 'date-fns';

export function BentoDateCapsule() {
  const today = new Date();
  const dayNumber = format(today, 'd');
  const dayName = format(today, 'EEE');
  const monthName = format(today, 'MMMM');

  return (
    <div className="bento-card-white p-3.5 sm:p-4 flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#111417] text-sm font-extrabold text-white shadow-xs">
        {dayNumber}
      </div>
      <div className="min-w-0">
        <h4 className="text-xs font-bold text-foreground leading-tight">
          {dayName},
        </h4>
        <p className="text-xs font-medium text-muted-foreground">{monthName}</p>
      </div>
    </div>
  );
}
