import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  /** Pre-formatted value for display (e.g. "42" or "$1,250"). */
  value: string;
  icon: ComponentType<{ className?: string }>;
  /**
   * Delta-mode secondary row: arrow + delta text. Omit when the metric
   * doesn't have a sensible comparison (e.g. total pipeline value).
   */
  delta?: {
    /** Positive / negative / zero drives arrow + color. */
    sign: number;
    /** Pre-formatted delta, e.g. "+3 vs yesterday". */
    label: string;
  };
  /** Used instead of `delta` when the metric has a static subtitle. */
  subtitle?: string;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  delta,
  subtitle,
}: MetricCardProps) {
  return (
    <div className="bento-card-white relative flex flex-col justify-between overflow-hidden p-5 sm:p-6 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg">
      <div>
        <div className="flex items-start justify-between gap-2">
          <p className="text-muted-foreground text-xs sm:text-sm font-semibold tracking-tight">
            {title}
          </p>
          <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary shadow-xs">
            <Icon className="h-4.5 w-4.5" />
          </div>
        </div>
        <p className="text-foreground relative z-10 mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums">
          {value}
        </p>
      </div>
      {delta ? (
        <DeltaRow sign={delta.sign} label={delta.label} />
      ) : subtitle ? (
        <p className="text-muted-foreground relative z-10 mt-3 text-xs sm:text-sm font-medium">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function DeltaRow({ sign, label }: { sign: number; label: string }) {
  const tone =
    sign > 0
      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold'
      : sign < 0
        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold'
        : 'bg-muted text-muted-foreground font-medium';
  const Arrow = sign > 0 ? ArrowUp : sign < 0 ? ArrowDown : Minus;
  return (
    <div className="relative z-10 mt-3 flex items-center">
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs tabular-nums',
          tone
        )}
      >
        <Arrow className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden />
        <span>{label}</span>
      </span>
    </div>
  );
}
