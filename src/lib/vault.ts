/* ------------------------------------------------------------------ */
/* Nexora vault — AES-256-GCM encrypted local storage.                  */
/*                                                                      */
/* Everything the journal saves lives in a single encrypted blob in     */
/* localStorage. It can only be decrypted with your passphrase.         */
/* While the browser session lives, the derived key is cached in        */
/* sessionStorage (cleared when the browser closes) so you only unlock  */
/* once per session. Nothing is ever sent to a network.                 */
/* ------------------------------------------------------------------ */

const VAULT_LS = "nexora-vault";
const SESSION_KEY = "nexora-vault-key";
const PBKDF2_ITERS = 310_000;
const SALT_LEN = 16;
const IV_LEN = 12;

type Blob = { v: 1; salt: string; iv: string; data: string };

let state: Record<string, unknown> = {};
let key: CryptoKey | null = null;
let salt: Uint8Array<ArrayBuffer> = new Uint8Array(0);
let persistTimer: number | null = null;

const enc = new TextEncoder();
const dec = new TextDecoder();

const toB64 = (u8: Uint8Array): string => {
  let bin = "";
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(bin);
};

const fromB64 = (s: string): Uint8Array<ArrayBuffer> => {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

/** Copy a byte view onto a real ArrayBuffer so it satisfies BufferSource. */
const copy = (u8: Uint8Array): Uint8Array<ArrayBuffer> => new Uint8Array(u8);

const readBlob = (): Blob | null => {
  const raw = localStorage.getItem(VAULT_LS);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Blob;
  } catch {
    return null;
  }
};

async function derive(pass: string, s: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", copy(enc.encode(pass)), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: s, iterations: PBKDF2_ITERS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

async function decryptState(k: CryptoKey, blob: Blob): Promise<Record<string, unknown>> {
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: copy(fromB64(blob.iv)) }, k, copy(fromB64(blob.data)));
  const parsed = JSON.parse(dec.decode(pt));
  return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
}

function persistNow() {
  if (!key) return;
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const plain = copy(enc.encode(JSON.stringify(state)));
  void crypto.subtle
    .encrypt({ name: "AES-GCM", iv }, key, plain)
    .then((ct) => {
      const blob: Blob = { v: 1, salt: toB64(salt), iv: toB64(iv), data: toB64(new Uint8Array(ct)) };
      localStorage.setItem(VAULT_LS, JSON.stringify(blob));
    })
    .catch(() => {});
}

function schedulePersist() {
  if (persistTimer !== null) window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    persistNow();
  }, 400);
}

async function rememberKey(k: CryptoKey) {
  try {
    const raw = new Uint8Array(await crypto.subtle.exportKey("raw", k));
    sessionStorage.setItem(SESSION_KEY, toB64(raw));
  } catch {
    /* no session cache (e.g. storage blocked) — fine, user unlocks again */
  }
}

export const canUseVault = () => typeof crypto !== "undefined" && !!crypto.subtle;

export const vaultExists = () => !!localStorage.getItem(VAULT_LS);

export const vaultUnlocked = () => key !== null;

/** First run — creates a fresh encrypted vault. */
export async function createVault(pass: string, remember: boolean): Promise<void> {
  salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  key = await derive(pass, salt);
  state = {};
  persistNow();
  if (remember) await rememberKey(key);
}

/** Unlock with the passphrase. Returns false on wrong passphrase. */
export async function unlockVault(pass: string, remember: boolean): Promise<boolean> {
  const blob = readBlob();
  if (!blob) return false;
  try {
    salt = fromB64(blob.salt);
    const k = await derive(pass, salt);
    state = await decryptState(k, blob);
    key = k;
    if (remember) await rememberKey(k);
    return true;
  } catch {
    key = null;
    return false;
  }
}

/** Silent unlock using the session cache (same browser session). */
export async function trySessionUnlock(): Promise<boolean> {
  const blob = readBlob();
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!blob || !raw) return false;
  try {
    salt = fromB64(blob.salt);
    const k = await crypto.subtle.importKey("raw", fromB64(raw), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
    state = await decryptState(k, blob);
    key = k;
    return true;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return false;
  }
}

/** Drop the key — data stays encrypted on disk until the passphrase is entered again. */
export function lockVault() {
  key = null;
  salt = new Uint8Array(0);
  state = {};
  sessionStorage.removeItem(SESSION_KEY);
}

export function vaultGet<T>(k: string, fallback: T): T {
  return k in state ? (state[k] as T) : fallback;
}

export function vaultSet(k: string, value: unknown) {
  state[k] = value;
  schedulePersist();
}

const LEGACY_KEYS: Array<[string, string]> = [
  ["nexora-playbooks", "playbooks"],
  ["nexora-trade-reviews", "reviews"],
  ["nexora-trade-attachments", "tradeAttachments"],
  ["nexora-daily-notes", "dailyNotes"],
  ["nexora-attachments", "attachments"],
  ["nexora-notebook-v1", "notebook"],
  ["nexora-trades", "trades"],
];

/**
 * One-time move of data saved before the vault existed into the vault,
 * then wipe the plaintext copies. Call right after a successful unlock.
 */
export function migrateLegacy() {
  let changed = false;
  for (const [legacy, k] of LEGACY_KEYS) {
    const raw = localStorage.getItem(legacy);
    if (raw == null) continue;
    try {
      state[k] = JSON.parse(raw);
    } catch {
      /* unreadable — drop it, keep defaults */
    }
    localStorage.removeItem(legacy);
    changed = true;
  }
  if (changed) persistNow();
}

/** Re-encrypt the vault under a new passphrase (verifies the old one first). */
export async function changePassphrase(oldPass: string, newPass: string, remember: boolean): Promise<boolean> {
  const blob = readBlob();
  if (!blob || newPass.length < 8) return false;
  try {
    const oldKey = await derive(oldPass, fromB64(blob.salt));
    const parsed = await decryptState(oldKey, blob);
    salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
    key = await derive(newPass, salt);
    state = parsed;
    persistNow();
    if (remember) await rememberKey(key);
    return true;
  } catch {
    return false;
  }
}

/** Plaintext copy of the decrypted state, for a local backup export. */
export function exportState(): string {
  return JSON.stringify(state, null, 2);
}

/** Replace the vault contents from an exported backup (validated JSON object). */
export function importState(json: string): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return false;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
  state = parsed as Record<string, unknown>;
  persistNow();
  return true;
}