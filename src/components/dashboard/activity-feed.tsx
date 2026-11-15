"use client"

import Link from 'next/link'
import { useState } from 'react'
import {
  MessageSquare,
  UserPlus,
  Briefcase,
  Radio,
  Zap,
  Inbox,
  Activity,
} from 'lucide-react'
import type { ComponentType } from 'react'
import type { ActivityItem, ActivityKind } from '@/lib/dashboard/types'
import { cn } from '@/lib/utils'
import { EmptyState } from './empty-state'
import { Skeleton } from './skeleton'

interface ActivityFeedProps {
  items: ActivityItem[] | null
  loading: boolean
}

const PAGE_SIZES = [5, 10, 20, 50] as const
type PageSize = (typeof PAGE_SIZES)[number]

interface KindTheme {
  icon: ComponentType<{ className?: string }>
  badge: string
}

const KIND_THEME: Record<ActivityKind, KindTheme> = {
  message: { icon: MessageSquare, badge: 'bg-sky-500/15 text-sky-400 border border-sky-500/25' },
  contact: { icon: UserPlus, badge: 'bg-primary/15 text-primary border border-primary/25' },
  deal: { icon: Briefcase, badge: 'bg-violet-500/15 text-violet-400 border border-violet-500/25' },
  broadcast: { icon: Radio, badge: 'bg-amber-400/15 text-amber-300 border border-amber-400/25' },
  automation: { icon: Zap, badge: 'bg-rose-500/15 text-rose-400 border border-rose-500/25' },
}

export function ActivityFeed({ items, loading }: ActivityFeedProps) {
  const [pageSize, setPageSize] = useState<PageSize>(5)

  const totalLoaded = items?.length ?? 0
  const visible = items?.slice(0, pageSize) ?? []
  const isSizeUseful = (size: PageSize, i: number) =>
    i === 0 || totalLoaded > PAGE_SIZES[i - 1]

  return (
    <section className="relative overflow-hidden rounded-[26px] bg-card/75 border border-border/80 backdrop-blur-xl shadow-xs">
      <header className="flex items-center justify-between border-b border-border/70 px-5 sm:px-6 py-4 bg-muted/20">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-primary/15 text-primary border border-primary/25">
            <Activity className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-bold text-foreground">
            Recent Activity
          </h2>
        </div>
        <Link
          href="/inbox"
          className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-background/60 px-3 py-1 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-card transition-all"
        >
          View all →
        </Link>
      </header>

      {loading || !items ? (
        <div className="space-y-2.5 p-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-[14px]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={Inbox}
            title="No activity yet"
            hint="Activity from messages, deals, broadcasts, and automations will appear here."
          />
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border/60">
            {visible.map((it) => {
              const theme = KIND_THEME[it.kind]
              const Icon = theme.icon
              const row = (
                <div className="flex items-center gap-3.5 px-5 sm:px-6 py-3 transition-colors hover:bg-muted/30">
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]',
                      theme.badge,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs sm:text-sm font-semibold text-foreground">
                    {it.text}
                  </span>
                  <span className="shrink-0 rounded-full bg-muted/60 px-2.5 py-0.5 text-[11px] font-mono text-muted-foreground">
                    {relativeTime(it.at)}
                  </span>
                </div>
              )
              return (
                <li key={it.id}>
                  {it.href ? (
                    <Link href={it.href} className="block">
                      {row}
                    </Link>
                  ) : (
                    row
                  )}
                </li>
              )
            })}
          </ul>
          <footer className="flex items-center justify-between border-t border-border/70 px-5 sm:px-6 py-3 text-xs bg-muted/15">
            <span className="font-mono text-muted-foreground">
              Showing {visible.length} of {totalLoaded}
              {totalLoaded === 50 ? '+' : ''}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="mr-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                Show
              </span>
              {PAGE_SIZES.map((size, i) => {
                const disabled = !isSizeUseful(size, i)
                const isActive = pageSize === size
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setPageSize(size)}
                    disabled={disabled}
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-mono font-bold transition-all',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted-foreground',
                    )}
                  >
                    {size}
                  </button>
                )
              })}
            </div>
          </footer>
        </>
      )}
    </section>
  )
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diffSec = Math.round((Date.now() - then) / 1000)
  if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 2_592_000) return `${Math.floor(diffSec / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}
