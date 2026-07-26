import {
  Layers,
  TrendingUp,
  RotateCw,
  GraduationCap,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Card, CardHead } from "./ui";

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  playbooks: Layers,
  progress: TrendingUp,
  replay: RotateCw,
  resources: GraduationCap,
};

const COPY: Record<
  string,
  { tag: string; title: string; body: string; bullets: string[] }
> = {
  playbooks: {
    tag: "BETA",
    title: "Playbooks",
    body: "Capture your repeatable setups. Tag every trade to a playbook, then let the stats show which ones actually pay.",
    bullets: [
      "Screenshot your chart with entry/exit markings",
      "Attach conditions, session, and market regime",
      "Live win-rate + expectancy per playbook",
    ],
  },
  progress: {
    tag: "BETA",
    title: "Progress Tracker",
    body: "Long-term goals, monthly targets and drawdown budgets. See how you're pacing against where you want to be.",
    bullets: [
      "Custom KPI targets with deadline tracking",
      "Drawdown budget and recovery path",
      "Compounded equity vs. your plan",
    ],
  },
  replay: {
    tag: "BETA",
    title: "Trade Replay",
    body: "Replay any historical session tick-by-tick. Practice entries without risk and tag your decisions as you go.",
    bullets: [
      "Minute bars for NQ, ES, CL, GC, 6E, SI",
      "Pause / annotate / tag at decision points",
      "Compare your replay to the original trade",
    ],
  },
  resources: {
    tag: "NEW",
    title: "Resource Center",
    body: "Books, videos and frameworks curated from traders who think like you. Save and tag anything that sparks an idea.",
    bullets: [
      "Community picks + staff recommendations",
      "Tag by topic: psychology, risk, edge, tactics",
      "Build a personal reading list",
    ],
  },
};

export default function ComingSoon({ page }: { page: string }) {
  const c = COPY[page] ?? COPY.playbooks;
  const Icon = ICONS[page] ?? Sparkles;
  return (
    <Card className="mx-auto mt-6 max-w-3xl">
      <CardHead
        title={c.title}
        info={`${c.tag} feature · rolling out soon`}
        icon={<Icon size={14} className="text-brand" />}
      />
      <div className="px-5 pb-6 pt-2">
        <p className="text-[13px] leading-relaxed text-mut">{c.body}</p>
        <ul className="mt-4 space-y-2">
          {c.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-[12.5px] text-ink">
              <ArrowRight size={12} className="mt-0.5 shrink-0 text-brand" />
              {b}
            </li>
          ))}
        </ul>
        <div className="mt-6 rounded-xl border border-edge2 bg-panel2 px-4 py-3 text-[11px] text-mut">
          <span className="font-bold text-brand">Heads up:</span> this module is in development. The data model
          underneath is already wired — trades you log today will attach automatically when the UI lands.
        </div>
      </div>
    </Card>
  );
}
