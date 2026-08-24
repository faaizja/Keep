"use client";

/**
 * Screenshot redaction.
 *
 * The image never leaves the browser. Face detection runs against a
 * model file served from Keep's own origin (public/models), so no
 * third-party service ever sees the picture — which matters, because
 * these screenshots contain other children.
 *
 * Faces are found automatically. Names, @handles and phone numbers are
 * NOT: automatic text detection in the browser is slow and unreliable
 * enough that shipping it would imply a completeness we cannot deliver.
 * So the human check is mandatory rather than advisory, and the limit
 * is stated in the interface itself rather than buried in a footnote.
 *
 * Redaction is destructive by design. The blurred pixels are burned
 * into a re-encoded image and the original is discarded — there is no
 * "unblur", and no original left behind to leak. Re-encoding through a
 * canvas also strips EXIF metadata, including any location the camera
 * or phone recorded.
 */

export type Box = { x: number; y: number; w: number; h: number };

let modelLoaded = false;
let faceapi: typeof import("@vladmandic/face-api") | null = null;

export async function loadDetector(): Promise<boolean> {
  if (modelLoaded && faceapi) return true;
  try {
    faceapi = await import("@vladmandic/face-api");
    await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
    modelLoaded = true;
    return true;
  } catch {
    return false;
  }
}

export async function detectFaces(canvas: HTMLCanvasElement): Promise<Box[]> {
  const ok = await loadDetector();
  if (!ok || !faceapi) return [];
  try {
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.35 });
    const results = await faceapi.detectAllFaces(canvas, options);
    return results.map((r) => {
      const b = r.box;
      // pad outward — a tight box leaves hair, ears and jaw visible
      const padX = b.width * 0.28;
      const padY = b.height * 0.32;
      return {
        x: Math.max(0, b.x - padX),
        y: Math.max(0, b.y - padY),
        w: Math.min(canvas.width, b.width + padX * 2),
        h: Math.min(canvas.height, b.height + padY * 2),
      };
    });
  } catch {
    return [];
  }
}

/** Load a File into a canvas, downscaled so huge screenshots stay usable. */
export async function fileToCanvas(file: File, maxEdge = 1400): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvas;
}

/**
 * Burn the boxes in. Each region is pixelated first (so no amount of
 * sharpening recovers it) and then blurred, which reads as deliberate
 * redaction rather than a bad photo.
 */
export function burnIn(source: HTMLCanvasElement, boxes: Box[]): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = source.width;
  out.height = source.height;
  const ctx = out.getContext("2d")!;
  ctx.drawImage(source, 0, 0);

  for (const b of boxes) {
    const w = Math.max(1, Math.round(b.w));
    const h = Math.max(1, Math.round(b.h));
    const x = Math.round(b.x);
    const y = Math.round(b.y);

    const small = document.createElement("canvas");
    const sw = Math.max(1, Math.round(w / 14));
    const sh = Math.max(1, Math.round(h / 14));
    small.width = sw;
    small.height = sh;
    const sctx = small.getContext("2d")!;
    sctx.imageSmoothingEnabled = true;
    sctx.drawImage(out, x, y, w, h, 0, 0, sw, sh);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.imageSmoothingEnabled = false;
    ctx.filter = "blur(6px)";
    ctx.drawImage(small, 0, 0, sw, sh, x, y, w, h);
    ctx.filter = "none";
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(47,93,80,0.55)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.restore();
  }
  return out;
}

export function canvasToDataUrl(canvas: HTMLCanvasElement, quality = 0.82): string {
  return canvas.toDataURL("image/jpeg", quality);
}
