'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import {
  Bell,
  CalendarDays,
  Command,
  LogOut,
  Menu,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  User,
  CheckSquare,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ModeToggle } from '@/components/layout/mode-toggle';
import { useUnreadNotifications } from '@/hooks/use-unread-notifications';
import { useTotalUnread } from '@/hooks/use-total-unread';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Mission Control',
  '/inbox': 'Inbox',
  '/notifications': 'Notifications',
  '/contacts': 'Contacts',
  '/pipelines': 'Pipelines',
  '/broadcasts': 'Broadcasts',
  '/automations': 'Automations',
  '/settings': 'Settings',
  '/agents': 'AI Agents',
  '/flows': 'Flows',
};

const COMMAND_HINTS: Record<string, string[]> = {
  '/dashboard': ['Summarize inbox', 'Find hot leads', 'Generate report'],
  '/inbox': ['Translate conversations', 'Draft follow-up', 'Summarize thread'],
  '/contacts': ['Search contacts', 'Find unpaid customers', 'Tag warm leads'],
  '/pipelines': ['Move deals', 'Show stalled deals', 'Forecast revenue'],
  '/broadcasts': ['Create broadcast', 'Find best segment', 'Review delivery'],
  '/automations': ['Create automation', 'Audit workflow', 'Show failures'],
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  const match = Object.entries(pageTitles).find(([path]) =>
    pathname.startsWith(path)
  );
  return match ? match[1] : 'Mission Control';
}

interface HeaderProps {
  onOpenSidebar?: () => void;
}

export function Header({ onOpenSidebar }: HeaderProps) {
  const pathname = usePathname();
  const { profile, signOut, account } = useAuth();
  const unreadNotifications = useUnreadNotifications();
  const totalUnread = useTotalUnread();
  const title = getPageTitle(pathname);

  const initial =
    profile?.full_name?.charAt(0)?.toUpperCase() ??
    profile?.email?.charAt(0)?.toUpperCase() ??
    'U';

  const commandHint = useMemo(() => {
    const match = Object.entries(COMMAND_HINTS).find(([path]) =>
      pathname.startsWith(path)
    );
    const suggestions = match?.[1] ?? ['Find hot leads', 'Summarize inbox'];
    return suggestions.join('  ·  ');
  }, [pathname]);

  return (
    <header className="border-border/70 bg-background/65 sticky top-0 z-20 border-b backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label="Open menu"
            className="text-muted-foreground hover:bg-card-2 hover:text-foreground inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden min-w-0 md:block">
            <p className="text-muted-foreground truncate text-[11px] font-medium tracking-[0.22em] uppercase">
              {account?.name ?? 'Workspace'}
            </p>
            <h1 className="text-foreground truncate text-lg font-semibold">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 lg:gap-3">
          <button
            type="button"
            className="zovaix-premium-panel zovaix-premium-hover hidden min-w-0 flex-1 items-center gap-3 rounded-2xl px-4 py-2.5 text-left md:flex md:max-w-xl"
          >
            <Search className="text-muted-foreground h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-foreground truncate text-sm font-medium">
                Universal search
              </p>
              <p className="text-muted-foreground truncate text-xs">
                Contacts, deals, conversations, broadcasts
              </p>
            </div>
            <span className="border-border bg-card-2 text-muted-foreground hidden items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium lg:inline-flex">
              <Command className="h-3 w-3" />K
            </span>
          </button>

          <button
            type="button"
            className="zovaix-premium-panel zovaix-premium-hover hidden min-w-0 items-center gap-3 rounded-2xl px-4 py-2.5 text-left xl:flex xl:w-[22rem]"
          >
            <span className="bg-primary/12 text-primary inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-foreground truncate text-sm font-medium">
                AI command bar
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {commandHint}
              </p>
            </div>
          </button>

          <button
            type="button"
            className="zovaix-premium-panel zovaix-premium-hover text-muted-foreground hover:text-foreground relative inline-flex h-11 w-11 items-center justify-center rounded-2xl"
            aria-label="Tasks"
          >
            <CheckSquare className="h-4 w-4" />
            {totalUnread > 0 && (
              <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 inline-flex min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
          </button>

          <button
            type="button"
            className="zovaix-premium-panel zovaix-premium-hover text-muted-foreground hover:text-foreground hidden h-11 w-11 items-center justify-center rounded-2xl sm:inline-flex"
            aria-label="Calendar"
          >
            <CalendarDays className="h-4 w-4" />
          </button>

          <button
            type="button"
            className="zovaix-premium-panel zovaix-premium-hover text-muted-foreground hover:text-foreground relative inline-flex h-11 w-11 items-center justify-center rounded-2xl"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadNotifications > 0 && (
              <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 inline-flex min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </button>

          <ModeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger
              className="zovaix-premium-panel zovaix-premium-hover inline-flex items-center gap-2 rounded-2xl px-2 py-1.5 focus:outline-none"
              aria-label="Open account menu"
            >
              <Avatar className="size-8">
                {profile?.avatar_url ? (
                  <AvatarImage
                    src={profile.avatar_url}
                    alt={profile.full_name ?? 'Avatar'}
                  />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div className="hidden min-w-0 text-left sm:block">
                <p className="text-foreground truncate text-sm font-medium">
                  {profile?.full_name ?? 'User'}
                </p>
                <p className="text-muted-foreground truncate text-[11px]">
                  {account?.name ?? profile?.email ?? ''}
                </p>
              </div>
              <ChevronDown className="text-muted-foreground hidden h-4 w-4 sm:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="bg-popover text-popover-foreground ring-border min-w-60"
            >
              <div className="px-2 py-1.5">
                <p className="text-foreground truncate text-sm font-medium">
                  {profile?.full_name ?? 'User'}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {profile?.email ?? ''}
                </p>
              </div>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                render={
                  <Link
                    href="/settings?tab=profile"
                    className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                  />
                }
              >
                <User className="size-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                render={
                  <Link
                    href="/settings?tab=whatsapp"
                    className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                  />
                }
              >
                <SettingsIcon className="size-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={signOut}
                className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
              >
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
