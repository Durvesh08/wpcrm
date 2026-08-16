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
  tint: string;
}

const ACTIONS: Action[] = [
  {
    label: 'New Contact',
    href: '/contacts',
    icon: UserPlus,
    tint: 'text-primary',
  },
  {
    label: 'New Deal',
    href: '/pipelines',
    icon: BriefcaseBusiness,
    tint: 'text-blue-400',
  },
  {
    label: 'New Broadcast',
    href: '/broadcasts/new',
    icon: RadioTower,
    tint: 'text-amber-400',
  },
  {
    label: 'New Automation',
    href: '/automations/new',
    icon: WandSparkles,
    tint: 'text-primary',
  },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {ACTIONS.map((a) => {
        const Icon = a.icon;
        return (
          <Link
            key={a.href}
            href={a.href}
            className="zovaix-glass-panel zovaix-premium-hover group flex items-center gap-3 rounded-[22px] px-4 py-4"
          >
            <div
              className={`zovaix-icon-tile flex h-10 w-10 items-center justify-center rounded-xl text-primary-foreground ${a.tint}`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-foreground text-sm font-medium">{a.label}</p>
              <p className="text-muted-foreground text-xs">
                Launch this workflow
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
