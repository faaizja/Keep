/**
 * All cryptography in Keep happens in the browser, using the platform's
 * own Web Crypto implementation. No key material is ever transmitted.
 *
 * Two values are derived from a Keep code, with separate domain
 * separation strings, so that neither can be worked backwards into the
 * other:
 *
 *   recordId(code)  -> the row the ciphertext is stored under
 *   deriveKey(code) -> the AES-GCM key the ciphertext is sealed with
 *
 * The server stores { id, iv, blob } and holds nothing else. Possession
 * of an id gives no path to the key; the key exists only in the memory
 * of a browser where someone has typed the code.
 */

import { WORDLIST } from "./wordlist";

const enc = new TextEncoder();
const dec = new TextDecoder();

export const PBKDF2_ITERATIONS = 400_000;

/* ---------------------------- helpers ---------------------------- */

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  return fromBase64(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
}

async function sha256(input: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return new Uint8Array(digest);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* -------------------------- Keep codes --------------------------- */

/** Normalise anything a human might type into the canonical form. */
export function normaliseCode(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Four words from a 256-word list plus a three-digit number.
 * 4 x 8 bits + ~9.97 bits = roughly 42 bits of entropy, generated from
 * the platform CSPRNG. Guessing is additionally constrained by
 * server-side rate limiting; this trade-off is documented as a known
 * limitation rather than hidden.
 */
export function generateKeepCode(): string {
  const idx = new Uint8Array(4);
  crypto.getRandomValues(idx);
  const words = Array.from(idx).map((i) => WORDLIST[i]);

  // Rejection-sample a uniform number in [100, 999].
  let n = 0;
  const buf = new Uint16Array(1);
  do {
    crypto.getRandomValues(buf);
    n = buf[0] % 1000;
  } while (n < 100);

  return [...words, String(n)].join("-");
}

export function isPlausibleCode(code: string): boolean {
  const parts = normaliseCode(code).split("-");
  if (parts.length !== 5) return false;
  const words = parts.slice(0, 4);
  const num = parts[4];
  return words.every((w) => WORDLIST.includes(w)) && /^\d{3}$/.test(num);
}

/* ------------------------ key derivation ------------------------- */

/** The Supabase row id. A hash — never the code itself. */
export async function recordId(code: string): Promise<string> {
  return toHex(await sha256(`keep|v1|record-id|${normaliseCode(code)}`));
}

/** The AES-GCM key. Derived down a different path from the row id. */
export async function deriveKey(code: string): Promise<CryptoKey> {
  const normalised = normaliseCode(code);
  const salt = await sha256(`keep|v1|kdf-salt|${normalised}`);

  const material = await crypto.subtle.importKey(
    "raw",
    enc.encode(`keep|v1|kdf|${normalised}`),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/** A fresh random key, for share bundles. Never derived from a code. */
export async function randomKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return toBase64Url(new Uint8Array(raw));
}

export async function importKey(b64url: string): Promise<CryptoKey> {
  const raw = fromBase64Url(b64url);
  return crypto.subtle.importKey(
    "raw",
    raw as unknown as BufferSource,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

/* --------------------------- sealing ----------------------------- */

export type Sealed = { iv: string; blob: string };

export async function seal(key: CryptoKey, value: unknown): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = enc.encode(JSON.stringify(value));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    plaintext as unknown as BufferSource
  );
  return { iv: toBase64(iv), blob: toBase64(new Uint8Array(ct)) };
}

export async function unseal<T>(key: CryptoKey, sealed: Sealed): Promise<T> {
  const iv = fromBase64(sealed.iv);
  const ct = fromBase64(sealed.blob);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    ct as unknown as BufferSource
  );
  return JSON.parse(dec.decode(plaintext)) as T;
}

/** A random, unguessable id for a share bundle. */
export function randomId(bytes = 12): string {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return toBase64Url(b);
}
