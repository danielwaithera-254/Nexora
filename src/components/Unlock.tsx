import { useState, type FormEvent } from "react";
import { ShieldCheck, KeyRound, Eye, EyeOff, Lock, Moon, Sun, AlertTriangle } from "lucide-react";
import { cn } from "../utils/cn";

function strengthOf(pass: string): { label: string; color: string; pct: number } {
  if (pass.length === 0) return { label: "", color: "", pct: 0 };
  let score = 0;
  if (pass.length >= 8) score++;
  if (pass.length >= 12) score++;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
  if (/\d/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;
  if (score <= 2) return { label: "Weak", color: "var(--loss)", pct: 33 };
  if (score <= 3) return { label: "Okay", color: "var(--warn)", pct: 66 };
  return { label: "Strong", color: "var(--gain)", pct: 100 };
}

export default function Unlock({
  mode,
  dark,
  onToggleDark,
  onReady,
}: {
  mode: "create" | "unlock" | "error";
  dark: boolean;
  onToggleDark: () => void;
  onReady: () => void;
}) {
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const strength = strengthOf(pass);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (pass.length < 8) {
      setErr("Use at least 8 characters — this passphrase is the only key to your data.");
      return;
    }
    if (pass !== confirm) {
      setErr("The two passphrases don't match.");
      return;
    }
    setBusy(true);
    try {
      const { createVault, migrateLegacy } = await import("../lib/vault");
      await createVault(pass, remember);
      migrateLegacy();
      onReady();
    } catch {
      setErr("Couldn't create the vault. Try a different passphrase.");
      setBusy(false);
    }
  };

  const handleUnlock = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const { unlockVault, migrateLegacy } = await import("../lib/vault");
      const ok = await unlockVault(pass, remember);
      if (!ok) {
        setErr("Wrong passphrase — the vault stays sealed.");
        setBusy(false);
        return;
      }
      migrateLegacy();
      onReady();
    } catch {
      setErr("Something went wrong while unlocking.");
      setBusy(false);
    }
  };

  const isCreate = mode === "create";

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="themed flex items-center justify-between border-b border-edge px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="brand-gradient grid h-8 w-8 place-items-center rounded-xl text-white shadow-[0_6px_18px_-6px_var(--brand-ring)]">
            <ShieldCheck size={16} />
          </span>
          <span className="font-display text-[15px] font-bold tracking-tight text-ink">Nexora Vault</span>
        </div>
        <button
          onClick={onToggleDark}
          className="rounded-xl border border-edge bg-panel p-2 text-mut transition-all hover:border-brand/40 hover:text-brand active:scale-90"
          aria-label="Toggle dark mode"
        >
          {dark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </header>

      <main className="flex flex-1 items-center justify-center p-5">
        <div className="sheen w-full max-w-[400px] rounded-2xl border border-edge bg-panel p-7 shadow-2xl">
          <div className="mb-5 flex flex-col items-center text-center">
            <span className="brand-gradient mb-4 grid h-14 w-14 place-items-center rounded-2xl text-white shadow-[0_10px_26px_-8px_var(--brand-ring)]">
              {isCreate ? <KeyRound size={24} /> : <Lock size={24} />}
            </span>
            <h1 className="font-display text-xl font-bold tracking-tight text-ink">
              {isCreate ? "Create your vault" : "Unlock Nexora"}
            </h1>
            <p className="mt-1.5 max-w-[300px] text-[11.5px] leading-relaxed text-mut">
              {isCreate
                ? "One passphrase encrypts your trades, notes, playbooks and screenshots with AES-256. Nothing leaves this computer."
                : "Your data is AES-256 encrypted on this device. Enter your passphrase to decrypt it."}
            </p>
          </div>

          {mode === "error" ? (
            <div className="rounded-xl border border-loss/30 bg-loss/10 p-4 text-[11.5px] leading-relaxed text-mut">
              <span className="flex items-center gap-2 font-extrabold text-loss">
                <AlertTriangle size={14} /> Secure context required
              </span>
              <p className="mt-1.5">
                This browser can't run the WebCrypto encryption (needed to protect your data). Open Nexora through
                <span className="mx-1 rounded bg-panel2 px-1.5 py-0.5 font-mono text-[10.5px] text-ink">http://localhost</span>
                or a secure (https) address.
              </p>
            </div>
          ) : (
            <form onSubmit={isCreate ? handleCreate : handleUnlock} className="space-y-3.5">
              <div>
                <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-mut">
                  Passphrase
                </label>
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    value={pass}
                    onChange={(e) => {
                      setPass(e.target.value);
                      setErr(null);
                    }}
                    autoFocus
                    placeholder={isCreate ? "At least 8 characters" : "Your passphrase"}
                    className="w-full rounded-xl border border-edge bg-panel2 px-3.5 py-2.5 pr-10 text-[13px] font-semibold text-ink outline-none transition-all placeholder:text-faint focus:border-brand/60 focus:ring-2 focus:ring-brand/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-faint transition-colors hover:text-brand"
                    aria-label={show ? "Hide passphrase" : "Show passphrase"}
                  >
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {isCreate && pass.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-edge">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${strength.pct}%`, backgroundColor: strength.color }}
                      />
                    </div>
                    <span className="w-12 text-right text-[9.5px] font-extrabold uppercase tracking-wider" style={{ color: strength.color }}>
                      {strength.label}
                    </span>
                  </div>
                )}
              </div>

              {isCreate && (
                <div>
                  <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-mut">
                    Confirm passphrase
                  </label>
                  <input
                    type={show ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => {
                      setConfirm(e.target.value);
                      setErr(null);
                    }}
                    placeholder="Repeat it exactly"
                    className="w-full rounded-xl border border-edge bg-panel2 px-3.5 py-2.5 text-[13px] font-semibold text-ink outline-none transition-all placeholder:text-faint focus:border-brand/60 focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              )}

              {err && (
                <p className="flex items-start gap-1.5 rounded-lg bg-loss/10 px-3 py-2 text-[11px] font-bold text-loss">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {err}
                </p>
              )}

              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-edge bg-panel2 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-3.5 w-3.5 accent-[var(--brand)]"
                />
                <span className="text-[11px] font-semibold text-mut">
                  Keep unlocked for this browser session
                  <span className="block text-[9.5px] font-medium text-faint">
                    You won't be asked again until the browser is closed. Data stays encrypted on disk.
                  </span>
                </span>
              </label>

              <button
                type="submit"
                disabled={busy}
                className={cn(
                  "brand-gradient w-full rounded-xl px-4 py-3 text-[12.5px] font-extrabold text-white shadow-[0_10px_24px_-8px_var(--brand-ring)] transition-all",
                  busy ? "cursor-wait opacity-70" : "hover:-translate-y-px hover:shadow-[0_14px_30px_-10px_var(--brand-ring)] active:translate-y-0 active:scale-[0.99]"
                )}
              >
                {busy ? "Decrypting…" : isCreate ? "Encrypt & enter" : "Unlock"}
              </button>

              {!isCreate && (
                <p className="text-center text-[10px] font-medium text-faint">
                  Forgot your passphrase? The vault cannot be recovered — that's what makes it private.
                </p>
              )}
            </form>
          )}
        </div>
      </main>

      <footer className="border-t border-edge px-5 py-3 text-center text-[10px] font-medium text-faint">
        Vault is local-first: encrypted with AES-256-GCM (PBKDF2-SHA256 · 310k iterations) · your browser never sends your data anywhere
      </footer>
    </div>
  );
}
