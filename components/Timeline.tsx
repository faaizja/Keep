"use client";

import { analyse } from "@/lib/analysis";
import { IncidentCard } from "./IncidentCard";
import { PatternSummary } from "./PatternSummary";
import type { Incident } from "@/lib/types";

export function MigrationMarker() {
  return (
    <div className="relative py-2">
      <div className="rounded-2xl border border-signal/30 bg-signalsoft px-5 py-4">
        <p className="text-[13px] font-medium uppercase tracking-[0.06em] text-signal">
          It moved
        </p>
        <p className="mt-2 text-[14.5px] leading-[1.65] text-ink/80">
          After an adult at school got involved, the next thing happened somewhere
          the school can&apos;t see. This is the point the record stops being the
          school&apos;s to notice and starts being yours to keep.
        </p>
      </div>
    </div>
  );
}

export function Timeline({
  incidents,
  showWhy = true,
}: {
  incidents: Incident[];
  showWhy?: boolean;
}) {
  const pattern = analyse(incidents);
  const sorted = [...incidents].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6">
      <PatternSummary pattern={pattern} />

      <ol className="space-y-4">
        {sorted.map((incident, idx) => (
          <li key={incident.id} className="space-y-4">
            {pattern.migration?.onlineId === incident.id && <MigrationMarker />}
            <IncidentCard incident={incident} index={idx} showWhy={showWhy} />
          </li>
        ))}
      </ol>
    </div>
  );
}
