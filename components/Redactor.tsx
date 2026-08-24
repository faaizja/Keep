"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  burnIn,
  canvasToDataUrl,
  detectFaces,
  fileToCanvas,
  type Box,
} from "@/lib/redact";
import type { EvidenceImage } from "@/lib/types";

type Stage = "empty" | "working" | "checking";

export function Redactor({ onAdd }: { onAdd: (e: EvidenceImage) => void }) {
  const [stage, setStage] = useState<Stage>("empty");
  const [status, setStatus] = useState("");
  const [autoBoxes, setAutoBoxes] = useState<Box[]>([]);
  const [manualBoxes, setManualBoxes] = useState<Box[]>([]);
  const [drag, setDrag] = useState<Box | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const sourceRef = useRef<HTMLCanvasElement | null>(null);
  const viewRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const boxes = [...autoBoxes, ...manualBoxes];

  const paint = useCallback(() => {
    const src = sourceRef.current;
    const view = viewRef.current;
    if (!src || !view) return;
    const composed = burnIn(src, drag ? [...boxes, drag] : boxes);
    view.width = composed.width;
    view.height = composed.height;
    view.getContext("2d")!.drawImage(composed, 0, 0);
  }, [boxes, drag]);

  useEffect(() => {
    if (stage === "checking") paint();
  }, [stage, paint]);

  async function onFile(file: File) {
    setStage("working");
    setStatus("Reading the image on this device…");
    const canvas = await fileToCanvas(file);
    sourceRef.current = canvas;
    setStatus("Looking for faces…");
    const faces = await detectFaces(canvas);
    setAutoBoxes(faces);
    setManualBoxes([]);
    setConfirmed(false);
    setStage("checking");
    setStatus(
      faces.length
        ? `We found and blurred ${faces.length} face${faces.length > 1 ? "s" : ""}.`
        : "We didn't find any faces in this one. That doesn't mean it's clear — have a proper look."
    );
  }

  /* ------------------------- brush handling ------------------------- */

  function toCanvasPoint(e: React.PointerEvent) {
    const view = viewRef.current!;
    const rect = view.getBoundingClientRect();
    const sx = view.width / rect.width;
    const sy = view.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }

  const startRef = useRef<{ x: number; y: number } | null>(null);

  function onDown(e: React.PointerEvent) {
    if (stage !== "checking") return;
    (e.target as Element).setPointerCapture(e.pointerId);
    startRef.current = toCanvasPoint(e);
  }

  function onMove(e: React.PointerEvent) {
    if (!startRef.current) return;
    const p = toCanvasPoint(e);
    const s = startRef.current;
    setDrag({
      x: Math.min(s.x, p.x),
      y: Math.min(s.y, p.y),
      w: Math.abs(p.x - s.x),
      h: Math.abs(p.y - s.y),
    });
  }

  function onUp() {
    if (drag && drag.w > 6 && drag.h > 6) {
      setManualBoxes((b) => [...b, drag]);
      setConfirmed(false);
    }
    setDrag(null);
    startRef.current = null;
  }

  /* ----------------------------- save ------------------------------ */

  function save() {
    const src = sourceRef.current;
    if (!src || !confirmed) return;
    const composed = burnIn(src, boxes);
    onAdd({
      id: crypto.randomUUID(),
      dataUrl: canvasToDataUrl(composed),
      width: composed.width,
      height: composed.height,
      facesFound: autoBoxes.length,
      textRegionsFound: 0,
      manualRedactions: manualBoxes.length,
      humanChecked: true,
      checkedAt: new Date().toISOString(),
    });
    sourceRef.current = null;
    setAutoBoxes([]);
    setManualBoxes([]);
    setConfirmed(false);
    setStage("empty");
    setStatus("");
  }

  if (stage === "empty") {
    return (
      <label className="block cursor-pointer rounded-2xl border border-dashed border-line bg-surface px-5 py-6 text-center hover:border-ink/25 transition-colors">
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = "";
          }}
        />
        <span className="text-[15px] text-ink">Add a screenshot</span>
        <span className="block mt-1.5 text-[13px] text-muted">
          It stays on this device. Faces get blurred before you save it.
        </span>
      </label>
    );
  }

  if (stage === "working") {
    return (
      <div className="rounded-2xl border border-line bg-surface px-5 py-6 text-[14px] text-muted">
        {status}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <p className="text-[14px] text-ink">{status}</p>
      <p className="mt-1.5 text-[13px] leading-[1.6] text-muted">
        Keep does <strong className="font-medium text-ink">not</strong> automatically find
        names, @handles or phone numbers. Drag over anything like that — and over any
        face we missed.
      </p>

      <div ref={wrapRef} className="mt-4 overflow-hidden rounded-xl border border-line">
        <canvas
          ref={viewRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          className="block w-full h-auto touch-none cursor-crosshair"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px]">
        <span className="text-muted">
          {autoBoxes.length} found automatically · {manualBoxes.length} added by you
        </span>
        {manualBoxes.length > 0 && (
          <button
            type="button"
            className="text-keep underline underline-offset-4"
            onClick={() => setManualBoxes((b) => b.slice(0, -1))}
          >
            undo last
          </button>
        )}
      </div>

      <label className="mt-5 flex items-start gap-3 rounded-xl bg-paper border border-line px-4 py-3.5 cursor-pointer">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-1 h-4 w-4 accent-[#2F5D50]"
        />
        <span className="text-[14px] leading-[1.55] text-ink">
          I&apos;ve looked at this image and I&apos;m happy with what&apos;s blurred.
        </span>
      </label>

      <div className="mt-4 flex gap-3">
        <button type="button" className="btn-primary flex-1" disabled={!confirmed} onClick={save}>
          {confirmed ? "Add it to the entry" : "Have a look first"}
        </button>
        <button
          type="button"
          className="btn-quiet"
          onClick={() => {
            sourceRef.current = null;
            setStage("empty");
            setAutoBoxes([]);
            setManualBoxes([]);
          }}
        >
          Cancel
        </button>
      </div>

      <p className="mt-3 text-[12px] leading-[1.6] text-faint">
        The blurring is permanent — Keep saves the blurred version and throws the
        original away, so there is nothing left to leak. Location data the phone
        recorded is stripped at the same time.
      </p>
    </div>
  );
}
