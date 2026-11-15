'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { cn } from '@/lib/utils';
import {
  RAIL_GROUPS,
  SECTION_META,
  SETTINGS_SECTIONS,
  type SettingsSection,
} from './settings-sections';

// Width at/above which the rail is a vertical column (already in view, so
// no auto-scroll needed). Mirrors the Tailwind `lg:` breakpoint that
// drives the row→column switch in the markup below — keep the two in sync.
const RAIL_DESKTOP_MIN_PX = 1024;

/**
 * The settings left rail — grouped, vertical on desktop and a
 * horizontal scroller on narrow screens (mirrors the mockup's ≤920px
 * behaviour). The active item auto-scrolls into view when the rail is
 * horizontal so a deep-linked section is never off-screen.
 */
export function SettingsRail({
  active,
  onSelect,
  hints,
}: {
  active: SettingsSection;
  onSelect: (section: SettingsSection) => void;
  hints?: Partial<Record<SettingsSection, ReactNode>>;
}) {
  const activeRef = useRef<HTMLButtonElement>(null);

  // When horizontal (mobile), keep the active chip in view. On desktop
  // the rail is a static column, so skip.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia(`(min-width: ${RAIL_DESKTOP_MIN_PX}px)`).matches) return;
    activeRef.current?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: 'smooth',
    });
  }, [active]);

  return (
    <nav
      aria-label="Settings sections"
      className={cn(
        'flex gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        'border-b border-border/60',
        'lg:sticky lg:top-4 lg:flex-col lg:overflow-visible lg:border-b-0 lg:pb-0',
        'lg:rounded-[24px] lg:bg-card/65 lg:border lg:border-border/75 lg:p-3 lg:backdrop-blur-xl lg:shadow-xs',
      )}
    >
      {RAIL_GROUPS.map(({ label, group }) => {
        const items = SETTINGS_SECTIONS.filter(
          (s) => SECTION_META[s].group === group,
        );
        return (
          <div
            key={group}
            className="flex shrink-0 gap-1 lg:flex-col lg:gap-1"
          >
            {label ? (
              <div className="hidden px-3 pt-3 pb-1 text-[10px] font-mono font-black tracking-widest text-muted-foreground/70 uppercase lg:block">
                {label}
              </div>
            ) : null}
            {items.map((s) => {
              const meta = SECTION_META[s];
              const Icon = meta.icon;
              const isActive = s === active;
              return (
                <button
                  key={s}
                  ref={isActive ? activeRef : undefined}
                  type="button"
                  onClick={() => onSelect(s)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'group flex shrink-0 items-center gap-2.5 rounded-full px-3.5 py-2 text-left text-xs font-semibold whitespace-nowrap transition-all duration-150',
                    'lg:w-full lg:rounded-[14px] lg:px-3 lg:py-2.5',
                    isActive
                      ? 'bg-primary text-primary-foreground font-black shadow-[0_2px_12px_rgba(215,250,0,0.22)]'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-6.5 shrink-0 items-center justify-center rounded-[8px] transition-transform group-hover:scale-105',
                      isActive
                        ? 'bg-primary-foreground/15 text-primary-foreground'
                        : 'bg-muted/60 text-muted-foreground border border-border/50 group-hover:text-foreground group-hover:bg-muted',
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <span className="flex-1 truncate">{meta.label}</span>
                  {hints?.[s] != null ? (
                    <span
                      className={cn(
                        'hidden items-center gap-1.5 text-[11px] font-mono lg:inline-flex',
                        isActive
                          ? 'text-primary-foreground/80 font-bold'
                          : 'text-muted-foreground/70',
                      )}
                    >
                      {hints[s]}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
