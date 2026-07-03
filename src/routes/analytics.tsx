import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { KpiCard, SectionHeader } from "@/lib/ui-helpers";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { Brain, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/analytics")({
  component: Analytics,
  head: () => ({ meta: [{ title: "Behavioral Analytics — StockSense AI" }] }),
});

const monthlyPnl = [
  { m: "Jul", pnl: 24000 }, { m: "Aug", pnl: -8200 }, { m: "Sep", pnl: 42000 },
  { m: "Oct", pnl: 18400 }, { m: "Nov", pnl: -12800 }, { m: "Dec", pnl: 58200 },
];

const psychology = [
  { trait: "Discipline", score: 78 },
  { trait: "Patience", score: 62 },
  { trait: "Risk Control", score: 84 },
  { trait: "Position Sizing", score: 55 },
  { trait: "Exit Strategy", score: 71 },
  { trait: "Emotional Control", score: 68 },
];

const mistakes = [
  { name: "Chasing green candles", count: 8, cost: -18400 },
  { name: "Ignoring stop losses", count: 5, cost: -32100 },
  { name: "Revenge trading", count: 3, cost: -14200 },
  { name: "Overtrading (>5/day)", count: 12, cost: -6800 },
];

const setups = [
  { name: "Breakout + Volume", trades: 12, wr: 75, avgR: 2.4 },
  { name: "Support Bounce", trades: 8, wr: 62, avgR: 1.8 },
  { name: "Earnings Play", trades: 6, wr: 83, avgR: 3.1 },
  { name: "Trend Continuation", trades: 15, wr: 68, avgR: 2.1 },
];

function Analytics() {
  return (
    <AppShell>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Behavioral Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Understand your patterns. Fix your mistakes. Compound your edge.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Risk Discipline" value="82" hint="/ 100" delta={4.2} accent />
          <KpiCard label="Win / Loss Ratio" value="2.4" hint="Avg win vs avg loss" />
          <KpiCard label="Best Holding" value="18d" hint="Swing sweet spot" />
          <KpiCard label="Mistake Cost" value="₹71.5K" hint="Last 90 days" />
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Monthly P&L */}
          <div className="col-span-12 lg:col-span-8 glass rounded-2xl p-5">
            <SectionHeader title="Monthly P&L" subtitle="Last 6 months" action={<TrendingUp className="h-4 w-4 text-success" />} />
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={monthlyPnl}>
                  <XAxis dataKey="m" tick={{ fill: "oklch(0.68 0.02 240)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "oklch(0.68 0.02 240)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                  <Tooltip contentStyle={{ background: "oklch(0.2 0.014 240)", border: "1px solid oklch(0.3 0.015 240 / 0.6)", borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="pnl" radius={[8, 8, 0, 0]} fill="oklch(0.74 0.17 155)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Psychology Radar */}
          <div className="col-span-12 lg:col-span-4 glass rounded-2xl p-5">
            <SectionHeader title="Psychology Profile" action={<Brain className="h-4 w-4 text-primary" />} />
            <div className="h-64">
              <ResponsiveContainer>
                <RadarChart data={psychology}>
                  <PolarGrid stroke="oklch(0.3 0.015 240 / 0.4)" />
                  <PolarAngleAxis dataKey="trait" tick={{ fill: "oklch(0.68 0.02 240)", fontSize: 10 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar dataKey="score" stroke="oklch(0.74 0.17 155)" fill="oklch(0.74 0.17 155)" fillOpacity={0.3} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Mistake Detection */}
          <div className="col-span-12 md:col-span-6 glass rounded-2xl p-5">
            <SectionHeader title="Mistake Patterns" subtitle="Detected in your trades" action={<AlertTriangle className="h-4 w-4 text-warning" />} />
            <div className="space-y-2">
              {mistakes.map((m) => (
                <div key={m.name} className="p-3 rounded-xl bg-muted/20 border border-border/60 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{m.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{m.count} occurrences</div>
                  </div>
                  <div className="text-sm font-semibold num text-destructive">₹{Math.abs(m.cost).toLocaleString("en-IN")}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Best Setups */}
          <div className="col-span-12 md:col-span-6 glass rounded-2xl p-5">
            <SectionHeader title="Best Performing Setups" action={<CheckCircle2 className="h-4 w-4 text-success" />} />
            <div className="space-y-2">
              {setups.map((s) => (
                <div key={s.name} className="p-3 rounded-xl bg-muted/20 border border-border/60">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-xs num font-semibold text-success">{s.wr}% WR</div>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>{s.trades} trades</span>
                    <span>·</span>
                    <span>Avg R: <span className="text-foreground font-medium num">{s.avgR}x</span></span>
                  </div>
                  <div className="mt-2 h-1 rounded-full bg-muted/40 overflow-hidden">
                    <div className="h-full bg-[var(--gradient-emerald)]" style={{ width: `${s.wr}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Do's and Don'ts */}
          <div className="col-span-12 md:col-span-6 glass rounded-2xl p-5 border-l-2 border-l-success">
            <SectionHeader title="Your Do's" subtitle="Based on 90 days of behavior" />
            <ul className="space-y-2 text-sm">
              {[
                "Enter breakout trades with volume confirmation — 75% win rate",
                "Size up to 5% on earnings plays (your best setup, 83% WR)",
                "Hold swing trades 12-18 days for optimal R-multiple",
                "Trade IT and Auto sectors — your alpha zones",
              ].map((d, i) => (
                <li key={i} className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span className="text-muted-foreground leading-relaxed">{d}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-12 md:col-span-6 glass rounded-2xl p-5 border-l-2 border-l-destructive">
            <SectionHeader title="Your Don'ts" subtitle="Patterns costing you money" />
            <ul className="space-y-2 text-sm">
              {[
                "Never trade in Anxious/FOMO moods — 78% loss rate",
                "Avoid intraday on Fridays — negative expectancy",
                "Don't average down on losing positions",
                "Skip trades below confidence 6 — filter noise",
              ].map((d, i) => (
                <li key={i} className="flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <span className="text-muted-foreground leading-relaxed">{d}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
