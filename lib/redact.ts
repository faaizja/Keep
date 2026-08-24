"use client";

/**
 * Screenshot redaction.
 *
 * The image never leaves the browser. Face detection runs against a
 * model file served from Keep's own origin (public/models), so no
 * third-party service ever sees the picture, which matters because
 * these screenshots contain other children.
 *
 * Faces are found automatically. Names, @handles and phone numbers are
 * NOT: automatic text detection in the browser is slow and unreliable
 * enough that shipping it would imply a completeness we cannot deliver.
 * So the human check is mandatory rather than advisory, and the limit
 * is stated in the interface itself rather than buried in a footnote.
 *
 * Redaction is destructive by design. The blurred pixels are burned
 * into a re-encoded image and the original is discarded. There is no
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

type FaceApi = typeof import("@vladmandic/face-api");
type Scored = Box & { score: number };

function iou(a: Box, b: Box): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  if (!inter) return 0;
  return inter / (a.w * a.h + b.w * b.h - inter);
}

/** Merge overlapping detections, keeping the most confident. */
function dedupe(boxes: Scored[]): Scored[] {
  const sorted = [...boxes].sort((p, q) => q.score - p.score);
  const kept: Scored[] = [];
  for (const b of sorted) if (!kept.some((k) => iou(k, b) > 0.3)) kept.push(b);
  return kept;
}

function pad(
  b: { x: number; y: number; width: number; height: number },
  score: number,
  scale: number,
  ox: number,
  oy: number,
  maxW: number,
  maxH: number
): Scored {
  // Enough to cover hair and jaw, not so much that it swallows the
  // surrounding message. A face is not the paragraph next to it.
  const w = b.width / scale;
  const h = b.height / scale;
  const px = w * 0.16;
  const py = h * 0.2;
  const x = Math.max(0, b.x / scale + ox - px);
  const y = Math.max(0, b.y / scale + oy - py);
  return { x, y, w: Math.min(maxW - x, w + px * 2), h: Math.min(maxH - y, h + py * 2), score };
}

async function detectRegion(
  api: FaceApi,
  source: HTMLCanvasElement,
  region: { x: number; y: number; w: number; h: number },
  targetEdge: number,
  inputSize: number,
  scoreThreshold: number
): Promise<Scored[]> {
  const scale = Math.min(3, Math.max(1, targetEdge / Math.max(region.w, region.h)));
  const tile = document.createElement("canvas");
  tile.width = Math.round(region.w * scale);
  tile.height = Math.round(region.h * scale);
  const ctx = tile.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, region.x, region.y, region.w, region.h, 0, 0, tile.width, tile.height);

  const options = new api.TinyFaceDetectorOptions({ inputSize, scoreThreshold });
  const results = await api.detectAllFaces(tile, options);
  return results.map((r) =>
    pad(r.box, r.score, scale, region.x, region.y, source.width, source.height)
  );
}

/**
 * Two modes, and the difference matters.
 *
 * The default is deliberately conservative: two passes over the whole
 * frame at a high confidence threshold, tight padding, and a sanity
 * check that throws the result away if it covers so much of the picture
 * that it is obviously wrong. Over-blurring is not a safe failure: an
 * image blurred into uselessness is evidence the child cannot use, and
 * it teaches them not to trust what the tool says it found.
 *
 * `sensitive` is the opt-in second look, reached from a link that says
 * what it does: overlapping tiles, each upscaled before detection, at a
 * lower threshold. It finds small avatars and background faces, and it
 * produces false positives. That trade-off belongs to the child, made
 * knowingly, not to us by default.
 */
export async function detectFaces(
  canvas: HTMLCanvasElement,
  sensitive = false
): Promise<Box[]> {
  const ok = await loadDetector();
  if (!ok || !faceapi) return [];
  const api = faceapi;
  const W = canvas.width;
  const H = canvas.height;
  const whole = { x: 0, y: 0, w: W, h: H };
  let found: Scored[] = [];

  try {
    if (!sensitive) {
      for (const size of [416, 608]) {
        found.push(...(await detectRegion(api, canvas, whole, 608, size, 0.55)));
      }
    } else {
      for (const size of [416, 608]) {
        found.push(...(await detectRegion(api, canvas, whole, 800, size, 0.35)));
      }
      const n = 3;
      const overlap = 0.2;
      const tw = W / n;
      const th = H / n;
      for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
          const x = Math.max(0, col * tw - tw * overlap);
          const y = Math.max(0, row * th - th * overlap);
          const w = Math.min(W - x, tw * (1 + overlap * 2));
          const h = Math.min(H - y, th * (1 + overlap * 2));
          if (w < 48 || h < 48) continue;
          found.push(...(await detectRegion(api, canvas, { x, y, w, h }, 512, 416, 0.4)));
        }
      }
    }
  } catch {
    /* keep whatever was found */
  }

  found = dedupe(found);

  // Sanity check. A screenshot of a chat has a handful of faces in it,
  // not forty, and they do not cover a third of the picture. If the
  // detector says otherwise it has locked onto UI furniture, and the
  // honest answer is to blur nothing and say so.
  const area = found.reduce((sum, b) => sum + b.w * b.h, 0);
  const tooMuch = area > W * H * (sensitive ? 0.45 : 0.3);
  const tooMany = found.length > (sensitive ? 30 : 15);
  if (tooMuch || tooMany) {
    // keep only the few the detector was most sure about
    found = found.sort((a, b) => b.score - a.score).slice(0, sensitive ? 8 : 4);
    const keptArea = found.reduce((sum, b) => sum + b.w * b.h, 0);
    if (keptArea > W * H * 0.3) return [];
  }

  return found.map(({ x, y, w, h }) => ({ x, y, w, h }));
}

/** Load a File into a canvas, downscaled so huge screenshots stay usable. */
export async function fileToCanvas(file: File, maxEdge = 1600): Promise<HTMLCanvasElement> {
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
    ctx.strokeStyle = "rgba(47,93,80,0.4)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.restore();
  }
  return out;
}

export function canvasToDataUrl(canvas: HTMLCanvasElement, quality = 0.82): string {
  return canvas.toDataURL("image/jpeg", quality);
}

/** Reopen an already-redacted image for further blurring. */
export async function dataUrlToCanvas(dataUrl: string): Promise<HTMLCanvasElement> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  return canvas;
}
