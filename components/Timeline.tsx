"use client";

import { analyse } from "@/lib/analysis";
import { PLACE_BY_ID, TYPE_BY_ID } from "@/lib/taxonomy";
import { IncidentCard } from "./IncidentCard";
import { PatternHeader } from "./PatternHeader";
import type { Incident } from "@/lib/types";

const MS_DAY = 86_400_000;

/**
 * The timeline is not a list. Vertical position is time, and which side
 * of the axis an entry sits on is where it happened: school on the left,
 * private online spaces on the right. So the record drifting to the
 * right after an adult was told is not a caption anyone has to read. It
 * is the shape of the page.
 *
 * Spacing is proportional to the days between entries, which is what
 * makes a cluster look like a cluster and a quiet term look empty.
 */

function monthLabel(iso: string) {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function gapPx(days: number) {
  return Math.round(Math.min(112, Math.max(8, days * 1.8)));
}

function Dot({ weight, side }: { weight: number; side: "left" | "right" }) {
  return (
    <span className="relative block h-6 w-full">
      {/* connector out to the entry */}
      <span
        aria-hidden
        className={
          "hidden md:block absolute top-[11px] h-px bg-line " +
          (side === "left" ? "right-1/2 left-0 mr-3" : "left-1/2 right-0 ml-3")
        }
      />
      <span
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2 top-1 grid place-items-center h-5 w-5 rounded-full bg-paper"
      >
        {weight === 3 && (
          <span className="absolute inset-0 rounded-full ring-2 ring-signal/30" />
        )}
        <span
          className={
            "rounded-full transition-transform duration-200 group-hover/row:scale-125 " +
            (weight === 3
              ? "h-[11px] w-[11px] bg-signal"
              : weight === 2
                ? "h-2.5 w-2.5 bg-keep"
                : "h-2 w-2 bg-keep/45")
          }
        />
      </span>
    </span>
  );
}

function AxisLabel({ children, tone = "quiet" }: { children: React.ReactNode; tone?: "quiet" | "loud" }) {
  return (
    <div className="relative flex justify-center py-3" style={{ marginTop: 8 }}>
      <span
        className={
          "rounded-full bg-paper px-3 text-[11px] uppercase tracking-[0.12em] " +
          (tone === "loud" ? "text-signal" : "text-faint")
        }
      >
        {children}
      </span>
    </div>
  );
}

export function Timeline({
  incidents,
  showWhy = true,
  audience = "child",
  showHeader = true,
}: {
  incidents: Incident[];
  showWhy?: boolean;
  audience?: "child" | "school";
  showHeader?: boolean;
}) {
  const pattern = analyse(incidents);
  const sorted = [...incidents].sort((a, b) => a.date.localeCompare(b.date));

  const rows: React.ReactNode[] = [];
  let lastMonth = "";
  let lastDate: string | null = null;

  sorted.forEach((incident, idx) => {
    const month = monthLabel(incident.date);
    if (month !== lastMonth) {
      rows.push(
        <div key={`m-${month}`} className="relative flex justify-center pt-8 pb-1">
          <span className="rounded-full bg-paper px-4 text-[11.5px] font-medium uppercase tracking-[0.14em] text-muted">
            {month}
          </span>
        </div>
      );
      lastMonth = month;
      lastDate = null;
    }

    let gap = 12;
    if (lastDate) {
      const days = Math.round((Date.parse(incident.date) - Date.parse(lastDate)) / MS_DAY);
      gap = gapPx(days);
      if (days >= 14) {
        rows.push(
          <AxisLabel key={`g-${incident.id}`}>
            {days >= 60
              ? `${Math.round(days / 30.44)} months later`
              : `${Math.round(days / 7)} weeks later`}
          </AxisLabel>
        );
        gap = 12;
      }
    }

    if (pattern.migration?.onlineId === incident.id) {
      rows.push(
        <div key={`x-${incident.id}`} className="relative py-6">
          <span
            aria-hidden
            className="absolute inset-x-0 top-1/2 border-t border-dashed border-signal/35"
          />
          <div className="relative flex justify-center">
            <span className="rounded-full bg-paper px-4 py-1 text-[11.5px] font-medium uppercase tracking-[0.12em] text-signal">
              it moved out of sight
            </span>
          </div>
          <p className="mt-3 mx-auto max-w-md text-center text-[13.5px] leading-[1.65] text-muted">
            {audience === "school"
              ? "After school staff were told, the conduct continued in private online spaces the school cannot observe."
              : "After an adult at school got involved, the next thing happened somewhere school can't see."}
          </p>
        </div>
      );
    }

    const weight = Math.max(...incident.types.map((t) => TYPE_BY_ID[t]?.weight ?? 1), 1);
    const online = PLACE_BY_ID[incident.place]?.group === "Online";

    const justWritten =
      Date.now() - Date.parse(incident.createdAt) < 12_000;

    rows.push(
      <div
        key={incident.id}
        style={{ marginTop: gap, animationDelay: `${Math.min(idx * 55, 420)}ms` }}
        className={
          "rise group/row relative grid grid-cols-1 md:grid-cols-[1fr_112px_1fr] items-start pl-8 md:pl-0 rounded-2xl " +
          (justWritten ? "settle" : "")
        }
      >
        {/* mobile dot, sitting on the left rail */}
        <span
          aria-hidden
          className="md:hidden absolute left-[7px] top-5 h-2.5 w-2.5 rounded-full bg-paper ring-2 ring-paper"
        >
          <span
            className={
              "block h-full w-full rounded-full " +
              (weight === 3 ? "bg-signal" : weight === 2 ? "bg-keep" : "bg-keep/45")
            }
          />
        </span>

        {online ? (
          <>
            <div className="hidden md:block md:col-start-1" />
            <div className="hidden md:block md:col-start-2 pt-4">
              <Dot weight={weight} side="right" />
            </div>
            <div className="md:col-start-3">
              <IncidentCard incident={incident} index={idx} showWhy={showWhy} align="left" />
            </div>
          </>
        ) : (
          <>
            <div className="md:col-start-1">
              <IncidentCard
                incident={incident}
                index={idx}
                showWhy={showWhy}
                align="right"
              />
            </div>
            <div className="hidden md:block md:col-start-2 pt-4">
              <Dot weight={weight} side="left" />
            </div>
            <div className="hidden md:block md:col-start-3" />
          </>
        )}
      </div>
    );

    lastDate = incident.date;
  });

  return (
    <div className="space-y-10">
      {showHeader && <PatternHeader pattern={pattern} audience={audience} />}

      <div className="relative">
        {/* lane headings */}
        <div className="hidden md:grid grid-cols-[1fr_112px_1fr] items-end pb-4 border-b border-line">
          <p className="text-right pr-5 text-[11.5px] uppercase tracking-[0.14em] text-muted">
            At school
          </p>
          <p className="text-center text-[11px] uppercase tracking-[0.1em] text-faint">
            where
          </p>
          <p className="pl-5 text-[11.5px] uppercase tracking-[0.14em] text-signal/80">
            Online, out of sight
          </p>
        </div>

        {/* the axis: centred on desktop, a left rail on mobile */}
        <span
          aria-hidden
          className="absolute top-0 bottom-10 w-px bg-gradient-to-b from-line via-line to-signal/30
                     left-[11px] md:left-1/2 md:-translate-x-1/2"
        />

        <div className="relative pb-6">{rows}</div>

        <div className="relative pl-8 md:pl-0 md:flex md:justify-center">
          <span className="rounded-full bg-paper px-4 text-[11.5px] uppercase tracking-[0.12em] text-faint">
            {audience === "school" ? "end of the record" : "anything else goes here"}
          </span>
        </div>
      </div>
    </div>
  );
}
