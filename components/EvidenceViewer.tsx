"use client";

import { useEffect, useState } from "react";
import type { EvidenceImage } from "@/lib/types";

/**
 * Screenshots sit small in the timeline so the entry stays readable.
 * Tapping one opens it full size, because a thumbnail of a group chat
 * is useless for actually reading what was said.
 */
export function EvidenceStrip({
  images,
  size = "h-28",
}: {
  images: EvidenceImage[];
  size?: string;
}) {
  const [open, setOpen] = useState<EvidenceImage | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!images.length) return null;

  return (
    <>
      <div className="flex gap-3 flex-wrap">
        {images.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => setOpen(e)}
            title="Tap to see it full size"
            className={`group relative ${size} rounded-lg border border-line overflow-hidden transition-transform duration-150 hover:scale-[1.04] hover:border-keep/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-keep/40`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={e.dataUrl}
              alt="Redacted screenshot kept as evidence"
              className="h-full w-auto block"
            />
            <span className="absolute inset-0 bg-ink/0 group-hover:bg-ink/10 transition-colors" />
          </button>
        ))}
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(null)}
          className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 print:hidden"
        >
          <div className="max-h-full max-w-4xl w-full flex flex-col items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={open.dataUrl}
              alt="Redacted screenshot, full size"
              onClick={(e) => e.stopPropagation()}
              className="max-h-[80dvh] w-auto max-w-full rounded-xl border border-paper/20 shadow-lift bg-surface"
            />
            <p className="text-[13px] text-paper/80 text-center">
              {open.facesFound > 0
                ? `${open.facesFound} face${open.facesFound > 1 ? "s" : ""} blurred automatically`
                : "No faces found automatically"}
              {open.manualRedactions > 0
                ? `, ${open.manualRedactions} blurred by hand`
                : ""}
              . Tap anywhere to close.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
