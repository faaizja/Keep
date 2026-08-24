"use client";

import type { EvidenceImage } from "@/lib/types";

/**
 * Screenshots sit small so they never crowd out the entry, and grow
 * under the pointer, because a thumbnail of a group chat is useless for
 * reading what was actually said. No modal, no dimmed page: look at it,
 * move away, carry on reading.
 */
export function EvidenceStrip({
  images,
  align = "left",
}: {
  images: EvidenceImage[];
  align?: "left" | "right";
}) {
  if (!images.length) return null;

  return (
    <div className={"flex gap-2.5 flex-wrap " + (align === "right" ? "justify-end" : "")}>
      {images.map((e) => (
        <figure
          key={e.id}
          className="relative h-24 w-24 shrink-0"
          style={{ zIndex: 0 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={e.dataUrl}
            alt="Redacted screenshot kept as evidence"
            className={
              "absolute top-0 h-24 w-auto max-w-none rounded-lg border border-line bg-surface " +
              "object-cover object-top transition-transform duration-300 ease-out " +
              "hover:scale-[3.2] hover:shadow-lift hover:border-keep/40 hover:z-50 " +
              (align === "right"
                ? "right-0 origin-top-right"
                : "left-0 origin-top-left")
            }
          />
        </figure>
      ))}
    </div>
  );
}
