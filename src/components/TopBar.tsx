import { Menu, Moon, Sun, Sparkles, Lock } from "lucide-react";
import { SelectBox } from "./ui";

export default function TopBar({
  onMenu,
  dark,
  onToggleDark,
  onInsights,
  onLock,
  syncLabel,
  pageLabel,
  accounts,
  account,
  onAccountChange,
}: {
  onMenu: () => void;
  dark: boolean;
  onToggleDark: () => void;
  onInsights: () => void;
  onLock: () => void;
  syncLabel: string;
  pageLabel: string;
  accounts: { value: string; label: string }[];
  account: string;
  onAccountChange: (v: string) => void;
}) {
  return (
    <header className="themed sticky top-0 z-30 flex items-center gap-3 border-b border-edge bg-surface/80 px-4 py-3 backdrop-blur-xl sm:px-6">
      <button
        onClick={onMenu}
        className="rounded-lg border border-edge bg-panel p-2 text-mut transition-colors hover:text-ink lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={16} />
      </button>

      <div>
        <h1 className="font-display text-lg font-bold leading-none tracking-tight text-ink">
          {pageLabel}
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-[10.5px] font-medium text-mut">
          <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-gain" />
          Last sync: {syncLabel}
        </p>
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <SelectBox
          value={account}
          onChange={onAccountChange}
          options={accounts}
          className="w-[130px] sm:w-[170px]"
        />
        <button
          onClick={onInsights}
          className="brand-gradient group flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[11.5px] font-bold text-white shadow-[0_6px_18px_-6px_var(--brand-ring)] transition-all hover:-translate-y-px hover:shadow-[0_10px_24px_-8px_var(--brand-ring)] active:translate-y-0 active:scale-95"
        >
          <Sparkles size={13} className="transition-transform duration-300 group-hover:rotate-12" />
          <span className="hidden sm:inline">Insights</span>
        </button>
        <button
          onClick={onLock}
          className="group relative rounded-xl border border-edge bg-panel p-2 text-mut transition-all hover:border-brand/40 hover:text-brand active:scale-90"
          aria-label="Lock now — re-encrypt and lock the vault"
          title="Lock now"
        >
          <Lock size={15} />
        </button>
        <button
          onClick={onToggleDark}
          className="group relative rounded-xl border border-edge bg-panel p-2 text-mut transition-all hover:border-brand/40 hover:text-brand active:scale-90"
          aria-label="Toggle dark mode"
        >
          <span className="block transition-transform duration-500 group-hover:rotate-45">
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </span>
        </button>
      </div>
    </header>
  );
}
