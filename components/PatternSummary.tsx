"use client";

import type { Pattern } from "@/lib/analysis";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-display text-[1.75rem] leading-none text-ink">{value}</div>
      <div className="mt-1.5 text-[13px] text-muted">{label}</div>
    </div>
  );
}

export function MonthBars({ monthly }: { monthly: Pattern["monthly"] }) {
  if (monthly.length < 2) return null;
  const max = Math.max(...monthly.map((m) => m.weight), 1);
  return (
    <div className="flex items-end gap-2 h-20" aria-hidden>
      {monthly.map((m) => (
        <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
          <div
            className="w-full rounded-t-md bg-keep/85"
            style={{ height: `${Math.max(8, (m.weight / max) * 100)}%` }}
          />
          <span className="text-[11px] text-faint whitespace-nowrap">{m.month.split(" ")[0]}</span>
        </div>
      ))}
    </div>
  );
}

export function PatternSummary({ pattern }: { pattern: Pattern }) {
  const p = pattern;
  if (!p.count) return null;

  const signals: string[] = [];
  if (p.onlineCount) signals.push(`${p.onlineCount} of them happened online`);
  if (p.repeatPeople.length)
    signals.push(
      `${p.repeatPeople[0].name} appears in ${p.repeatPeople[0].count} separate entries`
    );
  if (p.staffCount) signals.push(`${p.staffCount} involved an adult at the school`);
  if (p.toldAdultCount) signals.push(`you told someone ${p.toldAdultCount} times`);

  return (
    <section className="card p-6 sm:p-8">
      <p className="font-display text-[1.375rem] sm:text-[1.5rem] leading-[1.35] text-ink">
        {p.persistenceRead}
      </p>

      <div className="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-6">
        <Stat value={String(p.count)} label="entries" />
        <Stat value={p.spanLabel} label="from first to last" />
        <Stat value={p.frequencyLabel} label="how often" />
        <Stat value={String(p.distinctTypes)} label="different kinds" />
      </div>

      {p.monthly.length > 1 && (
        <div className="mt-8 pt-7 border-t border-line">
          <MonthBars monthly={p.monthly} />
          {p.escalating && (
            <p className="mt-4 text-[14px] text-signal">
              This is getting worse, not settling down.
            </p>
          )}
        </div>
      )}

      {signals.length > 0 && (
        <ul className="mt-7 pt-6 border-t border-line space-y-2">
          {signals.map((s) => (
            <li key={s} className="text-[14px] text-muted flex gap-2.5">
              <span className="text-keep mt-[2px]">·</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
