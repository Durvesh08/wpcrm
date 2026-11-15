"use client";

import { useEffect } from "react";
import { Check, Moon, SunMoon, Sun, Sparkles, TrendingUp, ArrowUpRight } from "lucide-react";

import { useTheme } from "@/hooks/use-theme";
import { MODES, type Mode } from "@/lib/themes";
import { cn } from "@/lib/utils";
import { SettingsPanelHead } from "./settings-panel-head";

/**
 * Appearance panel — light/dark mode selection.
 *
 * Workspace accent is permanently locked to ZOVAIX Electric Lime (#D7FA00).
 * Users can toggle between Clean Light and Deep Obsidian Dark mode.
 *
 * Persistence: localStorage only (device-scoped). The boot script in
 * layout.tsx replays choices before first paint on subsequent loads.
 */
export function AppearancePanel() {
  const { theme, setTheme, mode, setMode } = useTheme();

  // Permanently lock the workspace accent to ZOVAIX Electric Lime
  useEffect(() => {
    if (theme !== "zovaix") {
      setTheme("zovaix");
    }
  }, [theme, setTheme]);

  return (
    <section className="max-w-4xl animate-in fade-in-50 duration-200 space-y-7">
      <SettingsPanelHead
        title="Appearance"
        description="Choose between Clean Light and Deep Obsidian Dark mode. The signature Electric Lime accent is permanently active across your entire workspace."
      />

      {/* Live Interactive Preview Bento Widget */}
      <div className="rounded-[26px] bg-gradient-to-br from-card/90 via-card/70 to-primary/10 border border-primary/30 p-6 backdrop-blur-xl shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-[8px] bg-primary text-primary-foreground shadow-xs">
              <Sparkles className="size-3.5" />
            </span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
              Live Theme Preview
            </span>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">
            Accent: <span className="text-foreground font-bold">Electric Lime</span> ({mode})
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="rounded-[18px] bg-card/80 border border-border/70 p-4 shadow-xs">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Pipeline Velocity
            </div>
            <div className="mt-1 text-2xl font-black font-mono text-foreground">
              $148,250
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-primary font-bold">
              <TrendingUp className="size-3.5" />
              <span>+32.4% vs last week</span>
            </div>
          </div>

          <div className="rounded-[18px] bg-card/80 border border-border/70 p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Status Badge
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary border border-primary/30 px-3 py-1 text-xs font-bold font-mono">
                  <span className="size-2 rounded-full bg-primary animate-pulse" />
                  Active Live
                </span>
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground font-medium mt-2">
              Adaptive contrast token
            </div>
          </div>

          <div className="rounded-[18px] bg-card/80 border border-border/70 p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Primary Button
              </div>
              <div className="mt-2">
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground font-black text-xs py-2 px-3 shadow-xs hover:brightness-110 transition-all"
                >
                  <span>Quick Action</span>
                  <ArrowUpRight className="size-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground font-medium mt-2">
              Instant feedback CTA
            </div>
          </div>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <SunMoon className="size-4 text-primary" />
          Color Mode
        </h3>

        <div
          role="radiogroup"
          aria-label="Color mode"
          className="grid max-w-lg grid-cols-2 gap-3.5"
        >
          {MODES.map((m) => (
            <ModeCard
              key={m}
              mode={m}
              isActive={m === mode}
              onPick={() => setMode(m)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ModeCard({
  mode,
  isActive,
  onPick,
}: {
  mode: Mode;
  isActive: boolean;
  onPick: () => void;
}) {
  const isLight = mode === "light";
  const Icon = isLight ? Sun : Moon;
  return (
    <button
      type="button"
      role="radio"
      onClick={onPick}
      aria-checked={isActive}
      aria-label={`Use ${mode} mode`}
      className={cn(
        "group flex flex-col justify-between rounded-[22px] border p-4.5 text-left transition-all duration-200 backdrop-blur-xl shadow-xs",
        isActive
          ? "border-primary bg-primary/10 shadow-[0_0_16px_rgba(215,250,0,0.18)] ring-1 ring-primary"
          : "border-border/80 bg-card/75 hover:border-border hover:bg-card",
      )}
    >
      <div className="flex items-center justify-between w-full">
        <span
          aria-hidden
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-[12px] border transition-transform group-hover:scale-105",
            isActive
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted/70 text-foreground border-border/60",
          )}
        >
          <Icon className="size-4.5" />
        </span>
        {isActive ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-2.5 py-0.5 text-[11px] font-black shadow-xs">
            <Check className="size-3 stroke-[3]" />
            Active
          </span>
        ) : (
          <span className="size-2 rounded-full bg-muted-foreground/30" />
        )}
      </div>

      <div className="mt-4">
        <div className="text-sm font-bold capitalize text-foreground">
          {mode} Mode
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 font-medium">
          {isLight ? "Clean bright canvas" : "Deep obsidian contrast"}
        </p>
      </div>

      {/* Mini Mockup Wireframe */}
      <div
        className={cn(
          "mt-3 h-8 w-full rounded-[10px] border p-1 flex items-center gap-1.5 overflow-hidden",
          isLight
            ? "bg-white border-zinc-200"
            : "bg-[#0B0E11] border-zinc-800",
        )}
      >
        <div
          className={cn(
            "w-2.5 h-full rounded-[4px]",
            isLight ? "bg-zinc-200" : "bg-zinc-800",
          )}
        />
        <div className="flex-1 h-full flex flex-col justify-center gap-0.5">
          <div
            className={cn(
              "w-8 h-1 rounded-full",
              isLight ? "bg-zinc-300" : "bg-zinc-700",
            )}
          />
          <div
            className={cn(
              "w-12 h-1 rounded-full",
              isLight ? "bg-zinc-200" : "bg-zinc-800",
            )}
          />
        </div>
        <div className="w-2 h-2 rounded-full bg-primary" />
      </div>
    </button>
  );
}
