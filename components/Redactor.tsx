"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  burnIn,
  canvasToDataUrl,
  dataUrlToCanvas,
  detectFaces,
  fileToCanvas,
  type Box,
} from "@/lib/redact";
import type { EvidenceImage } from "@/lib/types";

type Stage = "empty" | "working" | "checking";

export function Redactor({
  onAdd,
  initial,
  onCancelEdit,
}: {
  onAdd: (e: EvidenceImage) => void;
  /** an image already added to the entry, reopened for more blurring */
  initial?: EvidenceImage | null;
  onCancelEdit?: () => void;
}) {
  const [stage, setStage] = useState<Stage>("empty");
  const [status, setStatus] = useState("");
  const [autoBoxes, setAutoBoxes] = useState<Box[]>([]);
  const [manualBoxes, setManualBoxes] = useState<Box[]>([]);
  const [drag, setDrag] = useState<Box | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [rescanning, setRescanning] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [priorRedactions, setPriorRedactions] = useState(0);

  const sourceRef = useRef<HTMLCanvasElement | null>(null);
  const viewRef = useRef<HTMLCanvasElement | null>(null);

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

  /* ------------------- reopening an existing image ------------------- */

  const openExisting = useCallback(async (img: EvidenceImage) => {
    setStage("working");
    setStatus("Opening the image you already blurred…");
    const canvas = await dataUrlToCanvas(img.dataUrl);
    sourceRef.current = canvas;
    setAutoBoxes([]);
    setManualBoxes([]);
    setConfirmed(false);
    setEditingId(img.id);
    setPriorRedactions(img.facesFound + img.manualRedactions);
    setStage("checking");
    setStatus(
      "What you blurred before is already burned in and can't be brought back. Add anything else you've noticed."
    );
  }, []);

  useEffect(() => {
    if (initial) void openExisting(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.id]);

  /* --------------------------- new image ---------------------------- */

  async function onFile(file: File) {
    setStage("working");
    setStatus("Reading the image on this device…");
    const canvas = await fileToCanvas(file);
    sourceRef.current = canvas;
    setStatus("Looking for faces, including small ones…");
    const faces = await detectFaces(canvas);
    setAutoBoxes(faces);
    setManualBoxes([]);
    setConfirmed(false);
    setEditingId(null);
    setPriorRedactions(0);
    setStage("checking");
    setStatus(describe(faces.length));
  }

  function describe(n: number) {
    return n
      ? `We found and blurred ${n} face${n > 1 ? "s" : ""}.`
      : "We didn't find any faces in this one. That doesn't mean it's clear. Screenshots hide small profile pictures, so have a proper look.";
  }

  async function rescan() {
    const src = sourceRef.current;
    if (!src) return;
    setRescanning(true);
    setStatus("Looking harder, with smaller tiles and a lower threshold…");
    const faces = await detectFaces(src, true);
    setAutoBoxes(faces);
    setConfirmed(false);
    setRescanning(false);
    setStatus(
      faces.length
        ? `Found ${faces.length} this time. Some of those might not be faces. That's the cost of looking this hard, and you can still add your own.`
        : "Still nothing found automatically. Anything that needs hiding, drag over it yourself."
    );
  }

  /* ------------------------- brush handling ------------------------- */

  function toCanvasPoint(e: React.PointerEvent) {
    const view = viewRef.current!;
    const rect = view.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (view.width / rect.width),
      y: (e.clientY - rect.top) * (view.height / rect.height),
    };
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
    const start = startRef.current;
    if (drag && drag.w > 6 && drag.h > 6) {
      setManualBoxes((b) => [...b, drag]);
      setConfirmed(false);
    } else if (start && sourceRef.current) {
      // A tap rather than a drag. Profile pictures in a chat screenshot
      // are tiny and fiddly to drag a box around, so one tap drops a
      // patch over whatever is under your finger.
      const src = sourceRef.current;
      const size = Math.max(28, Math.min(src.width, src.height) * 0.09);
      setManualBoxes((b) => [
        ...b,
        {
          x: Math.max(0, start.x - size / 2),
          y: Math.max(0, start.y - size / 2),
          w: size,
          h: size,
        },
      ]);
      setConfirmed(false);
    }
    setDrag(null);
    startRef.current = null;
  }

  /* ----------------------------- save ------------------------------ */

  function reset() {
    sourceRef.current = null;
    setAutoBoxes([]);
    setManualBoxes([]);
    setConfirmed(false);
    setEditingId(null);
    setPriorRedactions(0);
    setStage("empty");
    setStatus("");
    onCancelEdit?.();
  }

  function save() {
    const src = sourceRef.current;
    if (!src || !confirmed) return;
    const composed = burnIn(src, boxes);
    onAdd({
      id: editingId ?? crypto.randomUUID(),
      dataUrl: canvasToDataUrl(composed),
      width: composed.width,
      height: composed.height,
      facesFound: autoBoxes.length,
      textRegionsFound: 0,
      manualRedactions: manualBoxes.length + priorRedactions,
      humanChecked: true,
      checkedAt: new Date().toISOString(),
    });
    reset();
  }

  /* ----------------------------- views ------------------------------ */

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

  const nothingBlurred = boxes.length === 0;

  return (
    <div className="pop rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <p className="text-[14px] text-ink">{status}</p>
      <p className="mt-1.5 text-[13px] leading-[1.6] text-muted">
        Keep does <strong className="font-medium text-ink">not</strong> automatically find
        names, @handles or phone numbers. Drag a box over anything like that, or just tap
        once on a small profile picture to cover it.
      </p>

      <div className="mt-4 overflow-hidden rounded-xl border border-line">
        <canvas
          ref={viewRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          className="block w-full h-auto touch-none cursor-crosshair"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
        <span className="text-muted">
          {autoBoxes.length} found automatically · {manualBoxes.length} added by you
        </span>

        <button
          type="button"
          disabled={rescanning}
          onClick={rescan}
          className="text-keep underline underline-offset-4 disabled:opacity-50"
        >
          {rescanning ? "looking…" : "look harder for faces"}
        </button>

        {manualBoxes.length > 0 && (
          <button
            type="button"
            className="text-keep underline underline-offset-4"
            onClick={() => setManualBoxes((b) => b.slice(0, -1))}
          >
            undo last
          </button>
        )}

        {!nothingBlurred && (
          <button
            type="button"
            className="text-signal underline underline-offset-4"
            onClick={() => {
              setAutoBoxes([]);
              setManualBoxes([]);
              setConfirmed(false);
            }}
          >
            clear every blur
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
          {!confirmed
            ? "Have a look first"
            : editingId
              ? "Save the changes"
              : "Add it to the entry"}
        </button>
        <button type="button" className="btn-quiet" onClick={reset}>
          Cancel
        </button>
      </div>

      <p className="mt-3 text-[12px] leading-[1.6] text-faint">
        The blurring is permanent. Keep saves the blurred version and throws the original
        away, so there is nothing left to leak. Location data the phone recorded is
        stripped at the same time. You can come back and blur more later, but you
        can&apos;t un-blur.
      </p>
    </div>
  );
}
