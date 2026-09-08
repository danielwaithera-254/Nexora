import { useState, useEffect } from "react";
import { Card, CardHead } from "./ui";
import { cn } from "../utils/cn";
import { Save, User, Moon, Sun, ShieldCheck, Lock, Download, Upload, KeyRound, CheckCircle2, AlertTriangle, Bell, Palette, Database, Globe, Layers } from "lucide-react";
import { vaultGet, vaultSet } from "../lib/vault";

interface SettingsProps {
  dark?: boolean;
  onToggleDark?: () => void;
}

export default function Settings({ dark = false, onToggleDark }: SettingsProps) {
  const [name, setName] = useState(() => vaultGet<{ name?: string }>("settings", {}).name ?? "Jordan Tate");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("nexora-dark") === "1");
  const [notifications, setNotifications] = useState(() => vaultGet<{ notifications?: boolean }>("settings", {}).notifications ?? true);
  const [timezone, setTimezone] = useState(() => vaultGet<{ timezone?: string }>("settings", {}).timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [currency, setCurrency] = useState(() => vaultGet<{ currency?: string }>("settings", {}).currency ?? "USD");
  const [defaultRisk, setDefaultRisk] = useState(() => vaultGet<{ defaultRisk?: number }>("settings", {}).defaultRisk ?? 1);
  const [defaultAccount, setDefaultAccount] = useState(() => vaultGet<{ defaultAccount?: string }>("settings", {}).defaultAccount ?? "Main Futures");
  const [theme, setTheme] = useState<"system" | "light" | "dark">(() => vaultGet<{ theme?: string }>("settings", {}).theme ?? "system");

  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const saveSettings = () => {
    const settings = {
      name: name.trim() || "Jordan Tate",
      notifications,
      timezone,
      currency,
      defaultRisk,
      defaultAccount,
      theme,
    };
    vaultSet("settings", settings);
    localStorage.setItem("nexora-dark", darkMode ? "1" : "0");
    document.documentElement.classList.toggle("dark", darkMode);
    onToggleDark?.();
    setMsg({ ok: true, text: "Settings saved successfully." });
    setTimeout(() => setMsg(null), 2600);
  };

  const handlePass = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (newPass.length < 8) {
      setMsg({ ok: false, text: "New passphrase needs at least 8 characters." });
      return;
    }
    if (newPass !== confirmPass) {
      setMsg({ ok: false, text: "Passphrases do not match." });
      return;
    }
    setBusy(true);
    setMsg({ ok: true, text: "Passphrase updated (demo)." });
    setOldPass("");
    setNewPass("");
    setConfirmPass("");
    setBusy(false);
    setTimeout(() => setMsg(null), 2600);
  };

  const handleExport = () => {
    const data = {
      settings: vaultGet("settings", {}),
      trades: vaultGet("trades", []),
      accounts: vaultGet("accounts", []),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexora-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result ?? ""));
        if (data.settings) vaultSet("settings", data.settings);
        if (data.trades) vaultSet("trades", data.trades);
        if (data.accounts) vaultSet("accounts", data.accounts);
        setMsg({ ok: true, text: "Data imported successfully. Reload to apply." });
      } catch {
        setMsg({ ok: false, text: "Invalid backup file." });
      }
      setTimeout(() => setMsg(null), 2600);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleClearAll = () => {
    if (confirm("This will permanently delete ALL your data (trades, accounts, journal, goals, settings). This cannot be undone. Continue?")) {
      localStorage.clear();
      sessionStorage.clear();
      setMsg({ ok: true, text: "All data cleared. Page will reload." });
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-brand/10">
          <Settings className="w-6 h-6 text-brand" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Settings</h1>
          <p className="text-mut mt-0.5">Configure your trading journal preferences</p>
        </div>
      </div>

      {msg && (
        <div className={cn("p-4 rounded-xl border flex items-center gap-3", msg.ok ? "bg-gain/10 border-gain/30 text-gain" : "bg-loss/10 border-loss/30 text-loss")}>
          {msg.ok ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="font-medium">{msg.text}</span>
        </div>
      )}

      {/* Profile */}
      <Card>
        <CardHead title="Profile" info="Your display name and avatar" icon={<User size={16} />} />
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold text-xl ring-2 ring-brand/30">
              {name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-mut mb-1">Display Name</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-edge bg-panel text-ink focus:border-brand focus:outline-none" />
            </div>
          </div>
          <button onClick={saveSettings} className="px-4 py-2 rounded-lg bg-brand text-white font-semibold hover:bg-brand-deep transition-colors">Save Profile</button>
        </div>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHead title="Appearance" info="Customize how Nexora looks" icon={<Palette size={16} />} />
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-mut mb-2">Theme</label>
            <div className="flex gap-2">
              {["system", "light", "dark"].map((t) => (
                <button
                  key={t}
                  onClick={() => { setTheme(t as any); setDarkMode(t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)); }}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-colors ${theme === t ? "bg-brand text-white" : "bg-panel2 text-mut hover:bg-brand/10 hover:text-brand"}`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Trading Preferences */}
      <Card>
        <CardHead title="Trading Preferences" info="Default values for new trades and risk management" icon={<ShieldCheck size={16} />} />
        <div className="p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-mut mb-1">Default Risk Per Trade (%)</label>
              <input type="number" step="0.1" min="0.1" max="10" value={defaultRisk} onChange={e => setDefaultRisk(parseFloat(e.target.value) || 1)} className="w-full px-3 py-2 rounded-lg border border-edge bg-panel text-ink focus:border-brand focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-mut mb-1">Default Account</label>
              <select value={defaultAccount} onChange={e => setDefaultAccount(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-edge bg-panel text-ink focus:border-brand focus:outline-none">
                <option value="Main Futures">Main Futures</option>
                <option value="Prop Firm">Prop Firm</option>
                <option value="Swing">Swing</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-mut mb-1">Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-edge bg-panel text-ink focus:border-brand focus:outline-none">
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="AUD">AUD ($)</option>
                <option value="CAD">CAD ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-mut mb-1">Timezone</label>
              <select value={timezone} onChange={e => setTimezone(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-edge bg-panel text-ink focus:border-brand focus:outline-none">
                {Intl.supportedValuesOf("timeZone").map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
          </div>
          <button onClick={saveSettings} className="px-4 py-2 rounded-lg bg-brand text-white font-semibold hover:bg-brand-deep transition-colors">Save Trading Preferences</button>
        </div>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHead title="Notifications" info="Configure alerts and reminders" icon={<Bell size={16} />} />
        <div className="p-4 space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="font-medium text-ink">Enable Notifications</p>
              <p className="text-sm text-mut">Receive trade alerts and daily summaries</p>
            </div>
            <input type="checkbox" checked={notifications} onChange={e => setNotifications(e.target.checked)} className="w-5 h-5 rounded border-edge text-brand focus:ring-brand" />
          </label>
        </div>
      </Card>

      {/* Security */}
      <Card>
        <CardHead title="Security" info="Manage your passphrase and data encryption" icon={<Lock size={16} />} />
        <div className="p-4 space-y-4">
          <form onSubmit={handlePass}>
            <div className="grid gap-3 md:grid-cols-3">
              <input type={show ? "text" : "password"} value={oldPass} onChange={e => setOldPass(e.target.value)} placeholder="Current Passphrase" className="px-3 py-2 rounded-lg border border-edge bg-panel text-ink focus:border-brand focus:outline-none" />
              <input type={show ? "text" : "password"} value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="New Passphrase (min 8 chars)" className="px-3 py-2 rounded-lg border border-edge bg-panel text-ink focus:border-brand focus:outline-none" />
              <input type={show ? "text" : "password"} value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Confirm New Passphrase" className="px-3 py-2 rounded-lg border border-edge bg-panel text-ink focus:border-brand focus:outline-none" />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-mut">
                <input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} className="w-4 h-4 rounded border-edge text-brand focus:ring-brand" />
                Show passphrase
              </label>
              <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg bg-brand text-white font-semibold hover:bg-brand-deep transition-colors disabled:opacity-50">
                {busy ? "Updating..." : "Update Passphrase"}
              </button>
            </div>
          </form>
        </div>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHead title="Data Management" info="Backup, restore, or clear all your trading data" icon={<Database size={16} />} />
        <div className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <label className="cursor-pointer">
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              <button className="px-4 py-2 rounded-lg border border-edge bg-panel hover:bg-panel2 font-medium text-sm flex items-center gap-2">
                <Upload size={14} />
                <span>Import Backup</span>
              </button>
            </label>
            <button onClick={handleExport} className="px-4 py-2 rounded-lg border border-edge bg-panel hover:bg-panel2 font-medium text-sm flex items-center gap-2">
              <Download size={14} />
              <span>Export Backup</span>
            </button>
          </div>
          <button onClick={handleClearAll} className="w-full px-4 py-2 rounded-lg bg-loss/10 text-loss border border-loss/30 font-semibold hover:bg-loss/20 transition-colors">
            <Trash2 className="w-4 h-4 inline mr-2" />
            Delete All Data (Irreversible)
          </button>
        </div>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHead title="Integrations" info="Connect external platforms and data sources" icon={<Layers size={16} />} />
        <div className="p-4 space-y-3">
          {[
            { name: "MetaTrader 5", desc: "Connect MT5 for automatic trade sync", icon: Layers, status: "disconnected" },
            { name: "TradingView", desc: "Import charts and analysis", icon: Globe, status: "disconnected" },
            { name: "Interactive Brokers", desc: "Broker account sync", icon: Layers, status: "disconnected" },
          ].map((i) => (
            <div key={i.name} className="flex items-center justify-between p-3 rounded-lg bg-panel2 border border-edge">
              <div className="flex items-center gap-3">
                <i.icon className="w-5 h-5 text-mut" />
                <div>
                  <p className="font-medium text-ink">{i.name}</p>
                  <p className="text-sm text-mut">{i.desc}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${i.status === "connected" ? "bg-gain/15 text-gain" : "bg-mut/15 text-mut"}`}>
                {i.status === "connected" ? "Connected" : "Connect"}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="border-loss/30">
        <CardHead title="Danger Zone" info="Irreversible actions" icon={<AlertTriangle size={16} className="text-loss" />} />
        <div className="p-4 space-y-3">
          <button onClick={handleClearAll} className="w-full px-4 py-2 rounded-lg bg-loss/10 text-loss border border-loss/30 font-semibold hover:bg-loss/20 transition-colors flex items-center justify-center gap-2">
            <Trash2 className="w-4 h-4" />
            <span>Delete All Data (Irreversible)</span>
          </button>
          <p className="text-sm text-mut">This will permanently delete all trades, accounts, journal entries, goals, and settings. This action cannot be undone.</p>
        </div>
      </Card>
    </div>
  );
}