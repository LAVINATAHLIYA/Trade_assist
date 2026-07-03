import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { trades } from "@/lib/mock-data";
import { Delta, KpiCard, SectionHeader, formatINR } from "@/lib/ui-helpers";
import { Plus, Image as ImageIcon, Target, TrendingUp, TrendingDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/journal")({
  component: Journal,
  head: () => ({ meta: [{ title: "Trading Journal — StockSense AI" }] }),
});

const TYPES = ["Long-term", "Swing", "Intraday", "Futures", "Options"] as const;
const MOODS = ["Confident", "Focused", "Neutral", "Anxious", "FOMO", "Impulsive"] as const;

function Journal() {
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<(typeof TYPES)[number]>("Swing");
  const [mood, setMood] = useState<(typeof MOODS)[number]>("Focused");
  const [confidence, setConfidence] = useState(7);

  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const winRate = (trades.filter((t) => t.pnl > 0).length / trades.length) * 100;
  const avgConfidence = trades.reduce((s, t) => s + t.confidence, 0) / trades.length;

  return (
    <AppShell>
      <div className="p-6 max-w-[1400px] mx-auto space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Trading Journal</h1>
            <p className="text-sm text-muted-foreground mt-1">Log every trade. Learn from every outcome.</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="h-9 px-3.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground flex items-center gap-1.5 hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> Log trade
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Net P&L" value={formatINR(totalPnl)} delta={12.4} accent />
          <KpiCard label="Win Rate" value={`${winRate.toFixed(0)}%`} hint={`${trades.filter(t => t.pnl > 0).length}W / ${trades.filter(t => t.pnl < 0).length}L`} />
          <KpiCard label="Avg Confidence" value={avgConfidence.toFixed(1)} hint="/ 10" />
          <KpiCard label="Trades Logged" value={trades.length.toString()} hint="Last 30 days" />
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Timeline */}
          <div className="col-span-12 lg:col-span-8 space-y-4">
            <SectionHeader title="Timeline" subtitle="Recent trades" />
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border">
              {trades.map((t) => {
                const win = t.pnl >= 0;
                return (
                  <div key={t.id} className="relative">
                    <span className={cn("absolute -left-6 top-4 h-3.5 w-3.5 rounded-full ring-4 ring-background",
                      win ? "bg-success" : "bg-destructive"
                    )} />
                    <div className="glass rounded-2xl p-5 hover:-translate-y-0.5 transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-lg">{t.symbol}</span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/15 text-primary uppercase tracking-wider">{t.type}</span>
                            <span className={cn(
                              "text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider",
                              t.side === "Long" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                            )}>{t.side}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-1">{t.date} · Qty {t.qty}</div>
                        </div>
                        <div className="text-right">
                          <div className={cn("text-lg font-semibold num", win ? "text-success" : "text-destructive")}>
                            {win ? "+" : ""}{formatINR(t.pnl)}
                          </div>
                          <Delta value={((t.exit ?? t.entry) - t.entry) / t.entry * 100 * (t.side === "Long" ? 1 : -1)} className="text-[11px]" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <TradeStat label="Entry" value={formatINR(t.entry)} />
                        <TradeStat label="Exit" value={t.exit ? formatINR(t.exit) : "Open"} />
                        <TradeStat label="Stop" value={formatINR(t.stop)} tone="dest" />
                        <TradeStat label="Target" value={formatINR(t.target)} tone="succ" />
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Strategy</span>
                        {t.strategy.map((tag) => (
                          <span key={tag} className="text-[10px] font-medium bg-muted/40 border border-border/60 px-2 py-0.5 rounded-full">{tag}</span>
                        ))}
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          Confidence <span className="text-foreground font-medium num">{t.confidence}/10</span> · Mood <span className="text-foreground font-medium">{t.mood}</span>
                        </span>
                      </div>

                      {t.review && (
                        <div className="mt-3 pt-3 border-t border-border/40">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Post-trade review</div>
                          <p className="text-sm text-muted-foreground italic leading-relaxed">"{t.review}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trade form / stats */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            <div className="glass rounded-2xl p-5">
              <SectionHeader title="Lessons Learned" />
              <div className="space-y-2">
                {[
                  { tag: "Discipline", text: "Never enter without a pre-defined stop loss" },
                  { tag: "Psychology", text: "Avoid trades when mood is Anxious or FOMO" },
                  { tag: "Sizing", text: "Higher confidence + backtested setup = larger size" },
                  { tag: "Exit", text: "Trim 50% at target, trail rest with 20-EMA" },
                ].map((l, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/20 border border-border/60">
                    <div className="text-[10px] font-semibold text-primary uppercase tracking-wider">{l.tag}</div>
                    <div className="text-xs mt-0.5 leading-relaxed">{l.text}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl p-5">
              <SectionHeader title="Strategy Performance" />
              <div className="space-y-2.5">
                {[
                  { name: "Breakout", trades: 12, winRate: 75, pnl: 42800 },
                  { name: "Momentum", trades: 18, winRate: 61, pnl: 28400 },
                  { name: "Fundamental", trades: 6, winRate: 83, pnl: 84200 },
                  { name: "Mean Reversion", trades: 9, winRate: 44, pnl: -12800 },
                ].map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-[10px] text-muted-foreground">{s.trades} trades · {s.winRate}% WR</div>
                    </div>
                    <div className={cn("num font-semibold", s.pnl >= 0 ? "text-success" : "text-destructive")}>
                      {s.pnl >= 0 ? "+" : ""}{formatINR(s.pnl)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div onClick={(e) => e.stopPropagation()} className="glass-strong rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Log New Trade</h2>
              <button onClick={() => setShowForm(false)} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted/40">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Symbol" placeholder="e.g. RELIANCE" />
                <Field label="Date" type="date" />
              </div>

              <div>
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Trade Type</div>
                <div className="flex flex-wrap gap-1.5">
                  {TYPES.map((t) => (
                    <button key={t} onClick={() => setType(t)}
                      className={cn("px-3 h-8 rounded-lg text-xs font-medium border transition",
                        type === t ? "bg-primary/15 text-primary border-primary/30" : "border-border/60 text-muted-foreground hover:bg-muted/40"
                      )}>{t}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Entry" placeholder="₹" />
                <Field label="Qty" placeholder="0" />
                <Field label="Stop Loss" placeholder="₹" />
                <Field label="Target" placeholder="₹" />
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-muted-foreground uppercase tracking-wider font-medium">Confidence</span>
                  <span className="num font-semibold text-primary">{confidence} / 10</span>
                </div>
                <input type="range" min={1} max={10} value={confidence} onChange={(e) => setConfidence(+e.target.value)} className="w-full accent-primary" />
              </div>

              <div>
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Mood</div>
                <div className="flex flex-wrap gap-1.5">
                  {MOODS.map((m) => (
                    <button key={m} onClick={() => setMood(m)}
                      className={cn("px-3 h-8 rounded-lg text-xs font-medium border transition",
                        mood === m ? "bg-primary/15 text-primary border-primary/30" : "border-border/60 text-muted-foreground hover:bg-muted/40"
                      )}>{m}</button>
                  ))}
                </div>
              </div>

              <Field label="Strategy Tags" placeholder="Breakout, Earnings, Momentum..." />

              <div>
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Notes / Thesis</div>
                <textarea rows={3} placeholder="Why did you take this trade?"
                  className="w-full rounded-lg bg-muted/40 border border-border/60 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
              </div>

              <button className="w-full h-10 rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground hover:bg-muted/30 flex items-center justify-center gap-2">
                <ImageIcon className="h-4 w-4" /> Upload chart screenshot
              </button>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 h-10 rounded-lg border border-border/60 text-sm font-medium hover:bg-muted/30">Cancel</button>
                <button onClick={() => setShowForm(false)} className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Save trade</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Field({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">{label}</div>
      <input {...rest} className="w-full h-10 rounded-lg bg-muted/40 border border-border/60 text-sm px-3 num focus:outline-none focus:ring-2 focus:ring-primary/40" />
    </div>
  );
}

function TradeStat({ label, value, tone }: { label: string; value: string; tone?: "succ" | "dest" }) {
  return (
    <div className="p-2 rounded-lg bg-muted/20 border border-border/60">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={cn("text-sm font-medium num mt-0.5",
        tone === "succ" && "text-success",
        tone === "dest" && "text-destructive"
      )}>{value}</div>
    </div>
  );
}
