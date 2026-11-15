'use client';

import Link from 'next/link';
import { UserPlus, BriefcaseBusiness, RadioTower, WandSparkles, ArrowUpRight } from 'lucide-react';
import type { ComponentType } from 'react';

interface Action {
  label: string;
  sublabel: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
}

const ACTIONS: Action[] = [
  {
    label: 'New Contact',
    sublabel: 'Customer CRM',
    href: '/contacts',
    icon: UserPlus,
    tone: 'bg-primary/15 border border-primary/25 text-primary',
  },
  {
    label: 'New Deal',
    sublabel: 'Sales Pipeline',
    href: '/pipelines',
    icon: BriefcaseBusiness,
    tone: 'bg-sky-500/15 border border-sky-500/25 text-sky-400',
  },
  {
    label: 'New Broadcast',
    sublabel: 'Bulk Outreach',
    href: '/broadcasts/new',
    icon: RadioTower,
    tone: 'bg-amber-400/15 border border-amber-400/25 text-amber-300',
  },
  {
    label: 'New Automation',
    sublabel: 'Trigger & Action',
    href: '/automations/new',
    icon: WandSparkles,
    tone: 'bg-violet-500/15 border border-violet-500/25 text-violet-400',
  },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {ACTIONS.map((a) => {
        const Icon = a.icon;
        return (
          <Link
            key={a.href}
            href={a.href}
            className="group relative flex items-center justify-between overflow-hidden rounded-[22px] bg-card/75 border border-border/80 backdrop-blur-xl p-4 shadow-xs transition-all duration-200 hover:border-primary/40 hover:shadow-md hover:scale-[1.01]"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${a.tone} transition-transform duration-200 group-hover:scale-105`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                  {a.label}
                </p>
                <p className="truncate text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-muted-foreground mt-0.5">
                  {a.sublabel}
                </p>
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 transition-all duration-200 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0 ml-1" />
          </Link>
        );
      })}
    </div>
  );
}
