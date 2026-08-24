"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  deriveKey,
  generateKeepCode,
  normaliseCode,
  recordId,
  seal,
  unseal,
  type Sealed,
} from "./crypto";
import { idbClear, idbGet, idbSet } from "./idb";
import { getRecord, putRecord, syncAvailable } from "./supabase";
import { EMPTY_RECORD, type Incident, type KeepRecord } from "./types";
import { DEMO_RECORD, DEMO_CODE } from "./demo";

const LOCAL_KEY = (id: string) => `record:${id}`;
const IDLE_MS = 5 * 60 * 1000;

type Status = "idle" | "unlocking" | "ready" | "error";

type Ctx = {
  status: Status;
  error: string | null;
  /** the record in memory. Never written to disk unsealed. */
  record: KeepRecord | null;
  code: string | null;
  isDemo: boolean;
  syncing: boolean;
  syncError: string | null;
  /** true when a Supabase project is configured */
  canSync: boolean;

  begin: () => Promise<string>;
  unlock: (code: string) => Promise<boolean>;
  openDemo: () => void;
  addIncident: (incident: Incident) => Promise<void>;
  replaceIncident: (incident: Incident) => Promise<void>;
  removeIncident: (id: string) => Promise<void>;
  patchRecord: (patch: Partial<KeepRecord>) => Promise<void>;
  wipe: () => Promise<void>;
};

const KeepCtx = createContext<Ctx | null>(null);

export function KeepProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<KeepRecord | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  /** The AES key lives here and nowhere else. Never serialised. */
  const keyRef = useRef<CryptoKey | null>(null);
  /** Mirrors `record` so mutations never run inside a state updater. */
  const recordRef = useRef<KeepRecord | null>(null);
  const idRef = useRef<string | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    recordRef.current = record;
  }, [record]);

  const wipe = useCallback(async () => {
    keyRef.current = null;
    recordRef.current = null;
    idRef.current = null;
    setRecord(null);
    setCode(null);
    setIsDemo(false);
    setStatus("idle");
    try {
      await idbClear();
    } catch {
      /* nothing to clear */
    }
  }, []);

  /* ---- leaving the page, or walking away, clears this machine ---- */

  const resetIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      void wipe();
    }, IDLE_MS);
  }, [wipe]);

  useEffect(() => {
    if (status !== "ready" || isDemo) return;
    const events = ["pointerdown", "keydown", "scroll", "visibilitychange"];
    events.forEach((e) => window.addEventListener(e, resetIdle, { passive: true }));
    resetIdle();
    const onUnload = () => {
      void idbClear();
    };
    window.addEventListener("pagehide", onUnload);
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetIdle));
      window.removeEventListener("pagehide", onUnload);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [status, isDemo, resetIdle]);

  /* ------------------------- persistence ------------------------- */

  const persist = useCallback(
    async (next: KeepRecord) => {
      recordRef.current = next;
      setRecord(next);
      if (isDemo || !keyRef.current || !idRef.current) return;
      const sealed = await seal(keyRef.current, next);
      await idbSet(LOCAL_KEY(idRef.current), sealed);
      if (syncAvailable()) {
        setSyncing(true);
        try {
          await putRecord(idRef.current, sealed);
          setSyncError(null);
        } catch (e) {
          // The sealed local copy still stands, so nothing is lost, but
          // the child needs to know their Keep code won't work elsewhere
          // yet, rather than finding out on a library computer.
          setSyncError(e instanceof Error ? e.message : "Couldn't reach the store.");
        } finally {
          setSyncing(false);
        }
      }
    },
    [isDemo]
  );

  /* --------------------------- actions --------------------------- */

  const begin = useCallback(async () => {
    const fresh = generateKeepCode();
    const key = await deriveKey(fresh);
    const id = await recordId(fresh);
    keyRef.current = key;
    idRef.current = id;
    setCode(fresh);
    setIsDemo(false);
    const blank = EMPTY_RECORD();
    recordRef.current = blank;
    setRecord(blank);
    setStatus("ready");
    const sealed = await seal(key, blank);
    await idbSet(LOCAL_KEY(id), sealed);
    if (syncAvailable()) {
      try {
        await putRecord(id, sealed);
      } catch {
        /* the record still exists locally */
      }
    }
    return fresh;
  }, []);

  const unlock = useCallback(async (input: string) => {
    setStatus("unlocking");
    setError(null);
    const normalised = normaliseCode(input);
    if (normalised === DEMO_CODE) {
      const demo = DEMO_RECORD();
      setIsDemo(true);
      recordRef.current = demo;
      setRecord(demo);
      setCode(DEMO_CODE);
      setStatus("ready");
      return true;
    }
    try {
      const key = await deriveKey(normalised);
      const id = await recordId(normalised);

      let sealed: Sealed | null = (await idbGet<Sealed>(LOCAL_KEY(id))) ?? null;
      if (!sealed) sealed = await getRecord(id);
      if (!sealed) {
        setStatus("error");
        setError("We couldn't find a record for that code. Check the spelling and try again.");
        return false;
      }

      const value = await unseal<KeepRecord>(key, sealed);
      keyRef.current = key;
      idRef.current = id;
      recordRef.current = value;
      setRecord(value);
      setCode(normalised);
      setIsDemo(false);
      setStatus("ready");
      return true;
    } catch {
      setStatus("error");
      setError("That code didn't open anything. Check the spelling and try again.");
      return false;
    }
  }, []);

  const openDemo = useCallback(() => {
    const demo = DEMO_RECORD();
    setIsDemo(true);
    recordRef.current = demo;
    setRecord(demo);
    setCode(null);
    setStatus("ready");
  }, []);

  const mutate = useCallback(
    async (fn: (r: KeepRecord) => KeepRecord) => {
      const current = recordRef.current;
      if (!current) return;
      const next = { ...fn(current), updatedAt: new Date().toISOString() };
      recordRef.current = next;
      await persist(next);
    },
    [persist]
  );

  const addIncident = useCallback(
    (incident: Incident) =>
      mutate((r) =>
        // React runs effects twice in development; an append must be
        // idempotent or the same entry lands in the record twice.
        r.incidents.some((i) => i.id === incident.id)
          ? r
          : { ...r, incidents: [...r.incidents, incident] }
      ),
    [mutate]
  );

  const replaceIncident = useCallback(
    (incident: Incident) =>
      mutate((r) => ({
        ...r,
        incidents: r.incidents.map((i) => (i.id === incident.id ? incident : i)),
      })),
    [mutate]
  );

  const removeIncident = useCallback(
    (id: string) => mutate((r) => ({ ...r, incidents: r.incidents.filter((i) => i.id !== id) })),
    [mutate]
  );

  const patchRecord = useCallback(
    (patch: Partial<KeepRecord>) => mutate((r) => ({ ...r, ...patch })),
    [mutate]
  );

  const value = useMemo<Ctx>(
    () => ({
      status,
      error,
      record,
      code,
      isDemo,
      syncing,
      syncError,
      canSync: syncAvailable(),
      begin,
      unlock,
      openDemo,
      addIncident,
      replaceIncident,
      removeIncident,
      patchRecord,
      wipe,
    }),
    [
      status, error, record, code, isDemo, syncing, syncError,
      begin, unlock, openDemo, addIncident, replaceIncident, removeIncident, patchRecord, wipe,
    ]
  );

  return <KeepCtx.Provider value={value}>{children}</KeepCtx.Provider>;
}

export function useKeep(): Ctx {
  const ctx = useContext(KeepCtx);
  if (!ctx) throw new Error("useKeep must be used inside <KeepProvider>");
  return ctx;
}
