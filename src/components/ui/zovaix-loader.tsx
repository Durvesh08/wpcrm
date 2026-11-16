'use client';

import React from 'react';
import { ZovaixMotionLogo, ZovaixMotionMode } from './zovaix-motion-logo';
import { cn } from '@/lib/utils';

interface ZovaixLoaderProps {
  className?: string;
  size?: number;
  label?: string;
  mode?: ZovaixMotionMode;
}

export function ZovaixLoader({
  className,
  size = 64,
  label,
  mode = 'loop',
}: ZovaixLoaderProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div className="relative flex items-center justify-center">
        {/* Subtle ambient brand glow behind the loader */}
        <div
          className="absolute -inset-4 rounded-full bg-gradient-to-tr from-[#00f8e7]/10 via-[#d7fc00]/15 to-transparent blur-xl pointer-events-none"
          aria-hidden="true"
        />
        <div style={{ width: size, height: Math.round(size * 0.735) }}>
          <ZovaixMotionLogo mode={mode} className="w-full h-full" />
        </div>
      </div>
      {label && (
        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase animate-pulse">
          {label}
        </p>
      )}
    </div>
  );
}
