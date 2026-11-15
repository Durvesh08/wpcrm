'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, Info, ArrowUpRight, ChevronDown, Send } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface BentoHeroMetricsProps {
  progress?: number;
  totalDealsValue?: number;
}

export function BentoHeroMetrics({
  progress = 68,
  totalDealsValue = 0,
}: BentoHeroMetricsProps) {
  const { profile, account, isOwner, isAdmin } = useAuth();
  const [selectedReport, setSelectedReport] = useState('Monthly Revenue');

  const fullName = profile?.full_name || 'Alesha Hyacinth';
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const roleLabel = isOwner
    ? 'Super Admin'
    : isAdmin
    ? 'Team Admin'
    : 'Project Manager';

  return (
    <div className="bento-card-lime relative overflow-hidden p-6 sm:p-7 flex flex-col justify-between min-h-[300px]">
      {/* Top Header: User Profile Pill & Action Circles */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E47B62] text-sm font-bold text-white shadow-sm border border-black/10">
            {initials}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#0D120D] leading-tight truncate">
              {fullName}
            </h3>
            <p className="text-xs font-medium text-[#0D120D]/70">{roleLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/notifications"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/10 hover:bg-black/15 text-[#0D120D] transition-colors"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
          </Link>
          <Link
            href="/settings"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/10 hover:bg-black/15 text-[#0D120D] transition-colors"
            title="Settings"
          >
            <Info className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Main Metric & Brand Title */}
      <div className="my-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0D120D] leading-tight">
          {account?.name || 'Sundrel Metrics'}
        </h1>
        <p className="mt-1 text-sm font-medium text-[#0D120D]/75">
          Industry: WhatsApp Sales & SaaS
        </p>

        {/* Project Progress Pill Bar */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#0D120D]">
            <span>Monthly Target Progress</span>
            <span className="font-bold">{progress}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/15">
            <div
              className="h-full rounded-full bg-[#0D120D] transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Controls: Select a report pill & Action pill */}
      <div className="flex items-center gap-2 pt-2">
        <div className="relative flex-1">
          <select
            value={selectedReport}
            onChange={(e) => setSelectedReport(e.target.value)}
            className="w-full appearance-none rounded-full bg-black/10 hover:bg-black/15 px-4 py-2.5 text-xs font-semibold text-[#0D120D] outline-none transition-colors cursor-pointer pr-8"
          >
            <option value="Monthly Revenue">Monthly Revenue Report</option>
            <option value="Conversion Rates">Lead Conversion Report</option>
            <option value="Chat Response Time">Response SLA Report</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#0D120D]/70" />
        </div>

        <Link
          href="/pipelines"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0D120D] hover:bg-black text-[#D7FA00] transition-transform active:scale-95 shadow-sm"
          title="Open Pipelines"
        >
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
