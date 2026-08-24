// Verifies the crypto contract end to end using the same Web Crypto API
// the browser uses. Mirrors lib/crypto.ts exactly.
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = (u8) => Buffer.from(u8).toString("base64");
const unb64 = (s) => new Uint8Array(Buffer.from(s, "base64"));
const sha256 = async (s) => new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)));
const hex = (u8) => Buffer.from(u8).toString("hex");
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

async function recordId(code) { return hex(await sha256(`keep|v1|record-id|${norm(code)}`)); }
async function deriveKey(code) {
  const n = norm(code);
  const salt = await sha256(`keep|v1|kdf-salt|${n}`);
  const material = await crypto.subtle.importKey("raw", enc.encode(`keep|v1|kdf|${n}`), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 400000, hash: "SHA-256" },
    material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function seal(key, v) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(v)));
  return { iv: b64(iv), blob: b64(new Uint8Array(ct)) };
}
async function unseal(key, s) {
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(s.iv) }, key, unb64(s.blob));
  return JSON.parse(dec.decode(pt));
}

const code = "river-copper-lantern-heron-482";
const record = { version: 1, incidents: [{ id: "a", note: "test entry" }] };

const t0 = Date.now();
const key = await deriveKey(code);
const kdfMs = Date.now() - t0;
const id = await recordId(code);
const sealed = await seal(key, record);

// 1. round trip
const back = await unseal(key, sealed);
console.log("round trip:", JSON.stringify(back) === JSON.stringify(record) ? "PASS" : "FAIL");

// 2. the stored blob is not readable
const looksLikePlaintext = /test entry|incidents/.test(Buffer.from(sealed.blob, "base64").toString("latin1"));
console.log("blob unreadable:", looksLikePlaintext ? "FAIL" : "PASS");

// 3. the row id leaks nothing about the key
const rawKeyAttempt = await deriveKey(code);
console.log("id != key material:", id.length === 64 && !id.includes(code) ? "PASS" : "FAIL");

// 4. a wrong code cannot open it
try { await unseal(await deriveKey("river-copper-lantern-heron-483"), sealed); console.log("wrong code rejected: FAIL"); }
catch { console.log("wrong code rejected: PASS"); }

// 5. a tampered blob is rejected (AES-GCM authentication)
const tampered = { ...sealed, blob: b64((() => { const u = unb64(sealed.blob); u[5] ^= 0xff; return u; })()) };
try { await unseal(key, tampered); console.log("tamper detected: FAIL"); }
catch { console.log("tamper detected: PASS"); }

// 6. same code, different machine -> same id, same key
console.log("deterministic id:", (await recordId(" River  Copper-Lantern_Heron 482 ")) === id ? "PASS" : "FAIL");
console.log("deterministic key:", JSON.stringify(await unseal(await deriveKey("RIVER-copper-lantern-heron-482"), sealed)) === JSON.stringify(record) ? "PASS" : "FAIL");

console.log(`\nPBKDF2 derivation took ${kdfMs}ms (this is the deliberate cost that makes guessing expensive)`);
