"use client";

import type { Deal, PipelineStage } from "@/types";
import { Calendar, Check, X, Flame } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { useAuth } from "@/hooks/use-auth";
import { formatContactIdentifier } from "@/lib/auth/phone-mask";

interface DealCardProps {
  deal: Deal;
  stage: PipelineStage | null;
  onEdit: (deal: Deal) => void;
  isOverlay?: boolean;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initials(name?: string, fallback?: string) {
  const source = (name || fallback || "?").trim();
  if (!source) return "?";
  return source.charAt(0).toUpperCase();
}

export function DealCard({ deal, stage, onEdit, isOverlay }: DealCardProps) {
  const { canViewRawPhoneNumbers } = useAuth();
  const contactLabel = deal.contact
    ? formatContactIdentifier(deal.contact.name, deal.contact.phone, canViewRawPhoneNumbers)
    : "No contact";
  
  // eslint-disable-next-line
  const daysIdle = deal.updated_at ? Math.floor((Date.now() - new Date(deal.updated_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const isRotting = daysIdle > 7; // Rotting threshold: 7 days

  const assigneeLabel = deal.assignee?.full_name || null;

  return (
    <button
      type="button"
      onClick={(e) => {
        if (isOverlay) return;
        e.stopPropagation();
        onEdit(deal);
      }}
      className={`group relative w-full cursor-pointer rounded-[18px] border pl-4 pr-3.5 py-3 text-left shadow-xs transition-all duration-200 ${
        isRotting
          ? 'border-rose-500/30 bg-rose-500/10'
          : 'border-border/80 bg-card/90 hover:bg-card hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5'
      } ${
        isOverlay
          ? "shadow-2xl ring-2 ring-primary/60 scale-102"
          : ""
      }`}
    >
      {/* Colored stage indicator */}
      <span
        aria-hidden
        className="absolute left-0 top-0 h-full w-1.5 rounded-l-[18px]"
        style={{ backgroundColor: stage?.color ?? "#94a3b8" }}
      />

      <div className="flex items-start justify-between gap-2">
        <h4 suppressHydrationWarning className="flex-1 text-sm font-bold leading-snug text-foreground break-words group-hover:text-primary transition-colors flex items-start justify-between gap-1">
          <span>{deal.title}</span>
          {isRotting && (
            <span className="flex items-center gap-1 text-[10px] text-rose-500 font-bold px-1.5 py-0.5 bg-rose-500/20 rounded-md shrink-0" title={`Idle for ${daysIdle} days`}>
              <Flame className="h-3 w-3" /> {daysIdle}d
            </span>
          )}
        </h4>
        {deal.status === "won" && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
            <Check className="h-3 w-3" />
            Won
          </span>
        )}
        {deal.status === "lost" && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-400">
            <X className="h-3 w-3" />
            Lost
          </span>
        )}
      </div>

      {/* Contact row */}
      <div className="mt-2 flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[7px] bg-muted text-[10px] font-extrabold text-foreground border border-border/60">
          {initials(deal.contact?.name, deal.contact?.phone)}
        </span>
        <span className="truncate text-xs text-muted-foreground font-medium">{contactLabel}</span>
      </div>

      <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between gap-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded-[8px] text-xs font-mono font-extrabold bg-primary/15 text-primary border border-primary/25 shadow-2xs">
          {formatCurrency(deal.value, deal.currency)}
        </span>
        <div className="flex items-center gap-2">
          {deal.expected_close_date && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
              <Calendar className="h-3 w-3 text-primary/70" />
              {formatDate(deal.expected_close_date)}
            </span>
          )}
          {assigneeLabel && (
            <span
              title={assigneeLabel}
              className="flex h-5 w-5 items-center justify-center rounded-[7px] bg-primary/20 text-[10px] font-bold text-primary border border-primary/30"
            >
              {initials(assigneeLabel)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
