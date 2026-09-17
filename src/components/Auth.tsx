import { useState } from "react";
import { LogIn, UserPlus, Eye, EyeOff, CloudOff } from "lucide-react";
import { signIn, signUp } from "../lib/cloud";
import { cn } from "../utils/cn";

export default function Auth({ onOffline }: { onOffline: () => void }) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCheckEmail(false);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError("Enter a valid email address."); return; }
    if (password.length < 6) { setError("Password needs at least 6 characters."); return; }
    setBusy(true);
    try {
      if (mode === "in") {
        const r = await signIn(email.trim(), password);
        if (r.error || !r.session) setError(r.error ?? "Could not sign in.");
        // success → onAuthStateChange in App flips the gate automatically
      } else {
        const r = await signUp(email.trim(), password);
        if (r.error) setError(r.error);
        else if (r.needsConfirm) setCheckEmail(true);
        // success with session → gate flips automatically
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white shadow-lg">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <path d="M6 22l6-8 5 5 9-12" stroke="#7c3aed" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="26" cy="7" r="3" fill="#a855f7" />
            </svg>
          </span>
          <div>
            <p className="font-display text-[22px] font-bold leading-none text-ink">Nex<span className="text-brand">ora</span></p>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-faint">Trading Journal</p>
          </div>
        </div>

        <div className="rounded-2xl border border-edge bg-panel p-6 shadow-[var(--shadow-lg)]">
          <div className="flex gap-1 rounded-xl bg-panel2 p-1">
            {(["in", "up"] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(null); setCheckEmail(false); }}
                className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold",
                  mode === m ? "bg-brand text-white shadow" : "text-mut hover:text-ink")}>
                {m === "in" ? <LogIn size={14} /> : <UserPlus size={14} />}
                {m === "in" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {checkEmail ? (
            <div className="mt-4 rounded-xl border border-brand/30 bg-brand-soft p-4 text-center">
              <p className="text-sm font-bold text-ink">Check your inbox</p>
              <p className="mt-1 text-xs text-mut">We sent a confirmation link to <b className="text-ink">{email}</b>. Click it, then come back and sign in.</p>
              <button onClick={() => { setCheckEmail(false); setMode("in"); }} className="mt-3 rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white">I confirmed — sign in</button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-mut">Email</span>
                <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-edge bg-panel2 px-3 py-2.5 text-sm text-ink outline-none placeholder:text-faint focus:border-brand" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-mut">Password</span>
                <div className="relative">
                  <input type={show ? "text" : "password"} autoComplete={mode === "in" ? "current-password" : "new-password"}
                    value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                    className="w-full rounded-xl border border-edge bg-panel2 px-3 py-2.5 pr-10 text-sm text-ink outline-none placeholder:text-faint focus:border-brand" />
                  <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-faint hover:text-ink" aria-label="Toggle password">
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </label>
              {error && <p className="rounded-xl border border-loss/30 bg-loss-soft px-3 py-2 text-xs font-semibold text-loss">{error}</p>}
              <button type="submit" disabled={busy}
                className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-deep disabled:opacity-50">
                {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
              </button>
            </form>
          )}

          <p className="mt-3 text-center text-[11px] leading-relaxed text-faint">
            Your accounts, trades, journal, goals and settings sync to your login — open Nexora on any device or browser and everything is there.
          </p>
        </div>

        <button onClick={onOffline} className="mx-auto mt-4 flex items-center gap-1.5 text-xs font-semibold text-faint hover:text-mut">
          <CloudOff size={13} /> Continue offline on this device only
        </button>
      </div>
    </div>
  );
}
