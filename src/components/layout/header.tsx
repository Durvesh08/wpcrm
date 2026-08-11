'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { toast } from 'sonner';
import {
  ArrowRight,
  Bell,
  Bot,
  CalendarDays,
  Command,
  Contact,
  FileText,
  Flame,
  GitBranch,
  LogOut,
  Loader2,
  Megaphone,
  Menu,
  MessageSquare,
  Route,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  Star,
  Tags,
  User,
  CheckSquare,
  ChevronDown,
  Zap,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ModeToggle } from '@/components/layout/mode-toggle';
import { useUnreadNotifications } from '@/hooks/use-unread-notifications';
import { useTotalUnread } from '@/hooks/use-total-unread';
import { cn } from '@/lib/utils';

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
  '/calendar': 'Calendar',
};

type CopilotSuggestion = {
  id: string;
  label: string;
  context: string;
  href: string;
};

function CopilotBrief({ content }: { content: string }) {
  return (
    <div className="space-y-3">
      {content.split('\n').filter(Boolean).map((line, index) => {
        const value = line.replace(/\*\*/g, '').trim();
        if (value.startsWith('## ')) {
          return <p key={`${value}-${index}`} className="border-border/70 border-t pt-3 text-[11px] font-semibold tracking-[0.15em] text-primary uppercase">{value.slice(3)}</p>;
        }
        if (value.startsWith('# ')) {
          return <h3 key={`${value}-${index}`} className="text-base font-semibold text-foreground">{value.slice(2)}</h3>;
        }
        return <p key={`${value}-${index}`} className="text-sm leading-6 text-muted-foreground">{value.replace(/^[-*]\s*/, '')}</p>;
      })}
    </div>
  );
}

const COPILOT_SUGGESTIONS: Record<string, CopilotSuggestion[]> = {
  '/dashboard': [
    {
      id: 'daily_briefing',
      label: 'Generate daily briefing',
      context: 'Priorities, risks, and revenue moves',
      href: '/dashboard',
    },
    {
      id: 'blocked_work',
      label: 'Highlight blocked work',
      context: 'Find conversations and deals needing action',
      href: '/dashboard',
    },
    {
      id: 'weekly_report',
      label: 'Create weekly report',
      context: 'Turn CRM activity into an owner update',
      href: '/dashboard',
    },
  ],
  '/inbox': [
    {
      id: 'summarize_unread',
      label: 'Summarize unread',
      context: 'Condense waiting conversations',
      href: '/inbox',
    },
    {
      id: 'translate_messages',
      label: 'Translate messages',
      context: 'Detect language and prepare replies',
      href: '/inbox',
    },
    {
      id: 'buying_signals',
      label: 'Find buying signals',
      context: 'Spot intent across recent chats',
      href: '/inbox',
    },
  ],
  '/contacts': [
    {
      id: 'inactive_customers',
      label: 'Find inactive customers',
      context: 'Create a reactivation segment',
      href: '/contacts',
    },
    {
      id: 'generate_tags',
      label: 'Generate tags',
      context: 'Cluster contacts by behavior',
      href: '/contacts',
    },
    {
      id: 'group_contacts',
      label: 'Group contacts',
      context: 'Prepare a focused broadcast audience',
      href: '/contacts',
    },
  ],
  '/pipelines': [
    {
      id: 'stalled_deals',
      label: 'Review stalled deals',
      context: 'Show deals without movement',
      href: '/pipelines',
    },
    {
      id: 'forecast_revenue',
      label: 'Forecast revenue',
      context: 'Estimate likely close value',
      href: '/pipelines',
    },
    {
      id: 'predict_close_rate',
      label: 'Predict close rate',
      context: 'Score active opportunities',
      href: '/pipelines',
    },
  ],
  '/broadcasts': [
    {
      id: 'best_segment',
      label: 'Find best segment',
      context: 'Choose the audience most likely to reply',
      href: '/broadcasts/new',
    },
    {
      id: 'draft_campaign',
      label: 'Draft campaign',
      context: 'Generate a concise WhatsApp broadcast',
      href: '/broadcasts/new',
    },
    {
      id: 'review_delivery',
      label: 'Review delivery',
      context: 'Spot low-performing sends',
      href: '/broadcasts',
    },
  ],
  '/automations': [
    {
      id: 'create_automation',
      label: 'Create automation',
      context: 'Turn repeated follow-up into a flow',
      href: '/automations/new',
    },
    {
      id: 'audit_workflow',
      label: 'Audit workflow',
      context: 'Find broken or slow automations',
      href: '/automations',
    },
    {
      id: 'today_priorities',
      label: 'Review today’s priorities',
      context: 'Suggest the next system action',
      href: '/automations',
    },
  ],
};

const SEARCH_ITEMS: Array<{
  label: string;
  type: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  hint: string;
  favorite?: boolean;
}> = [
  {
    label: 'Inbox conversations',
    type: 'Messages',
    href: '/inbox',
    icon: MessageSquare,
    hint: 'Search chats, replies, labels, and pinned threads',
    favorite: true,
  },
  {
    label: 'Contacts',
    type: 'Contacts',
    href: '/contacts',
    icon: Contact,
    hint: 'Find people by name, phone, tag, or company',
    favorite: true,
  },
  {
    label: 'Deals pipeline',
    type: 'Deals',
    href: '/pipelines',
    icon: GitBranch,
    hint: 'Open deals, stages, blockers, and revenue',
    favorite: true,
  },
  {
    label: 'Broadcasts',
    type: 'Campaigns',
    href: '/broadcasts',
    icon: Megaphone,
    hint: 'Campaigns, segments, templates, delivery',
  },
  {
    label: 'Automations',
    type: 'Commands',
    href: '/automations',
    icon: Zap,
    hint: 'Create, audit, and monitor workflows',
  },
  {
    label: 'Flows',
    type: 'Flows',
    href: '/flows',
    icon: Route,
    hint: 'WhatsApp flows and customer paths',
  },
  {
    label: 'Templates',
    type: 'Settings',
    href: '/settings?tab=templates',
    icon: FileText,
    hint: 'Approved templates and submission status',
  },
  {
    label: 'Tags and fields',
    type: 'Settings',
    href: '/settings?tab=fields',
    icon: Tags,
    hint: 'Contact organization and custom data',
  },
  {
    label: 'AI Agents',
    type: 'AI Commands',
    href: '/agents',
    icon: Bot,
    hint: 'Provider, knowledge base, and playground',
  },
  {
    label: 'WhatsApp settings',
    type: 'Settings',
    href: '/settings?tab=whatsapp',
    icon: SettingsIcon,
    hint: 'Meta credentials, webhooks, and API status',
  },
];

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
  const router = useRouter();
  const { profile, signOut, account } = useAuth();
  const unreadNotifications = useUnreadNotifications();
  const totalUnread = useTotalUnread();
  const title = getPageTitle(pathname);
  const [searchOpen, setSearchOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [copilotLoadingId, setCopilotLoadingId] = useState<string | null>(null);
  const [copilotResult, setCopilotResult] = useState<{
    title: string;
    content: string;
    href: string;
  } | null>(null);

  const initial =
    profile?.full_name?.charAt(0)?.toUpperCase() ??
    profile?.email?.charAt(0)?.toUpperCase() ??
    'U';

  const copilotSuggestions = useMemo(() => {
    const match = Object.entries(COPILOT_SUGGESTIONS).find(([path]) =>
      pathname.startsWith(path)
    );
    return match?.[1] ?? COPILOT_SUGGESTIONS['/dashboard'];
  }, [pathname]);

  const filteredSearchItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return SEARCH_ITEMS;
    return SEARCH_ITEMS.filter((item) =>
      `${item.label} ${item.type} ${item.hint}`
        .toLowerCase()
        .includes(normalized)
    );
  }, [query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const runCopilot = async (item: CopilotSuggestion) => {
    if (copilotLoadingId) return;
    setCopilotLoadingId(item.id);
    setCopilotResult(null);

    try {
      const response = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: item.id, pathname }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (data.code === 'ai_not_configured') {
          setCopilotOpen(false);
          router.push('/agents');
        }
        throw new Error(data.error ?? 'Copilot could not complete that task.');
      }

      setCopilotResult({
        title: item.label,
        content:
          typeof data.result === 'string' && data.result.trim()
            ? data.result
            : 'The Copilot did not return a usable result. Please try again.',
        href: item.href,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Copilot could not complete that task.';
      toast.error(message);
    } finally {
      setCopilotLoadingId(null);
    }
  };

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
            <h1 className="text-foreground truncate text-lg font-semibold">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 lg:gap-3">
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger
              className="zovaix-premium-panel zovaix-premium-hover focus:ring-primary/30 hidden min-w-0 flex-1 items-center gap-3 rounded-2xl px-4 py-2.5 text-left focus:ring-2 focus:outline-none md:flex md:max-w-xl"
              aria-label="Open command center"
            >
              <Search className="text-muted-foreground h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-foreground truncate text-sm font-medium">
                  Command center
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  Search CRM data, commands, settings, and recent work
                </p>
              </div>
              <span className="border-border bg-card-2 text-muted-foreground hidden items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium lg:inline-flex">
                <Command className="h-3 w-3" />K
              </span>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={10}
              className="border-border/80 bg-popover/98 w-[min(42rem,calc(100vw-2rem))] gap-0 overflow-hidden rounded-2xl border p-0 shadow-2xl shadow-black/20 backdrop-blur-xl"
            >
              <div className="border-border/70 flex items-center gap-3 border-b px-4 py-3">
                <Search className="text-muted-foreground h-4 w-4" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search contacts, deals, messages, commands..."
                  className="placeholder:text-muted-foreground text-foreground h-9 flex-1 bg-transparent text-sm outline-none"
                  autoFocus
                />
                <span className="border-border bg-card-2 text-muted-foreground rounded-lg border px-2 py-1 text-[11px]">
                  Esc
                </span>
              </div>
              <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_15rem]">
                <div className="max-h-[26rem] overflow-y-auto p-2">
                  {filteredSearchItems.slice(0, 8).map((item) => (
                    <CommandResult
                      key={`${item.type}-${item.label}`}
                      item={item}
                      onSelect={() => setSearchOpen(false)}
                    />
                  ))}
                </div>
                <div className="border-border/70 bg-card/35 hidden border-l p-3 md:block">
                  <p className="text-muted-foreground px-2 text-[11px] font-medium tracking-[0.2em] uppercase">
                    Favorites
                  </p>
                  <div className="mt-2 space-y-1">
                    {SEARCH_ITEMS.filter((item) => item.favorite).map(
                      (item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setSearchOpen(false)}
                          className="hover:bg-muted/70 flex items-center gap-2 rounded-xl px-2 py-2 text-xs"
                        >
                          <Star className="text-primary h-3.5 w-3.5" />
                          <span className="text-foreground truncate">
                            {item.label}
                          </span>
                        </Link>
                      )
                    )}
                  </div>
                  <div className="border-border/70 mt-3 border-t pt-3">
                    <p className="text-muted-foreground px-2 text-[11px] font-medium tracking-[0.2em] uppercase">
                      Recent
                    </p>
                    <div className="text-muted-foreground mt-2 space-y-1 px-2 text-xs">
                      <p>Open conversations</p>
                      <p>Warm leads</p>
                      <p>WhatsApp settings</p>
                    </div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Popover
            open={copilotOpen}
            onOpenChange={(open) => {
              setCopilotOpen(open);
              if (!open) setCopilotResult(null);
            }}
          >
            <PopoverTrigger
              className="zovaix-premium-panel zovaix-premium-hover focus:ring-primary/30 hidden min-w-0 items-center gap-3 rounded-2xl px-4 py-2.5 text-left focus:ring-2 focus:outline-none xl:flex xl:w-[23rem]"
              aria-label="Open AI copilot"
            >
              <span className="bg-primary/12 text-primary inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-foreground truncate text-sm font-medium">
                  AI Copilot
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {copilotSuggestions.map((item) => item.label).join(' · ')}
                </p>
              </div>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={10}
              className="border-primary/15 bg-popover/98 shadow-primary/10 w-[min(34rem,calc(100vw-2rem))] gap-0 overflow-hidden rounded-2xl border p-0 shadow-2xl backdrop-blur-xl"
            >
              <div className="border-border/70 border-b p-4">
                <div className="flex items-center gap-3">
                  <span className="bg-primary/12 text-primary inline-flex h-10 w-10 items-center justify-center rounded-2xl">
                    <Bot className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-foreground text-sm font-semibold">
                      AI Copilot
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Page-aware suggestions for {title}
                    </p>
                  </div>
                </div>
              </div>
              {copilotResult ? (
                <div className="max-h-[34rem] overflow-y-auto p-4">
                  <div className="border-primary/20 bg-primary/6 rounded-xl border p-4">
                    <div className="mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><p className="text-sm font-semibold text-foreground">{copilotResult.title}</p></div>
                    <CopilotBrief content={copilotResult.content} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setCopilotResult(null)}
                      className="text-muted-foreground hover:text-foreground text-sm font-medium"
                    >
                      Run another
                    </button>
                    <Link
                      href={copilotResult.href}
                      onClick={() => setCopilotOpen(false)}
                      className="bg-primary text-primary-foreground hover:bg-primary-hover inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
                    >
                      Open workspace <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {copilotSuggestions.map((item, index) => {
                    const isLoading = copilotLoadingId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={copilotLoadingId !== null}
                        onClick={() => void runCopilot(item)}
                        className={cn(
                          'group hover:bg-muted/70 flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors disabled:cursor-wait disabled:opacity-70',
                          index === 0 && 'bg-primary/8'
                        )}
                      >
                        <span className="bg-card-2 text-primary border-border/70 mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border">
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : index === 0 ? (
                            <Flame className="h-4 w-4" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="text-foreground block text-sm font-medium">
                            {item.label}
                          </span>
                          <span className="text-muted-foreground mt-0.5 block text-xs leading-5">
                            {isLoading
                              ? 'Analyzing your workspace…'
                              : item.context}
                          </span>
                        </span>
                        {!isLoading && (
                          <ArrowRight className="text-muted-foreground mt-2 h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </PopoverContent>
          </Popover>

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

          <Link
            href="/calendar"
            className="zovaix-premium-panel zovaix-premium-hover text-muted-foreground hover:text-foreground hidden h-11 w-11 items-center justify-center rounded-2xl sm:inline-flex"
            aria-label="Calendar"
          >
            <CalendarDays className="h-4 w-4" />
          </Link>

          <Link
            href="/notifications"
            className="zovaix-premium-panel zovaix-premium-hover text-muted-foreground hover:text-foreground relative inline-flex h-11 w-11 items-center justify-center rounded-2xl"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadNotifications > 0 && (
              <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 inline-flex min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </Link>

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

function CommandResult({
  item,
  onSelect,
}: {
  item: (typeof SEARCH_ITEMS)[number];
  onSelect: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onSelect}
      className="group hover:bg-muted/70 focus:bg-muted/70 flex items-center gap-3 rounded-xl px-3 py-3 transition-colors focus:outline-none"
    >
      <span className="bg-card-2 text-primary border-border/70 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-foreground truncate text-sm font-medium">
            {item.label}
          </span>
          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-medium">
            {item.type}
          </span>
        </span>
        <span className="text-muted-foreground mt-0.5 block truncate text-xs">
          {item.hint}
        </span>
      </span>
      <ArrowRight className="text-muted-foreground h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}
