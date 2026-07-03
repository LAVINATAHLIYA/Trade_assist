import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { holdings, sectors } from "@/lib/mock-data";
import { Delta, KpiCard, SectionHeader, formatINR, formatPct } from "@/lib/ui-helpers";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Area, AreaChart } from "recharts";
import { cn } from "@/lib/utils";
import { Sparkles, Shield, PieChart as PieIcon, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/portfolio")({
  component: Portfolio,
  head: () => ({ meta: [{ title: "Portfolio — StockSense AI" }] }),
});

const CHART_COLORS = ["oklch(0.74 0.17 155)", "oklch(0.7 0.15 220)", "oklch(0.78 0.16 82)", "oklch(0.7 0.18 300)", "oklch(0.65 0.22 22)", "oklch(0.6 0.12 200)", "oklch(0.75 0.15 40)"];

function Portfolio() {
  const totalValue = holdings.reduce((s, h) => s + h.qty * h.ltp, 0);
  const totalCost = holdings.reduce((s, h) => s + h.qty * h.avg, 0);
  const pnl = totalValue - totalCost;
  const pnlPct = (pnl / totalCost) * 100;

  const sectorAlloc = Object.entries(
    holdings.reduce((acc: Record<string, number>, h) => {
      acc[h.sector] = (acc[h.sector] ?? 0) + h.qty * h.ltp;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const perfData = Array.from({ length: 60 }, (_, i) => ({
    d: i,
    v: 1400000 + Math.sin(i * 0.2) * 40000 + i * 5500 + Math.random() * 15000,
  }));

  return (
    <AppShell>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
            <p className="text-sm text-muted-foreground mt-1">{holdings.length} holdings · Live</p>
          </div>
          <button className="h-9 px-3.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground flex items-center gap-1.5 hover:opacity-90">
            <Sparkles className="h-3.5 w-3.5" /> AI review
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Total Value" value={formatINR(totalValue)} delta={pnlPct} accent />
          <KpiCard label="Invested" value={formatINR(totalCost)} />
          <KpiCard label="Overall P&L" value={formatINR(pnl)} delta={pnlPct} />
          <KpiCard label="XIRR" value="21.8%" hint="1Y annualized" />
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Performance chart */}
          <div className="col-span-12 xl:col-span-8 glass rounded-2xl p-5">
            <SectionHeader
              title="Performance"
              subtitle="60-day trailing · vs Nifty 50"
              action={
                <div className="flex gap-1 text-[11px]">
                  {["1W", "1M", "3M", "1Y", "All"].map((r) => (
                    <button key={r} className={cn("px-2.5 py-1 rounded-md font-medium", r === "3M" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/40")}>{r}</button>
                  ))}
                </div>
              }
            />
            <div className="h-72">
              <ResponsiveContainer>
                <AreaChart data={perfData}>
                  <defs>
                    <linearGradient id="pfg" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.74 0.17 155)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="oklch(0.74 0.17 155)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="d" hide />
                  <YAxis tick={{ fill: "oklch(0.68 0.02 240)", fontSize: 11 }} width={70} tickFormatter={(v) => `₹${(v / 1e5).toFixed(1)}L`} />
                  <Tooltip contentStyle={{ background: "oklch(0.2 0.014 240)", border: "1px solid oklch(0.3 0.015 240 / 0.6)", borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="v" stroke="oklch(0.74 0.17 155)" strokeWidth={2} fill="url(#pfg)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Health scores */}
          <div className="col-span-12 xl:col-span-4 space-y-4">
            <div className="glass rounded-2xl p-5">
              <SectionHeader title="Portfolio Health" action={<Shield className="h-4 w-4 text-success" />} />
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-semibold text-gradient-emerald num">82</span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Well diversified, moderate risk exposure. Sector concentration slightly elevated.</p>
              <div className="mt-4 space-y-2">
                <HealthBar label="Diversification" score={78} />
                <HealthBar label="Risk-adjusted returns" score={86} />
                <HealthBar label="Sector balance" score={64} />
                <HealthBar label="Liquidity" score={92} />
              </div>
            </div>
          </div>

          {/* Allocation */}
          <div className="col-span-12 md:col-span-6 xl:col-span-5 glass rounded-2xl p-5">
            <SectionHeader title="Sector Allocation" action={<PieIcon className="h-4 w-4 text-muted-foreground" />} />
            <div className="flex items-center gap-4">
              <div className="h-56 w-56 shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={sectorAlloc} dataKey="value" innerRadius={55} outerRadius={90} paddingAngle={2}>
                      {sectorAlloc.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "oklch(0.2 0.014 240)", border: "1px solid oklch(0.3 0.015 240 / 0.6)", borderRadius: 12, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5 text-xs">
                {sectorAlloc.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="flex-1">{s.name}</span>
                    <span className="num text-muted-foreground">{((s.value / totalValue) * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI recommendations */}
          <div className="col-span-12 md:col-span-6 xl:col-span-7 glass rounded-2xl p-5">
            <SectionHeader title="AI Recommendations" action={<Sparkles className="h-4 w-4 text-primary" />} />
            <div className="space-y-2.5">
              {[
                { tone: "warn", tag: "Rebalance", title: "Reduce IT exposure by 4%", body: "IT sector allocation at 24% vs target 20%. Consider trimming TCS or INFY." },
                { tone: "bull", tag: "Opportunity", title: "Add defensive exposure", body: "Zero pharma allocation. Consider SUNPHARMA (5% target weight) to reduce beta." },
                { tone: "info", tag: "Tax", title: "Harvest ₹42K STCG losses", body: "ADANIENT position eligible for tax-loss harvesting before FY end." },
              ].map((r, i) => (
                <div key={i} className="rounded-xl p-3.5 bg-muted/20 border border-border/60">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider",
                      r.tone === "bull" && "bg-success/15 text-success",
                      r.tone === "warn" && "bg-warning/15 text-warning",
                      r.tone === "info" && "bg-primary/15 text-primary",
                    )}>{r.tag}</span>
                    <span className="text-sm font-medium">{r.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{r.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Holdings table */}
        <div className="glass rounded-2xl p-5">
          <SectionHeader title="Holdings" subtitle={`${holdings.length} positions`} />
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] text-muted-foreground uppercase tracking-wider bg-muted/20">
                  <th className="text-left font-medium px-4 py-2.5">Stock</th>
                  <th className="text-right font-medium px-3 py-2.5">Qty</th>
                  <th className="text-right font-medium px-3 py-2.5">Avg Cost</th>
                  <th className="text-right font-medium px-3 py-2.5">LTP</th>
                  <th className="text-right font-medium px-3 py-2.5">Invested</th>
                  <th className="text-right font-medium px-3 py-2.5">Current</th>
                  <th className="text-right font-medium px-3 py-2.5">P&L</th>
                  <th className="text-right font-medium px-3 py-2.5">%</th>
                  <th className="text-right font-medium px-3 py-2.5">Weight</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => {
                  const invested = h.qty * h.avg;
                  const current = h.qty * h.ltp;
                  const pl = current - invested;
                  const plPct = (pl / invested) * 100;
                  const weight = (current / totalValue) * 100;
                  return (
                    <tr key={h.symbol} className="border-t border-border/40 hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="font-medium">{h.symbol}</div>
                        <div className="text-[11px] text-muted-foreground">{h.sector}</div>
                      </td>
                      <td className="px-3 py-3 text-right num">{h.qty}</td>
                      <td className="px-3 py-3 text-right num text-muted-foreground">{formatINR(h.avg)}</td>
                      <td className="px-3 py-3 text-right num">{formatINR(h.ltp)}</td>
                      <td className="px-3 py-3 text-right num text-muted-foreground">{formatINR(invested)}</td>
                      <td className="px-3 py-3 text-right num">{formatINR(current)}</td>
                      <td className={cn("px-3 py-3 text-right num font-medium", pl >= 0 ? "text-success" : "text-destructive")}>
                        {pl >= 0 ? "+" : ""}{formatINR(pl)}
                      </td>
                      <td className="px-3 py-3 text-right"><Delta value={plPct} /></td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-14 h-1 rounded-full bg-muted/40 overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${Math.min(weight * 4, 100)}%` }} />
                          </div>
                          <span className="text-xs num text-muted-foreground w-10">{weight.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Risk analysis */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RiskCard label="Portfolio Beta" value="0.92" hint="vs Nifty 50 · low market risk" positive />
          <RiskCard label="Volatility (30d)" value="14.8%" hint="Below sector median" positive />
          <RiskCard label="Max Drawdown" value="-8.4%" hint="Last 12 months" />
        </div>
      </div>
    </AppShell>
  );
}

function HealthBar({ label, score }: { label: string; score: number }) {
  const color = score >= 80 ? "bg-success" : score >= 60 ? "bg-warning" : "bg-destructive";
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium num">{score}</span>
      </div>
      <div className="h-1 rounded-full bg-muted/40 overflow-hidden">
        <div className={cn("h-full", color)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function RiskCard({ label, value, hint, positive }: { label: string; value: string; hint: string; positive?: boolean }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-semibold num mt-2">{value}</div>
      <div className={cn("text-xs mt-1", positive ? "text-success" : "text-muted-foreground")}>{hint}</div>
    </div>
  );
}
