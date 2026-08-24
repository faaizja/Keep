"use client";

import { formatDate } from "@/lib/analysis";
import { PLACE_BY_ID, TYPE_BY_ID } from "@/lib/taxonomy";
import type { Incident } from "@/lib/types";
import { EvidenceStrip } from "./EvidenceViewer";

export function ClassificationChip({ label, strong }: { label: string; strong?: boolean }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-3 py-1 text-[12.5px] font-medium " +
        (strong ? "bg-signalsoft text-signal" : "bg-keepsoft text-keepdeep")
      }
    >
      {label}
    </span>
  );
}

export function IncidentCard({
  incident,
  index,
  showWhy = true,
  compact = false,
}: {
  incident: Incident;
  index?: number;
  showWhy?: boolean;
  compact?: boolean;
}) {
  const types = incident.types.map((t) => TYPE_BY_ID[t]).filter(Boolean);
  const place = PLACE_BY_ID[incident.place];
  const lead = types[0];
  const strong = types.some((t) => t.weight === 3);

  return (
    <article className={"card " + (compact ? "p-5" : "p-6 sm:p-7")}>
      <div className="flex items-baseline justify-between gap-4">
        <time className="text-[13px] font-medium text-muted tabular-nums">
          {formatDate(incident.date)}
        </time>
        {typeof index === "number" && (
          <span className="text-[12px] text-faint tabular-nums">#{index + 1}</span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {types.map((t) => (
          <ClassificationChip key={t.id} label={t.classification} strong={t.weight === 3} />
        ))}
      </div>

      <p className="mt-4 text-[15.5px] leading-[1.6] text-ink">{lead?.label}</p>

      {incident.note && (
        <p className="mt-3 text-[15px] leading-[1.7] text-muted whitespace-pre-line">
          {incident.note}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-faint">
        {place && (
          <span>
            {place.label}
            {place.group === "Online" ? " · online" : ""}
          </span>
        )}
        {incident.people?.length ? <span>{incident.people.join(", ")}</span> : null}
        {incident.evidence?.length ? (
          <span>
            {incident.evidence.length} redacted screenshot
            {incident.evidence.length > 1 ? "s" : ""}
          </span>
        ) : null}
      </div>

      {incident.toldAdult && (
        <div className="mt-4 rounded-xl bg-paper border border-line px-4 py-3">
          <p className="text-[13px] text-muted">
            <span className="font-medium text-ink">An adult at school was told.</span>{" "}
            {incident.adultResponse ?? "No response recorded."}
          </p>
        </div>
      )}

      {incident.evidence?.length ? (
        <div className="mt-4">
          <EvidenceStrip images={incident.evidence} size="h-32" />
          <p className="mt-2 text-[12px] text-faint">Tap a screenshot to see it full size.</p>
        </div>
      ) : null}

      {showWhy && lead && (
        <p
          className={
            "mt-5 pt-4 border-t border-line text-[13.5px] leading-[1.65] " +
            (strong ? "text-signal" : "text-keepdeep")
          }
        >
          {lead.why}
        </p>
      )}
    </article>
  );
}
