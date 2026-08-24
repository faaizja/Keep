import { PLACE_BY_ID, TYPE_BY_ID } from "./taxonomy";
import type { Incident } from "./types";

/**
 * The pattern engine. Everything a single incident cannot show on its
 * own, such as frequency, escalation, the move online and who keeps
 * is derived here and used identically on the child's timeline and in
 * the case file.
 */

export type Pattern = {
  count: number;
  first: string | null;
  last: string | null;
  spanDays: number;
  spanLabel: string;
  /** incidents per month across the recorded period */
  perMonth: number;
  /** how often, in words a person would use */
  frequencyLabel: string;
  distinctTypes: number;
  onlineCount: number;
  atSchoolCount: number;
  physicalCount: number;
  staffCount: number;
  toldAdultCount: number;
  /** people the child named more than once */
  repeatPeople: { name: string; count: number }[];
  /** the first online incident that follows an incident an adult was told about */
  migration: { afterId: string; onlineId: string } | null;
  /** severity weight per calendar month, oldest first */
  monthly: { month: string; count: number; weight: number }[];
  escalating: boolean;
  /** the sentence the case file leads with */
  persistenceRead: string;
};

const MS_DAY = 86_400_000;

function monthKey(iso: string) {
  return iso.slice(0, 7);
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function analyse(incidents: Incident[]): Pattern {
  const sorted = [...incidents].sort((a, b) => a.date.localeCompare(b.date));
  const count = sorted.length;

  const first = sorted[0]?.date ?? null;
  const last = sorted[count - 1]?.date ?? null;
  const spanDays =
    first && last ? Math.max(1, Math.round((Date.parse(last) - Date.parse(first)) / MS_DAY)) : 0;

  const months = Math.max(spanDays / 30.44, 0.5);
  const perMonth = count ? count / months : 0;

  const spanLabel = (() => {
    if (!count) return "no entries yet";
    if (spanDays < 14) return `${spanDays} days`;
    if (spanDays < 60) return `${Math.round(spanDays / 7)} weeks`;
    return `${Math.round(spanDays / 30.44)} months`;
  })();

  const frequencyLabel = (() => {
    if (count < 2) return "a single entry";
    if (perMonth >= 8) return "several times a week";
    if (perMonth >= 4) return "about once a week";
    if (perMonth >= 2) return "roughly every fortnight";
    if (perMonth >= 1) return "about once a month";
    return "occasionally";
  })();

  const onlineCount = sorted.filter((x) => PLACE_BY_ID[x.place]?.group === "Online").length;
  const atSchoolCount = count - onlineCount;
  const physicalCount = sorted.filter((x) =>
    x.types.some((t) => t === "physical" || t === "hijab-touched")
  ).length;
  const staffCount = sorted.filter((x) => x.types.includes("staff")).length;
  const toldAdultCount = sorted.filter((x) => x.toldAdult).length;

  const distinctTypes = new Set(sorted.flatMap((x) => x.types)).size;

  /* who keeps appearing */
  const tally = new Map<string, number>();
  for (const inc of sorted) for (const p of inc.people ?? []) tally.set(p, (tally.get(p) ?? 0) + 1);
  const repeatPeople = [...tally.entries()]
    .filter(([, n]) => n > 1)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  /* the handover: an adult was told, and the next thing happened where they cannot see */
  let migration: Pattern["migration"] = null;
  const toldIndex = sorted.findIndex((x) => x.toldAdult);
  if (toldIndex >= 0) {
    const onward = sorted
      .slice(toldIndex + 1)
      .find((x) => PLACE_BY_ID[x.place]?.offSchoolView);
    if (onward) migration = { afterId: sorted[toldIndex].id, onlineId: onward.id };
  }

  /* monthly severity */
  const byMonth = new Map<string, { count: number; weight: number }>();
  for (const inc of sorted) {
    const k = monthKey(inc.date);
    const w = Math.max(...inc.types.map((t) => TYPE_BY_ID[t]?.weight ?? 1));
    const cur = byMonth.get(k) ?? { count: 0, weight: 0 };
    byMonth.set(k, { count: cur.count + 1, weight: cur.weight + w });
  }
  const monthly = [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, v]) => ({ month: monthLabel(month), ...v }));

  const escalating = (() => {
    if (monthly.length < 2) return false;
    const half = Math.floor(monthly.length / 2);
    const early = monthly.slice(0, half).reduce((s, m) => s + m.weight, 0) / half;
    const late =
      monthly.slice(half).reduce((s, m) => s + m.weight, 0) / (monthly.length - half);
    return late > early * 1.25;
  })();

  const persistenceRead = (() => {
    if (!count) return "No entries recorded yet.";
    if (count === 1) return "One recorded incident.";
    const bits = [
      `${count} recorded incidents over ${spanLabel}`,
      frequencyLabel !== "a single entry" ? frequencyLabel : null,
    ].filter(Boolean);
    let s = bits.join(", ") + ".";
    if (escalating) s += " The severity of what is recorded increases over the period.";
    if (migration) s += " Part of it moved into private online spaces after school staff were told.";
    if (physicalCount) s += ` ${physicalCount} of the entries involve physical contact or a threat.`;
    return s;
  })();

  return {
    count, first, last, spanDays, spanLabel, perMonth, frequencyLabel,
    distinctTypes, onlineCount, atSchoolCount, physicalCount, staffCount,
    toldAdultCount, repeatPeople, migration, monthly, escalating, persistenceRead,
  };
}

export function formatDate(iso: string): string {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatShortDate(iso: string): string {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
