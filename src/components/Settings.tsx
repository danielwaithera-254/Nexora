import { useState, type FormEvent } from "react";
import {
  Settings as SettingsIcon,
  User,
  Moon,
  Sun,
  ShieldCheck,
  Lock,
  Download,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Card, CardHead } from "./ui";
import { changePassphrase, exportState, lockVault, vaultGet, vaultSet } from "../lib/vault";
import { cn } from "../utils/cn";

export default function Settings() {
  const [name, setName] = useState(() => vaultGet<{ name?: string }>("settings", {}).name ?? "Daniel");
  const [dark, setDark] = useState(() => localStorage.getItem("nexora-dark") === "1");

  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const saveName = () => {
    const settings = vaultGet<{ name?: string }>("settings", {});
    vaultSet("settings", { ...settings, name: name.trim() || "Daniel" });
    setMsg({ ok: true, text: "Display name saved." });
    window.setTimeout(() => setMsg(null), 2600);
  };

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("nexora-dark", next ? "1" : "0");
    document.documentElement.classList.toggle("dark", next);
  };

  const handlePass = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (newPass.length < 8) {
      setMsg({ ok: false, text: "New passphrase needs at least 8 characters." });
      return;
    }
    if (newPass !== confirmPass) {
      setMsg({ ok: false, text: "New passphrases don't match." });
      return;
    }
    setBusy(true);
    const ok = await changePassphrase(oldPass, newPass, true);
    setBusy(false);
    if (ok) {
      setOldPass("");
      setNewPass("");
      setConfirmPass("");
      setMsg({ ok: true, text: "Passphrase changed — the vault was re-encrypted." });
    } else {
      setMsg({ ok: false, text: "Wrong current passphrase — nothing was changed." });
    }
  };

  const exportBackup = () => {
    const blob = new Blob([exportState()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexora-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg({ ok: true, text: "Backup downloaded — store it somewhere safe." });
    window.setTimeout(() => setMsg(null), 2600);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHead title="Settings" info="Your private journal preferences — everything stays on this device." icon={<SettingsIcon size={14} />} />
        <div className="space-y-5 px-4 pb-5 sm:px-5">
          {/* profile */}
          <section>
            <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-mut">
              <User size={12} /> Profile
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <div className="w-56">
                <label className="mb-1.5 block text-[9.5px] font-bold text-faint">Display name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Daniel"
                  className="w-full rounded-xl border border-edge bg-panel2 px-3 py-2 text-[12px] font-bold text-ink outline-none transition-colors placeholder:text-faint focus:border-brand"
                />
              </div>
              <button
                onClick={saveName}
                className="rounded-xl border border-edge bg-panel2 px-3.5 py-2 text-[11px] font-bold text-mut transition-all hover:border-brand/40 hover:text-brand"
              >
                Save
              </button>
              <p className="w-full text-[9.5px] text-faint">Shown in the dashboard greeting and sidebar.</p>
            </div>
          </section>

          {/* appearance */}
          <section>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-mut">Appearance</p>
            <button
              onClick={toggleDark}
              className="mt-2 flex items-center gap-2.5 rounded-xl border border-edge bg-panel2 px-3.5 py-2.5 text-[11.5px] font-bold text-ink transition-all hover:border-brand/40"
            >
              {dark ? <Sun size={14} className="text-brand" /> : <Moon size={14} className="text-brand" />}
              {dark ? "Dark mode (on)" : "Dark mode (off)"}
            </button>
          </section>

          {/* security */}
          <section>
            <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-mut">
              <ShieldCheck size={12} /> Security
            </p>
            <form onSubmit={handlePass} className="mt-2 space-y-2 rounded-xl border border-edge bg-panel2 p-4">
              <p className="text-[10.5px] font-semibold text-mut">
                Change vault passphrase — your data is re-encrypted with the new key.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input
                  type={show ? "text" : "password"}
                  value={oldPass}
                  onChange={(e) => setOldPass(e.target.value)}
                  placeholder="Current passphrase"
                  className="rounded-xl border border-edge bg-panel px-3 py-2 text-[11.5px] font-semibold text-ink outline-none transition-colors placeholder:text-faint focus:border-brand"
                />
                <input
                  type={show ? "text" : "password"}
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="New passphrase (8+)"
                  className="rounded-xl border border-edge bg-panel px-3 py-2 text-[11.5px] font-semibold text-ink outline-none transition-colors placeholder:text-faint focus:border-brand"
                />
                <input
                  type={show ? "text" : "password"}
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Repeat new passphrase"
                  className="rounded-xl border border-edge bg-panel px-3 py-2 text-[11.5px] font-semibold text-ink outline-none transition-colors placeholder:text-faint focus:border-brand"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="rounded-lg border border-edge bg-panel px-2.5 py-1.5 text-[10px] font-bold text-faint transition-colors hover:text-brand"
                >
                  {show ? "Hide" : "Show"}
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className={cn(
                    "brand-gradient flex items-center gap-1.5 rounded-xl px-4 py-2 text-[11px] font-bold text-white shadow-sm transition-all active:scale-95",
                    busy && "cursor-wait opacity-70"
                  )}
                >
                  <KeyRound size={12} /> {busy ? "Re-encrypting…" : "Change passphrase"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    lockVault();
                    window.location.reload();
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-edge bg-panel px-3.5 py-2 text-[11px] font-bold text-mut transition-all hover:border-brand/40 hover:text-brand"
                >
                  <Lock size={12} /> Lock now
                </button>
              </div>
              {msg && (
                <p className={cn("flex items-center gap-1.5 text-[10.5px] font-bold", msg.ok ? "text-gain" : "text-loss")}>
                  {msg.ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />} {msg.text}
                </p>
              )}
            </form>
          </section>

          {/* data */}
          <section>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-mut">Data</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={exportBackup}
                className="flex items-center gap-1.5 rounded-xl border border-edge bg-panel2 px-3.5 py-2.5 text-[11px] font-bold text-ink transition-all hover:border-brand/40 hover:text-brand"
              >
                <Download size={13} /> Export backup (JSON)
              </button>
            </div>
            <p className="mt-2 max-w-xl text-[9.5px] leading-relaxed text-faint">
              Everything lives in an AES-256 encrypted vault on this device — no accounts, no cloud, no telemetry. The backup file is a plaintext copy of your data: keep it offline, or delete it after exporting.
            </p>
          </section>
        </div>
      </Card>
    </div>
  );
}
