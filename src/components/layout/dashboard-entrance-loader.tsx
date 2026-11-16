'use client';

import React, { useEffect, useState } from 'react';
import { ZovaixMotionLogo } from '@/components/ui/zovaix-motion-logo';

const STORAGE_KEY = 'zovaix_dashboard_entrance_played';

export function DashboardEntranceLoader() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Only play once per browser session
    try {
      const alreadyPlayed = sessionStorage.getItem(STORAGE_KEY);
      if (alreadyPlayed) {
        return;
      }
      setVisible(true);

      // Ribbon reveal takes ~1.8s. Start smooth fade at 2.1s
      const fadeTimer = setTimeout(() => {
        setFading(true);
      }, 2100);

      // Unmount from DOM after fade completes
      const removeTimer = setTimeout(() => {
        setVisible(false);
        try {
          sessionStorage.setItem(STORAGE_KEY, 'true');
        } catch {
          // ignore storage errors
        }
      }, 2800);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(removeTimer);
      };
    } catch {
      // ignore
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[#060a0e] transition-opacity duration-700 ease-in-out ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-live="polite"
      aria-label="Loading workspace"
    >
      {/* Ambient background glow */}
      <div
        className="absolute h-96 w-96 rounded-full bg-gradient-to-tr from-[#00f8e7]/15 via-[#d7fc00]/20 to-transparent blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative flex flex-col items-center gap-6">
        <div className="relative w-40 sm:w-48 h-auto">
          <ZovaixMotionLogo mode="once" className="w-full h-auto drop-shadow-2xl" />
        </div>

        <div className="flex flex-col items-center gap-1.5 text-center">
          <h2 className="text-white text-base font-black tracking-[0.28em] uppercase">
            ZOVAIX
          </h2>
          <p className="text-white/40 text-[11px] font-medium tracking-[0.2em] uppercase">
            AI Revenue Workspace
          </p>
        </div>
      </div>
    </div>
  );
}
