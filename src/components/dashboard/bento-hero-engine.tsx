'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, Sparkles, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import type { Profile, Account } from '@/types';
import type { MetricsBundle } from '@/lib/dashboard/types';

interface BentoHeroEngineProps {
  profile: { full_name?: string | null; email?: string | null; avatar_url?: string | null } | null;
  account: { id?: string; name?: string | null } | null;
  metrics: MetricsBundle | null;
  roleLabel: string;
}

export function BentoHeroEngine({
  profile,
  account,
  metrics,
  roleLabel,
}: BentoHeroEngineProps) {
  const [selectedReport, setSelectedReport] = useState('/pipelines');

  const fullName = profile?.full_name || 'Revenue Lead';
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'WP';

  // Deal goal progress (dynamic based on real open deals)
  const openDealsCount = metrics?.openDealsCount ?? 0;
  const targetProgress = openDealsCount > 0 ? Math.min(100, Math.max(10, openDealsCount * 12)) : 0;

  return (
    <div className="bento-card-lime p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden min-h-[340px] group transition-all duration-300">
      {/* Top Header: User Profile Capsule & Floating Actions */}
      <div className="flex items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E57A61] text-sm font-extrabold text-white shadow-sm border border-black/10">
            {initials}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-[#0D120D] leading-tight truncate">
              {fullName}
            </h4>
            <p className="text-[11px] font-semibold text-[#0D120D]/70 tracking-tight">
              {roleLabel} • {account?.name ?? 'Workspace'}
            </p>
          </div>
        </div>

        {/* Floating circular icon action buttons */}
        <div className="flex items-center gap-2">
          <Link
            href="/notifications"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 hover:bg-white text-[#0D120D] shadow-xs transition-transform active:scale-95"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
          </Link>
          <Link
            href="/settings"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 hover:bg-white text-[#0D120D] shadow-xs transition-transform active:scale-95 text-xs font-bold"
            title="Settings & System Info"
          >
            ⓘ
          </Link>
        </div>
      </div>

      {/* Center Display: Big Bold Workspace Title & Status */}
      <div className="my-5 z-10">
        <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold tracking-[-0.03em] text-[#0D120D] leading-tight">
          {account?.name ? `${account.name} Metrics` : 'ZOVAIX Metrics'}
        </h1>
        <p className="text-xs font-semibold text-[#0D120D]/75 mt-1 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#0D120D] animate-pulse" />
          WhatsApp Engine: Active • SLA &lt; 2m
        </p>

        {/* Minimalist Progress Track & Percentage */}
        <div className="mt-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-[#0D120D]">
            <span>Pipeline progress</span>
            <span className="font-mono">{targetProgress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-black/15 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#0D120D] transition-all duration-700 ease-out"
              style={{ width: `${targetProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Row: Pill Dropdown Selector & Floating Action Arrow */}
      <div className="flex items-center gap-2 z-10 pt-2">
        <div className="relative flex-1">
          <select
            value={selectedReport}
            onChange={(e) => setSelectedReport(e.target.value)}
            className="w-full h-11 rounded-full bg-white/85 hover:bg-white text-[#0D120D] text-xs font-semibold pl-4 pr-9 appearance-none border border-black/5 shadow-xs cursor-pointer focus:outline-none transition-colors"
          >
            <option value="Revenue Overview">📄 Revenue Overview</option>
            <option value="WhatsApp Conversations">💬 WhatsApp Conversations</option>
            <option value="Lead Conversion Funnel">📊 Lead Conversion Funnel</option>
            <option value="Response SLA Breakdown">⚡ Response SLA Breakdown</option>
          </select>
          <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#0D120D]/60 text-xs">
            ▼
          </div>
        </div>

        <Link
          href="/inbox"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0D120D] text-[#D7FA00] hover:bg-black shadow-sm transition-transform active:scale-95"
          title="Jump to Conversations"
        >
          <ArrowUpRight className="h-5 w-5" />
        </Link>
      </div>

      {/* Ambient background watermark accent */}
      <div className="pointer-events-none absolute -right-6 -bottom-6 h-44 w-44 rounded-full bg-white/20 blur-2xl" />
    </div>
  );
}
