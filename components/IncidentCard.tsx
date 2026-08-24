"use client";

import { useState } from "react";
import { formatDate } from "@/lib/analysis";
import { PLACE_BY_ID, TYPE_BY_ID } from "@/lib/taxonomy";
import type { Incident } from "@/lib/types";
import { EvidenceStrip } from "./EvidenceViewer";

/**
 * An entry, not a card. No box, no shadow at rest: date, what happened,
 * what it is, and the words the child used. The surface only appears
 * under the pointer, so a long record reads as one continuous document
 * rather than a stack of tiles.
 */
export function IncidentCard({
  incident,
  showWhy = true,
  align = "left",
}: {
  incident: Incident;
  index?: number;
  showWhy?: boolean;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const types = incident.types.map((t) => TYPE_BY_ID[t]).filter(Boolean);
  const place = PLACE_BY_ID[incident.place];
  const lead = types[0];
  const weight = Math.max(...types.map((t) => t.weight), 1);
  const strong = weight === 3;
  const right = align === "right";

  const hasMore = Boolean(incident.note || incident.toldAdult || incident.evidence?.length);

  return (
    <div
      className={
        "group/entry relative rounded-2xl px-4 py-4 sm:px-5 sm:py-5 -mx-1 " +
        "transition-colors duration-200 hover:bg-surface " +
        (right ? "text-right" : "")
      }
    >
      <div className={"flex items-center gap-2.5 " + (right ? "justify-end" : "")}>
        <time className="text-[12px] font-medium tabular-nums tracking-[0.02em] text-faint uppercase">
          {formatDate(incident.date)}
        </time>
        {strong && (
          <span className="h-1 w-1 rounded-full bg-signal" aria-hidden />
        )}
      </div>

      <h4
        className={
          "mt-1.5 font-display text-[1.0625rem] sm:text-[1.125rem] leading-[1.35] tracking-[-0.01em] " +
          (strong ? "text-ink" : "text-ink")
        }
      >
        {lead?.label}
      </h4>

      <div className={"mt-2.5 flex flex-wrap gap-1.5 " + (right ? "justify-end" : "")}>
        {types.map((t) => (
          <span
            key={t.id}
            className={
              "inline-flex items-center rounded-md px-2 py-[3px] text-[11.5px] font-medium leading-none " +
              (t.weight === 3
                ? "bg-signalsoft text-signal"
                : "bg-keepsoft text-keepdeep")
            }
          >
            {t.classification}
          </span>
        ))}
      </div>

      {incident.note && (
        <p
          className={
            "mt-3 text-[14.5px] leading-[1.7] text-muted whitespace-pre-line " +
            (open ? "" : "line-clamp-2")
          }
        >
          {incident.note}
        </p>
      )}

      <div
        className={
          "mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-faint " +
          (right ? "justify-end" : "")
        }
      >
        {place && <span>{place.label.toLowerCase()}</span>}
        {incident.people?.length ? (
          <>
            <span className="text-line">·</span>
            <span>{incident.people.join(", ")}</span>
          </>
        ) : null}
        {incident.evidence?.length ? (
          <>
            <span className="text-line">·</span>
            <span>
              {incident.evidence.length} screenshot
              {incident.evidence.length > 1 ? "s" : ""}
            </span>
          </>
        ) : null}
        {hasMore && (
          <>
            <span className="text-line">·</span>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="text-keep hover:text-keepdeep underline underline-offset-4 decoration-keep/30"
            >
              {open ? "less" : "more"}
            </button>
          </>
        )}
      </div>

      {open && (
        <div className="rise mt-4 space-y-4">
          {incident.toldAdult && (
            <p
              className={
                "text-[13.5px] leading-[1.6] text-muted border-line pl-3 " +
                (right ? "border-r pr-3 pl-0" : "border-l")
              }
            >
              <span className="font-medium text-ink">An adult at school was told.</span>{" "}
              {incident.adultResponse ?? "No response recorded."}
            </p>
          )}

          {incident.evidence?.length ? (
            <EvidenceStrip images={incident.evidence} align={align} />
          ) : null}

          {showWhy && lead && (
            <p
              className={
                "text-[13px] leading-[1.65] " + (strong ? "text-signal" : "text-keepdeep")
              }
            >
              {lead.why}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
