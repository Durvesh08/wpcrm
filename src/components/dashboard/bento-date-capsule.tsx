'use client';

export function BentoDateCapsule() {
  const today = new Date();
  const dayNumber = today.getDate();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'short' });
  const monthName = today.toLocaleDateString('en-US', { month: 'long' });

  return (
    <div className="bento-card-white p-4.5 flex items-center gap-3.5 rounded-[24px] shadow-sm transition-all hover:scale-[1.02]">
      {/* High-contrast Black Circle Day Badge */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#111417] text-white font-extrabold text-lg shadow-sm">
        {dayNumber}
      </div>

      {/* Date Copy */}
      <div className="min-w-0">
        <h4 className="text-sm font-bold text-foreground leading-tight">
          {dayName},
        </h4>
        <p className="text-xs font-semibold text-muted-foreground leading-tight">
          {monthName}
        </p>
      </div>
    </div>
  );
}
