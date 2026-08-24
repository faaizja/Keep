"use client";

import { useState } from "react";
import { HELPLINES, type SafeguardingResult } from "@/lib/safeguarding";

/**
 * Shown before the entry is saved, not after, and never instead of
 * saving. Keep does not contact anyone on the child's behalf; it puts
 * the options in front of them and lets them choose.
 */
export function SafeguardingInterrupt({
  result,
  level,
  onSaveAnyway,
  onBack,
}: {
  result: SafeguardingResult;
  level: "first" | "repeat" | "persistent";
  onSaveAnyway: () => void;
  onBack: () => void;
}) {
  const [region, setRegion] = useState<string>("United Kingdom");
  const regions = [...new Set(HELPLINES.map((h) => h.region))];
  const lines = HELPLINES.filter((h) => h.region === region);

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-lg bg-surface rounded-t-3xl sm:rounded-3xl shadow-lift p-6 sm:p-8 my-0 sm:my-8">
        <h2 className="font-display text-[1.5rem] leading-[1.25] tracking-[-0.01em]">
          {result.headline}
        </h2>
        <p className="mt-3 text-[15px] leading-[1.7] text-muted">{result.body}</p>

        {level === "persistent" && (
          <p className="mt-4 rounded-xl bg-signalsoft border border-signal/25 px-4 py-3 text-[14px] leading-[1.6] text-ink/85">
            This is the fourth time something like this has come up in what
            you&apos;ve written. Please talk to one of these people. You have been
            dealing with this on your own for a while.
          </p>
        )}

        <div className="mt-7">
          <div className="flex flex-wrap gap-2">
            {regions.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRegion(r)}
                className={
                  "rounded-full px-3.5 py-1.5 text-[13px] border transition-colors " +
                  (r === region
                    ? "border-keep bg-keepsoft text-keepdeep"
                    : "border-line text-muted hover:border-ink/25")
                }
              >
                {r}
              </button>
            ))}
          </div>

          <ul className="mt-4 space-y-3">
            {lines.map((h) => (
              <li key={h.name} className="rounded-2xl border border-line p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[15px] font-medium text-ink">{h.name}</span>
                  {h.href && (
                    <a
                      href={h.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-[13px] text-keep underline underline-offset-4"
                    >
                      open
                    </a>
                  )}
                </div>
                <p className="mt-1 font-display text-[1.125rem] text-keepdeep">{h.contact}</p>
                <p className="mt-1 text-[13px] text-muted">{h.note}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-7 pt-6 border-t border-line flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={onSaveAnyway} className="btn-primary flex-1">
            Save it and carry on
          </button>
          <button type="button" onClick={onBack} className="btn-quiet flex-1">
            Go back and change it
          </button>
        </div>

        <p className="mt-4 text-[12.5px] leading-[1.6] text-faint">
          Keep will not tell anyone about this. Nothing here is sent to your school,
          your parents or us. Whether anyone else finds out is your decision, always.
        </p>
      </div>
    </div>
  );
}
