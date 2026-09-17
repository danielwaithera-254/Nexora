/* ------------------------------------------------------------------ */
/* Nexora cloud — email/password auth + cross-device sync (Supabase).  */
/*                                                                      */
/* Everything the journal saves (accounts + CSV trades, journal, goals, */
/* settings, synced ids) is snapshotted as JSON to one row per user in  */
/* the `nexora_state` table. Last write wins via updated_at.            */
/*                                                                      */
/* If VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set,           */
/* CLOUD_ENABLED is false and the app runs 100% local (current UX).     */
/* ------------------------------------------------------------------ */

import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { vaultGet, vaultSet } from "./vault";

const URL = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
const ANON = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;

export const CLOUD_ENABLED = Boolean(URL && ANON);
const TABLE = "nexora_state";
const LOCAL_TS_KEY = "nexora-cloud-ts";

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient | null {
  if (!CLOUD_ENABLED) return null;
  if (!client) client = createClient(URL!, ANON!);
  return client;
}

export type { Session };

export interface CloudSnapshot {
  accounts: unknown;
  synced: unknown;
  journal: unknown;
  goals: unknown;
  settings: unknown;
}

const SYNC_KEYS: (keyof CloudSnapshot)[] = ["accounts", "synced", "journal", "goals", "settings"];
const STORE_KEY: Record<keyof CloudSnapshot, string> = {
  accounts: "nexora-accounts",
  synced: "nexora-synced-accounts",
  journal: "nexora-trade-journal",
  goals: "nexora-goals",
  settings: "settings",
};

/* ---------- auth ---------- */

export async function signUp(email: string, password: string): Promise<{ session: Session | null; needsConfirm: boolean; error?: string }> {
  const sb = supabase();
  if (!sb) return { session: null, needsConfirm: false, error: "Cloud not configured." };
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) return { session: null, needsConfirm: false, error: error.message };
  if (data.session) return { session: data.session, needsConfirm: false };
  return { session: null, needsConfirm: true };
}

export async function signIn(email: string, password: string): Promise<{ session: Session | null; error?: string }> {
  const sb = supabase();
  if (!sb) return { session: null, error: "Cloud not configured." };
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { session: null, error: error.message };
  return { session: data.session };
}

export async function signOut(): Promise<void> {
  try { await supabase()?.auth.signOut(); } catch {}
  client = null;
}

export async function getSession(): Promise<Session | null> {
  try {
    const { data } = await supabase()!.auth.getSession();
    return data.session;
  } catch {
    return null;
  }
}

export function onAuthChange(cb: (s: Session | null) => void): () => void {
  const sb = supabase();
  if (!sb) return () => {};
  const { data } = sb.auth.onAuthStateChange((_e, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

/* ---------- local snapshot helpers ---------- */

function readStore(storeKey: string): unknown {
  try {
    const v = vaultGet(storeKey, undefined as unknown);
    if (v !== undefined && v !== null) return v;
  } catch {}
  try {
    const ls = localStorage.getItem(storeKey);
    if (ls) return JSON.parse(ls);
  } catch {}
  try {
    const fb = localStorage.getItem(`${storeKey}-fallback`);
    if (fb) return JSON.parse(fb);
  } catch {}
  return null;
}

function writeStore(storeKey: string, value: unknown) {
  try { vaultSet(storeKey, value); } catch {}
  try { localStorage.setItem(storeKey, JSON.stringify(value)); } catch {}
  try { localStorage.setItem(`${storeKey}-fallback`, JSON.stringify(value)); } catch {}
}

export function readLocalSnapshot(): CloudSnapshot {
  return {
    accounts: readStore(STORE_KEY.accounts) ?? [],
    synced: readStore(STORE_KEY.synced) ?? [],
    journal: readStore(STORE_KEY.journal) ?? {},
    goals: readStore(STORE_KEY.goals) ?? [],
    settings: readStore(STORE_KEY.settings) ?? {},
  };
}

export function applySnapshot(snap: CloudSnapshot) {
  (Object.keys(STORE_KEY) as (keyof CloudSnapshot)[]).forEach((k) => {
    const v = (snap as any)?.[k];
    if (v !== undefined && v !== null) writeStore(STORE_KEY[k], v);
  });
}

export function readAccounts(): any[] {
  const v = readStore(STORE_KEY.accounts);
  return Array.isArray(v) ? v : [];
}

export function getLocalTs(): string {
  try { return localStorage.getItem(LOCAL_TS_KEY) || ""; } catch { return ""; }
}

export function setLocalTs(ts: string) {
  try { localStorage.setItem(LOCAL_TS_KEY, ts); } catch {}
}

/* ---------- cloud read/write ---------- */

export async function pullState(): Promise<{ data: CloudSnapshot; updatedAt: string } | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data, error } = await sb.from(TABLE).select("data, updated_at").eq("user_id", user.id).maybeSingle();
  if (error || !data) return null;
  return { data: (data.data as CloudSnapshot) ?? { accounts: [], synced: [], journal: {}, goals: [], settings: {} }, updatedAt: data.updated_at as string };
}

export async function pushState(snap: CloudSnapshot): Promise<string> {
  const sb = supabase();
  if (!sb) throw new Error("Cloud not configured.");
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const ts = new Date().toISOString();
  const { error } = await sb.from(TABLE).upsert(
    { user_id: user.id, data: snap as any, updated_at: ts },
    { onConflict: "user_id" }
  );
  if (error) throw new Error(error.message);
  return ts;
}

export function snapshotHash(snap: CloudSnapshot): string {
  try {
    const s = JSON.stringify(snap);
    let h = 0;
    for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
    return String(h);
  } catch {
    return String(Date.now());
  }
}

export { SYNC_KEYS };
