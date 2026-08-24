"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Sealed } from "./crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

/**
 * Keep degrades gracefully. If no Supabase project is configured the app
 * still works completely. The record simply lives in this browser only
 * and cannot be picked up on another machine. Nothing silently breaks.
 */
export function supabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (!client) client = createClient(url, anonKey, { auth: { persistSession: false } });
  return client;
}

export const syncAvailable = () => Boolean(url && anonKey);

/* --------------------------- records ----------------------------- */

export async function putRecord(id: string, sealed: Sealed): Promise<void> {
  const sb = supabase();
  if (!sb) return;
  const { error } = await sb
    .from("records")
    .upsert({ id, iv: sealed.iv, blob: sealed.blob, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export async function getRecord(id: string): Promise<Sealed | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data, error } = await sb.from("records").select("iv, blob").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { iv: data.iv, blob: data.blob } : null;
}

/* ---------------------------- shares ----------------------------- */

export type ShareRow = {
  id: string;
  iv: string;
  blob: string;
  revoked: boolean;
  received_at: string | null;
};

export async function putShare(id: string, sealed: Sealed): Promise<void> {
  const sb = supabase();
  if (!sb) throw new Error("Sharing needs a connection. Try again when you're online.");
  const { error } = await sb
    .from("shares")
    .insert({ id, iv: sealed.iv, blob: sealed.blob, revoked: false });
  if (error) throw new Error(error.message);
}

export async function getShare(id: string): Promise<ShareRow | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("shares")
    .select("id, iv, blob, revoked, received_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ShareRow) ?? null;
}

/** The recipient marks it read. This is what the child sees come back. */
export async function markShareReceived(id: string): Promise<string | null> {
  const sb = supabase();
  if (!sb) return null;
  const now = new Date().toISOString();
  const { error } = await sb
    .from("shares")
    .update({ received_at: now })
    .eq("id", id)
    .is("received_at", null);
  if (error) throw new Error(error.message);
  return now;
}

/** One tap from the child. The bundle is emptied and the link goes dead. */
export async function revokeShare(id: string): Promise<void> {
  const sb = supabase();
  if (!sb) return;
  const { error } = await sb
    .from("shares")
    .update({ revoked: true, blob: "", iv: "" })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getShareStatuses(
  ids: string[]
): Promise<Record<string, { revoked: boolean; received_at: string | null }>> {
  const sb = supabase();
  if (!sb || ids.length === 0) return {};
  const { data, error } = await sb
    .from("shares")
    .select("id, revoked, received_at")
    .in("id", ids);
  if (error) throw new Error(error.message);
  return Object.fromEntries(
    (data ?? []).map((r) => [r.id, { revoked: r.revoked, received_at: r.received_at }])
  );
}
