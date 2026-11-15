'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useTotalUnread } from '@/hooks/use-total-unread';
import { useUnreadNotifications } from '@/hooks/use-unread-notifications';
import {
  Bell,
  Bot,
  CalendarDays,
  ChevronRight,
  Crown,
  GitBranch,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Radio,
  Settings,
  Shield,
  User,
  UserCog,
  Users,
  UsersRound,
  Workflow,
  X,
  Zap,
} from 'lucide-react';
import type { AccountRole } from '@/lib/auth/roles';

// Per-role chip metadata used in the sidebar's account strip + the
// Members tab roster. Keeping this near both consumers in a single
// place avoids drift between the two surfaces — when a designer
// wants to recolour "agent" rows, this is the one diff.
const ROLE_CHIP: Record<
  AccountRole,
  { icon: typeof Crown; label: string; className: string }
> = {
  owner: {
    icon: Crown,
    label: 'Super Admin',
    // Acid lime & high-contrast: Super Admin indicator
    className: 'border-[#D7FA00]/60 bg-[#D7FA00]/20 text-[#D7FA00] font-bold shadow-xs',
  },
  admin: {
    icon: Shield,
    label: 'Admin',
    // Primary-tinted: significant but not as scarce as owner.
    className: 'border-primary/40 bg-primary/10 text-primary',
  },
  agent: {
    icon: UserCog,
    label: 'Agent',
    // Neutral slate: the operational default.
    className: 'border-border bg-muted text-foreground',
  },
  viewer: {
    icon: User,
    label: 'Viewer',
    // Muted slate: read-only role; visually quieter than agent.
    className: 'border-border bg-card text-muted-foreground',
  },
};
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  beta?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Core',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/inbox', label: 'Inbox', icon: MessageSquare },
      { href: '/pipelines', label: 'Pipelines', icon: GitBranch },
      { href: '/contacts', label: 'Contacts', icon: Users },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/calendar', label: 'Calendar & Tasks', icon: CalendarDays },
      { href: '/broadcasts', label: 'Broadcasts', icon: Radio },
      { href: '/automations', label: 'Automations', icon: Zap },
      { href: '/flows', label: 'Flows', icon: Workflow, beta: true },
    ],
  },
  {
    title: 'Intelligence & Settings',
    items: [
      { href: '/agents', label: 'AI Agents', icon: Bot },
      { href: '/notifications', label: 'Notifications', icon: Bell },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

interface SidebarProps {
  /** Controlled on mobile by the Header's hamburger button. Ignored on lg+. */
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { profile, profileLoading, account, accountRole, signOut } = useAuth();
  const totalUnread = useTotalUnread();
  const unreadNotifications = useUnreadNotifications();

  // Close the drawer when route changes — users opened it to navigate,
  // so once they pick a destination the drawer should get out of the way.
  useEffect(() => {
    onClose?.();
    // Only pathname drives this — onClose identity doesn't need to re-run it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Lock body scroll and allow Escape to close while the drawer is open on
  // mobile. No-ops on desktop because the sidebar isn't positioned there.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop — only exists on mobile and only when open. Clicking
          it closes the drawer. Hidden from lg+ since the sidebar is
          part of the main flex row there. */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className={cn(
          'bg-background/70 fixed inset-0 z-40 backdrop-blur-sm transition-opacity lg:hidden',
          open
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        )}
      />

      <aside
        className={cn(
          // Mobile: fixed drawer that slides in from the left.
          'border-border/50 bg-sidebar fixed inset-y-0 left-0 z-50 flex h-full w-72 flex-col border-r shadow-xl shadow-black/20 backdrop-blur-2xl',
          'transition-transform duration-200 ease-out will-change-transform',
          open ? 'translate-x-0' : '-translate-x-full',
          // Desktop: static, always visible — reset all the mobile framing.
          'lg:static lg:z-0 lg:w-72 lg:translate-x-0 lg:transition-none lg:shadow-none'
        )}
        aria-label="Primary"
      >
        {/* Logo row. On mobile we put a close button here; on desktop the
            close button is hidden since the sidebar is always-visible. */}
        <div className="border-border/50 flex shrink-0 items-center justify-between gap-2 border-b px-4 py-4 bg-sidebar/40">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
            <div className="border-primary/30 shadow-primary/25 relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-black shadow-lg transition-transform duration-300 hover:scale-[1.03]">
              <Image
                src="/zovaix-logo.png"
                alt=""
                fill
                sizes="44px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <span className="text-foreground block truncate text-sm font-black tracking-[0.18em]">
                ZOVAIX
              </span>
              <span className="text-muted-foreground block truncate text-[10px] font-medium tracking-[0.22em] uppercase">
                AI revenue workspace
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-9 w-9 items-center justify-center rounded-md lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="text-muted-foreground/80 mb-2 px-3 text-[11px] font-bold tracking-[0.2em] uppercase">
                {section.title}
              </p>
              <ul className="flex flex-col gap-1">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(item.href));

                  const showUnreadDot =
                    item.href === '/inbox' && totalUnread > 0;

                  const showNotificationBadge =
                    item.href === '/notifications' && unreadNotifications > 0;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'group flex items-center gap-3 rounded-[16px] px-3 py-2.5 text-sm font-semibold transition-all duration-200',
                          isActive
                            ? 'bg-[#D7FA00] text-[#0D120D] shadow-[0_4px_16px_rgba(215,250,0,0.22)] font-extrabold'
                            : 'text-muted-foreground hover:bg-card/70 hover:translate-x-1 hover:text-foreground'
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-[10px] transition-all shrink-0',
                            isActive
                              ? 'bg-[#0D120D] text-[#D7FA00] shadow-xs'
                              : 'bg-card/60 border border-border/60 text-muted-foreground group-hover:text-foreground group-hover:border-border shadow-2xs'
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                        </span>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.beta && (
                          <span
                            aria-label="Beta feature"
                            className={cn(
                              'rounded-full px-1.5 py-0.5 text-[9px] font-semibold tracking-wider uppercase',
                              isActive
                                ? 'bg-[#0D120D]/20 text-[#0D120D]'
                                : 'border border-amber-500/40 bg-amber-500/10 text-amber-300'
                            )}
                          >
                            Beta
                          </span>
                        )}
                        {showUnreadDot && (
                          <span
                            aria-label={`${totalUnread} unread conversation${totalUnread === 1 ? '' : 's'}`}
                            className={cn(
                              'flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums',
                              isActive
                                ? 'bg-[#0D120D] text-[#D7FA00]'
                                : 'bg-[#D7FA00] text-[#0D120D]'
                            )}
                          >
                            {totalUnread > 99 ? '99+' : totalUnread}
                          </span>
                        )}
                        {showNotificationBadge && (
                          <span
                            aria-label={`${unreadNotifications} unread notification${unreadNotifications === 1 ? '' : 's'}`}
                            className={cn(
                              'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums',
                              isActive
                                ? 'bg-[#0D120D] text-[#D7FA00]'
                                : 'bg-[#D7FA00] text-[#0D120D]'
                            )}
                          >
                            {unreadNotifications > 9 ? '9+' : unreadNotifications}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="border-border/70 bg-sidebar/50 shrink-0 border-t p-3 backdrop-blur-md space-y-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="border-border/80 bg-card/75 hover:bg-card focus:bg-card data-popup-open:bg-card flex w-full items-center gap-3 rounded-[18px] border p-2.5 text-left transition-all duration-200 hover:border-primary/40 shadow-xs focus:outline-none">
              <div className="relative size-8 shrink-0">
                <Avatar className="size-8 rounded-[10px]">
                  {profile?.avatar_url ? (
                    <AvatarImage
                      src={profile.avatar_url}
                      alt={profile.full_name ?? 'Avatar'}
                    />
                  ) : null}
                  <AvatarFallback className="bg-primary/20 text-primary text-xs font-mono font-black rounded-[10px]">
                    {profile?.full_name?.charAt(0)?.toUpperCase() ??
                      profile?.email?.charAt(0)?.toUpperCase() ??
                      'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background shadow-[0_0_6px_rgba(215,250,0,0.6)]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-foreground truncate text-xs sm:text-sm font-bold">
                    {profile?.full_name ?? 'User'}
                  </p>
                  {accountRole && (
                    <span
                      className={`inline-flex shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase ${ROLE_CHIP[accountRole].className}`}
                    >
                      {ROLE_CHIP[accountRole].label}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground truncate text-[11px] font-mono">
                  {profile?.email ?? ''}
                </p>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="top"
              sideOffset={6}
              className="bg-popover text-popover-foreground ring-border min-w-56"
            >
              <DropdownMenuItem
                render={
                  <Link
                    href="/settings?tab=profile"
                    onClick={onClose}
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
                    onClick={onClose}
                    className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                  />
                }
              >
                <Settings className="size-4" />
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
      </aside>
    </>
  );
}
