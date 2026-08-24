"use client";

import type { Pattern } from "@/lib/analysis";
import { SeverityChart } from "./SeverityChart";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0">
      <div className="font-display text-[1.625rem] leading-none tracking-[-0.02em] text-ink truncate">
        {value}
      </div>
      <div className="mt-2 text-[12.5px] text-muted">{label}</div>
    </div>
  );
}

function Signal({ tone, children }: { tone: "quiet" | "loud"; children: React.ReactNode }) {
  return (
    <li
      className={
        "flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-[13.5px] leading-[1.5] " +
        (tone === "loud" ? "bg-signalsoft text-ink" : "bg-paper text-ink/80")
      }
    >
      <span
        className={
          "mt-[6px] h-1.5 w-1.5 rounded-full shrink-0 " +
          (tone === "loud" ? "bg-signal" : "bg-keep")
        }
        aria-hidden
      />
      <span>{children}</span>
    </li>
  );
}

export function PatternHeader({
  pattern,
  audience = "child",
}: {
  pattern: Pattern;
  audience?: "child" | "school";
}) {
  const p = pattern;
  if (!p.count) return null;

  const signals: { tone: "quiet" | "loud"; text: React.ReactNode }[] = [];

  if (p.escalating)
    signals.push({
      tone: "loud",
      text:
        audience === "school"
          ? "Severity increases across the period rather than settling."
          : "This is getting worse, not settling down.",
    });

  if (p.migration)
    signals.push({
      tone: "loud",
      text:
        audience === "school"
          ? "After staff were told, it continued in private online spaces the school cannot see."
          : "After you told an adult, it carried on somewhere school can't see.",
    });

  if (p.staffCount)
    signals.push({
      tone: "loud",
      text: `${p.staffCount} ${p.staffCount === 1 ? "entry involves" : "entries involve"} an adult at the school.`,
    });

  if (p.repeatPeople.length)
    signals.push({
      tone: "quiet",
      text: (
        <>
          <span className="font-medium">{p.repeatPeople[0].name}</span> appears in{" "}
          {p.repeatPeople[0].count} separate entries
          {p.repeatPeople.length > 1 ? `, and ${p.repeatPeople.length - 1} other name${p.repeatPeople.length > 2 ? "s" : ""} repeats too` : ""}.
        </>
      ),
    });

  if (p.onlineCount)
    signals.push({
      tone: "quiet",
      text: `${p.onlineCount} of ${p.count} happened online or outside school.`,
    });

  if (p.toldAdultCount)
    signals.push({
      tone: "quiet",
      text:
        audience === "school"
          ? `The student states they told an adult at school on ${p.toldAdultCount} occasions before sending this.`
          : `You told someone ${p.toldAdultCount} ${p.toldAdultCount === 1 ? "time" : "times"} before this.`,
    });

  return (
    <section className="border-y border-line">
      <div className="py-7 sm:py-8">
        <p className="max-w-3xl font-display text-[1.5rem] sm:text-[1.875rem] leading-[1.25] tracking-[-0.02em] text-ink">
          {p.persistenceRead}
        </p>
      </div>

      <div className="pb-7 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-6 border-t border-line pt-7">
        <Stat value={String(p.count)} label="entries" />
        <Stat value={p.spanLabel} label="first to last" />
        <Stat value={p.frequencyLabel} label="how often" />
        <Stat value={String(p.distinctTypes)} label="different kinds" />
      </div>

      {p.monthly.length > 1 && (
        <div className="pb-7 pt-6 border-t border-line max-w-2xl">
          <SeverityChart monthly={p.monthly} />
        </div>
      )}

      {signals.length > 0 && (
        <ul className="py-6 border-t border-line grid sm:grid-cols-2 gap-2">
          {signals.map((s, i) => (
            <Signal key={i} tone={s.tone}>
              {s.text}
            </Signal>
          ))}
        </ul>
      )}
    </section>
  );
}
