"use client";

import { useState } from "react";
import type { Pattern } from "@/lib/analysis";

/**
 * One series, one hue, change over time. Severity per month rather than
 * a bare count, so a month with one assault does not read as quieter
 * than a month with three comments.
 */
export function SeverityChart({ monthly }: { monthly: Pattern["monthly"] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (monthly.length < 2) return null;

  const max = Math.max(...monthly.map((m) => m.weight), 1);
  const H = 96;

  return (
    <figure className="mt-1">
      <figcaption className="text-[12.5px] text-muted">
        How heavy each month was
      </figcaption>

      <div className="relative mt-3">
        {/* baseline, recessive */}
        <div className="absolute inset-x-0 bottom-[22px] h-px bg-line" aria-hidden />

        <div className="relative flex items-end gap-[6px]" style={{ height: H + 22 }}>
          {monthly.map((m, idx) => {
            const h = Math.max(6, (m.weight / max) * H);
            const on = hover === idx;
            return (
              <div
                key={m.month}
                className="flex-1 flex flex-col items-center justify-end h-full"
                onMouseEnter={() => setHover(idx)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(idx)}
                onBlur={() => setHover(null)}
                tabIndex={0}
              >
                {on && (
                  <div className="absolute -top-1 z-10 pointer-events-none rounded-lg bg-ink text-paper px-2.5 py-1.5 text-[12px] whitespace-nowrap shadow-lift">
                    {m.month}: {m.count} {m.count === 1 ? "entry" : "entries"}
                  </div>
                )}
                <div
                  className="growbar w-full rounded-t-[4px] transition-colors duration-150"
                  style={{
                    animationDelay: `${120 + idx * 70}ms`,
                    height: h,
                    background: on ? "#234439" : "#2F5D50",
                    opacity: on ? 1 : 0.55 + 0.45 * (m.weight / max),
                  }}
                />
                <span
                  className={
                    "mt-2 h-[14px] text-[11px] tabular-nums " +
                    (on ? "text-ink" : "text-faint")
                  }
                >
                  {m.month.split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </figure>
  );
}
