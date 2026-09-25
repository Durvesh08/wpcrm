'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  MessageSquare,
  Users,
  LayoutDashboard,
  CalendarDays,
  MoreHorizontal,
  Bot,
  Zap,
  Radio,
  GitBranch,
  Settings,
  Bell,
  X,
  Workflow,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTotalUnread } from '@/hooks/use-total-unread';
import { useUnreadNotifications } from '@/hooks/use-unread-notifications';

interface NavTab {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: number;
}

const MORE_LINKS = [
  { href: '/pipelines', label: 'Pipelines', icon: GitBranch, desc: 'Track deal stages & revenue' },
  { href: '/broadcasts', label: 'Broadcasts', icon: Radio, desc: 'Targeted bulk WhatsApp campaigns' },
  { href: '/automations', label: 'Automations', icon: Zap, desc: 'Trigger auto-replies & workflows' },
  { href: '/agents', label: 'AI Agents', icon: Bot, desc: 'Manage copilot & autonomous agents' },
  { href: '/flows', label: 'Flows', icon: Workflow, desc: 'Interactive chat funnel builders' },
  { href: '/notifications', label: 'Notifications', icon: Bell, desc: 'Alerts and updates' },
  { href: '/settings', label: 'Settings', icon: Settings, desc: 'Account, WhatsApp & preferences' },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const unreadMessages = useTotalUnread();
  const unreadAlerts = useUnreadNotifications();
  const [moreOpen, setMoreOpen] = useState(false);

  const searchParams = useSearchParams();

  // In conversation view (/inbox?c=... or thread active on mobile), hide the bottom nav
  // so the mobile chat keyboard/composer has full vertical height.
  const isDeepInboxChat = pathname === '/inbox' && searchParams.has('c');

  if (isDeepInboxChat) {
    return null;
  }

  const primaryTabs: NavTab[] = [
    {
      href: '/inbox',
      label: 'Inbox',
      icon: MessageSquare,
      badge: unreadMessages > 0 ? unreadMessages : undefined,
    },
    {
      href: '/contacts',
      label: 'Contacts',
      icon: Users,
    },
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      href: '/calendar',
      label: 'Calendar',
      icon: CalendarDays,
    },
  ];

  const isMoreActive = MORE_LINKS.some((item) => pathname.startsWith(item.href));

  return (
    <>
      {/* Mobile Glass Bottom Nav */}
      <nav
        aria-label="Mobile Navigation"
        className="zovaix-bottom-nav fixed bottom-3 left-3 right-3 z-30 flex h-16 items-center justify-around rounded-2xl px-2 lg:hidden"
        style={{
          paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
        }}
      >
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            pathname === tab.href ||
            (tab.href !== '/dashboard' && pathname.startsWith(tab.href));

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'zovaix-touch-press relative flex flex-1 flex-col items-center justify-center py-1 transition-all',
                isActive
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="relative">
                <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.25]')} />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="bg-primary text-primary-foreground absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className="mt-1 text-[10px] tracking-tight">{tab.label}</span>
              {isActive && (
                <span className="bg-primary zovaix-pill-glow absolute -bottom-1 h-1 w-6 rounded-full" />
              )}
            </Link>
          );
        })}

        {/* More Tab Trigger */}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(
            'zovaix-touch-press relative flex flex-1 flex-col items-center justify-center py-1 transition-all',
            isMoreActive || moreOpen
              ? 'text-primary font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <div className="relative">
            <MoreHorizontal className="h-5 w-5" />
            {unreadAlerts > 0 && (
              <span className="bg-destructive absolute -top-1 -right-1 h-2 w-2 rounded-full" />
            )}
          </div>
          <span className="mt-1 text-[10px] tracking-tight">More</span>
          {isMoreActive && (
            <span className="bg-primary zovaix-pill-glow absolute -bottom-1 h-1 w-6 rounded-full" />
          )}
        </button>
      </nav>

      {/* "More" Drawer / Bottom Sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm lg:hidden">
          <div
            className="fixed inset-0"
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
          />
          <div className="zovaix-glass-card relative z-10 max-h-[85vh] overflow-y-auto rounded-t-[28px] p-5 pb-10 shadow-2xl">
            {/* Grab Handle */}
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />

            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-foreground text-base font-semibold">Workspace Navigation</h3>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="text-muted-foreground hover:text-foreground inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted/60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {MORE_LINKS.map((link) => {
                const Icon = link.icon;
                const isActive = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'zovaix-touch-press flex items-center gap-3.5 rounded-2xl border p-3 transition-colors',
                      isActive
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border/60 bg-card/40 text-foreground hover:bg-card-2'
                    )}
                  >
                    <div className={cn(
                      'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                      isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{link.label}</p>
                      <p className="text-muted-foreground truncate text-xs">{link.desc}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
