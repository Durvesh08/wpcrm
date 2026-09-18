'use client';

import Link from 'next/link';
import { UserPlus, BriefcaseBusiness, RadioTower, WandSparkles } from 'lucide-react';
import type { ComponentType } from 'react';

// Quick-action shortcuts. Each navigates to the page that owns the
// relevant "create" flow. We deliberately don't try to auto-open any
// modal on the target page — that'd require touching those pages,
// which is out of scope here.
interface Action {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  gradient: string;
  shadow: string;
}

const ACTIONS: Action[] = [
  {
    label: 'New Contact',
    href: '/contacts',
    icon: UserPlus,
    gradient: 'from-emerald-400 via-teal-400 to-cyan-500',
    shadow: 'shadow-emerald-500/25',
  },
  {
    label: 'New Deal',
    href: '/pipelines',
    icon: BriefcaseBusiness,
    gradient: 'from-blue-400 via-indigo-500 to-violet-600',
    shadow: 'shadow-blue-500/25',
  },
  {
    label: 'New Broadcast',
    href: '/broadcasts/new',
    icon: RadioTower,
    gradient: 'from-amber-400 via-orange-400 to-amber-600',
    shadow: 'shadow-amber-500/25',
  },
  {
    label: 'New Automation',
    href: '/automations/new',
    icon: WandSparkles,
    gradient: 'from-violet-400 via-purple-500 to-fuchsia-500',
    shadow: 'shadow-purple-500/25',
  },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {ACTIONS.map((a) => {
        const Icon = a.icon;
        return (
          <Link
            key={a.href}
            href={a.href}
            className="zovaix-glass-panel zovaix-premium-hover group flex items-center gap-3 rounded-[22px] p-3.5 sm:p-4 transition-all duration-200"
          >
            <div
              className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${a.gradient} text-white shadow-lg ${a.shadow} transition-transform duration-200 group-hover:scale-105`}
            >
              <Icon className="h-5 w-5 stroke-[2.25]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-foreground truncate text-xs sm:text-sm font-semibold tracking-tight">{a.label}</p>
              <p className="text-muted-foreground hidden sm:block truncate text-xs mt-0.5">
                Launch workflow
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
