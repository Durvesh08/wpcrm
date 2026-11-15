'use client';

import Link from 'next/link';
import { ArrowUpRight, Sparkles } from 'lucide-react';

export function BentoAiAssistant() {
  return (
    <Link
      href="/agents"
      className="bento-card-gradient p-5 flex items-center justify-between min-h-[155px] relative overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.02]"
    >
      {/* Left: Launch Arrow Pill & Title */}
      <div className="flex flex-col justify-between h-full z-10 max-w-[60%]">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/15 text-[#0D120D] group-hover:bg-[#0D120D] group-hover:text-[#D7FA00] transition-colors shadow-xs">
          <ArrowUpRight className="h-4 w-4" />
        </div>

        <div className="mt-4">
          <div className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#0D120D]/80">
            <Sparkles className="h-2.5 w-2.5" />
            <span>Copilot Active</span>
          </div>
          <h4 className="text-base sm:text-lg font-extrabold tracking-tight text-[#0D120D] leading-tight">
            AI Smart Assistant
          </h4>
        </div>
      </div>

      {/* Right: 3D Gradient Sphere / Orb Graphic */}
      <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
        {/* Soft 3D sphere rendered with layered CSS gradients */}
        <div
          className="w-24 h-24 rounded-full shadow-lg transition-transform duration-500 group-hover:scale-105"
          style={{
            background: 'radial-gradient(circle at 35% 35%, #F5C7A9 0%, #D48C6B 45%, #7A422D 85%, #421D12 100%)',
            boxShadow: '0 12px 28px -6px rgba(122, 66, 45, 0.45), inset -4px -4px 10px rgba(0, 0, 0, 0.4)',
          }}
        />
      </div>
    </Link>
  );
}
