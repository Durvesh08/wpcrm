'use client';

import Link from 'next/link';
import { ArrowUpRight, Sparkles } from 'lucide-react';

export function BentoAiCard() {
  return (
    <div className="bento-card-gradient relative overflow-hidden p-5 sm:p-6 flex flex-col justify-between min-h-[160px] cursor-pointer group">
      {/* Top action button circle */}
      <div className="flex items-center justify-between z-10">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0D120D] text-[#D7FA00] shadow-sm transition-transform group-hover:scale-110">
          <ArrowUpRight className="h-4 w-4" />
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-black/10 px-2.5 py-0.5 text-[10px] font-bold text-[#0D120D]">
          <Sparkles className="h-2.5 w-2.5" /> 2.0 Pro
        </span>
      </div>

      {/* Title */}
      <div className="mt-4 z-10 max-w-[150px]">
        <h3 className="text-lg font-extrabold text-[#0D120D] leading-tight">
          AI Smart Assistant
        </h3>
        <p className="text-[11px] font-semibold text-[#0D120D]/70 mt-0.5">
          Ask CRM copilot
        </p>
      </div>

      {/* 3D Sphere Orb Visual (CSS 3D illusion matching photo) */}
      <div className="pointer-events-none absolute -bottom-6 -right-6 h-36 w-36 rounded-full shadow-2xl transition-transform duration-500 group-hover:scale-105"
        style={{
          background: 'radial-gradient(circle at 35% 35%, #F5C6A5 0%, #D88B67 45%, #8C472E 100%)',
          boxShadow: 'inset -6px -6px 16px rgba(0,0,0,0.4), inset 6px 6px 12px rgba(255,255,255,0.6), 0 16px 32px rgba(0,0,0,0.25)',
        }}
      />
    </div>
  );
}
