import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";
import {
  Plus, Upload, Download, Filter as FilterIcon, TrendingUp, TrendingDown,
  X, Target, Shield, Clock, Sparkles, BookOpen, Calendar as CalendarIcon,
  BarChart3, ListChecks, AlertTriangle, Zap, ChevronRight, PieChart, FileText,
} from "lucide-react";
import { formatINR, formatPct, Delta, KpiCard, SectionHeader, Sparkline } from "@/lib/ui-helpers";
import {
  type Trade, type Direction, type Instrument, type Duration,
  useTrades, addTrade, updateTrade, deleteTrade, resetJournal,
  pnl, unrealized, rMultiple, filterByRange, computeMetrics,
  cumulativeCurve, mistakeStats, parseCsv, groupBy,
} from "@/lib/journal-store";

export const Route = createFileRoute("/journal")({
  component: Journal,
  head: () => ({
    meta: [
      { title: "Trading Journal — StockSense AI" },
      { name: "description", content: "Professional trade journal, review, mistake tracking, and behavioral analytics for Indian markets." },
    ],
  }),
});

type TabId =
  | "overview" | "trades" | "new" | "open" | "calendar"
  | "strategies" | "playbook" | "reports" | "mistakes" | "ai";

const TABS: { id: TabId; label: string; icon: typeof BarChart3 }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "trades", label: "Trades", icon: ListChecks },
  { id: "new", label: "New Trade", icon: Plus },
  { id: "open", label: "Open Trades", icon: Zap },
  { id: "calendar", label: "Calendar", icon: CalendarIcon },
  { id: "strategies", label: "Strategies", icon: Target },
  { id: "playbook", label: "Playbook", icon: BookOpen },
  { id: "reports", label: "Reports", icon: PieChart },
  { id: "mistakes", label: "Mistakes", icon: AlertTriangle },
  { id: "ai", label: "AI Review", icon: Sparkles },
];

const RANGES = [
  { id: "today", label: "Today" }, { id: "week", label: "1W" },
  { id: "month", label: "1M" }, { id: "3m", label: "3M" }, { id: "6m", label: "6M" },
  { id: "ytd", label: "YTD" }, { id: "1y", label: "1Y" }, { id: "all", label: "All" },
];

function Journal() {
  const trades = useTrades();
  const [tab, setTab] = useState<TabId>("overview");
  const [range, setRange] = useState("all");
  const [showImport, setShowImport] = useState(false);
  const [detail, setDetail] = useState<Trade | null>(null);

  const scoped = useMemo(() => filterByRange(trades, range), [trades, range]);

  return (
    <AppShell>
      <div className="p-6 max-w-[1500px] mx-auto space-y-5">
        <header className="flex flex-col md:flex-row md:items-end gap-3 justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Trading Journal</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Log every trade. Review every outcome. <span className="text-primary/80">Demo data</span> until you import or add your own.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="glass rounded-lg p-0.5 flex items-center">
              {RANGES.map((r) => (
                <button key={r.id} onClick={() => setRange(r.id)}
                  className={cn("h-7 px-2.5 text-[11px] font-medium rounded-md transition",
                    range === r.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}>
                  {r.label}
                </button>
              ))}
            </div>
            <button onClick={() => setShowImport(true)}
              className="h-9 px-3 rounded-lg text-xs font-medium border border-border/60 hover:bg-muted/40 flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5" /> Import
            </button>
            <button onClick={() => setTab("new")}
              className="h-9 px-3.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground flex items-center gap-1.5 hover:opacity-90">
              <Plus className="h-3.5 w-3.5" /> Log trade
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="glass rounded-xl p-1 flex items-center gap-0.5 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn("flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition",
                  active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/40")}>
                <Icon className="h-3.5 w-3.5" />{t.label}
              </button>
            );
          })}
        </div>

        {tab === "overview" && <OverviewTab trades={scoped} />}
        {tab === "trades" && <TradesTab trades={scoped} onOpen={setDetail} />}
        {tab === "new" && <NewTradeTab onSaved={() => setTab("trades")} />}
        {tab === "open" && <OpenTradesTab trades={trades} onOpen={setDetail} />}
        {tab === "calendar" && <CalendarTab trades={scoped} />}
        {tab === "strategies" && <StrategiesTab trades={scoped} />}
        {tab === "playbook" && <PlaybookTab />}
        {tab === "reports" && <ReportsTab trades={scoped} />}
        {tab === "mistakes" && <MistakesTab trades={scoped} />}
        {tab === "ai" && <AiReviewTab trades={scoped} />}
      </div>

      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
      {detail && <TradeDetailDrawer trade={detail} onClose={() => setDetail(null)} />}
    </AppShell>
  );
}

// ============================================================================
// OVERVIEW
// ============================================================================
function OverviewTab({ trades }: { trades: Trade[] }) {
  const m = useMemo(() => computeMetrics(trades), [trades]);
  const curve = useMemo(() => cumulativeCurve(trades), [trades]);
  const cumSpark = curve.map((c) => c.cum);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
        <KpiCard label="Net P&L" value={formatINR(m.net, true)} delta={m.net === 0 ? undefined : (m.net / Math.max(1, Math.abs(m.gross_loss || 1))) * 100} accent />
        <KpiCard label="Win Rate" value={`${(m.win_rate * 100).toFixed(1)}%`} hint={`${m.wins}W / ${m.losses}L`} />
        <KpiCard label="Profit Factor" value={isFinite(m.profit_factor) ? m.profit_factor.toFixed(2) : "∞"} />
        <KpiCard label="Expectancy" value={formatINR(m.expectancy, true)} />
        <KpiCard label="Avg R:R" value={m.rr.toFixed(2)} />
        <KpiCard label="Sharpe" value={m.sharpe.toFixed(2)} hint="annualized" />
        <KpiCard label="Total Trades" value={m.total.toString()} />
        <KpiCard label="Avg Winner" value={formatINR(m.avg_win, true)} />
        <KpiCard label="Avg Loser" value={formatINR(m.avg_loss, true)} />
        <KpiCard label="Max Drawdown" value={formatINR(m.max_drawdown, true)} />
        <KpiCard label="Recovery Factor" value={m.recovery_factor.toFixed(2)} />
        <KpiCard label="Best / Worst" value={`${formatINR(m.best, true)} / ${formatINR(m.worst, true)}`} />
        <KpiCard label="Win Streak" value={`${m.cur_win_streak} · max ${m.max_win_streak}`} />
        <KpiCard label="Loss Streak" value={`${m.cur_loss_streak} · max ${m.max_loss_streak}`} />
        <KpiCard label="Avg Hold" value={`${m.avg_hold_hours < 24 ? m.avg_hold_hours.toFixed(1) + "h" : (m.avg_hold_hours / 24).toFixed(1) + "d"}`} />
        <KpiCard label="Charges" value={formatINR(m.charges, true)} />
        <KpiCard label="Gross Profit" value={formatINR(m.gross_profit, true)} />
        <KpiCard label="Gross Loss" value={formatINR(m.gross_loss, true)} />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8 glass rounded-2xl p-5">
          <SectionHeader title="Cumulative P&L" subtitle={`${curve.length} trading days`} />
          {curve.length > 0 ? (
            <>
              <Sparkline data={cumSpark.length ? cumSpark : [0]} positive={m.net >= 0} className="h-32" />
              <div className="mt-4 grid grid-cols-7 gap-1">
                {curve.slice(-49).map((d, i) => {
                  const max = Math.max(...curve.map((c) => Math.abs(c.daily))) || 1;
                  const h = Math.max(2, (Math.abs(d.daily) / max) * 40);
                  const pos = d.daily >= 0;
                  return (
                    <div key={i} className="flex flex-col items-center gap-0.5" title={`${d.date}: ${formatINR(d.daily)}`}>
                      <div className={cn("w-full rounded-sm", pos ? "bg-success/70" : "bg-destructive/70")}
                        style={{ height: `${h}px` }} />
                    </div>
                  );
                })}
              </div>
            </>
          ) : <EmptyState label="No closed trades in this range" />}
        </div>
        <div className="col-span-12 lg:col-span-4 glass rounded-2xl p-5">
          <SectionHeader title="P&L Breakdown" />
          <PnLByGroup trades={trades} label="Strategy" fn={(t) => t.strategy ?? "—"} />
          <div className="mt-4"><PnLByGroup trades={trades} label="Sector" fn={(t) => t.sector ?? "—"} /></div>
          <div className="mt-4"><PnLByGroup trades={trades} label="Long vs Short" fn={(t) => t.direction === "long" ? "Long" : "Short"} /></div>
        </div>
      </div>
    </div>
  );
}

function PnLByGroup({ trades, label, fn }: { trades: Trade[]; label: string; fn: (t: Trade) => string }) {
  const rows = useMemo(() => {
    const closed = trades.filter((t) => t.status === "closed");
    const g = groupBy(closed, fn);
    return [...g.entries()].map(([k, ts]) => ({ k, sum: ts.reduce((s, t) => s + pnl(t), 0), n: ts.length }))
      .sort((a, b) => b.sum - a.sum).slice(0, 6);
  }, [trades, fn]);
  const max = Math.max(...rows.map((r) => Math.abs(r.sum)), 1);
  if (!rows.length) return <div className="text-xs text-muted-foreground">No data</div>;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{label}</div>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.k} className="flex items-center gap-2 text-xs">
            <div className="w-24 truncate">{r.k}</div>
            <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
              <div className={cn("h-full", r.sum >= 0 ? "bg-success" : "bg-destructive")}
                style={{ width: `${(Math.abs(r.sum) / max) * 100}%` }} />
            </div>
            <div className={cn("w-20 text-right num", r.sum >= 0 ? "text-success" : "text-destructive")}>
              {formatINR(r.sum, true)}
            </div>
            <div className="w-8 text-right text-muted-foreground">{r.n}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// TRADES TABLE
// ============================================================================
function TradesTab({ trades, onOpen }: { trades: Trade[]; onOpen: (t: Trade) => void }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "open" | "closed">("all");
  const [dir, setDir] = useState<"all" | Direction>("all");

  const rows = useMemo(() => {
    return trades
      .filter((t) => status === "all" ? true : t.status === status)
      .filter((t) => dir === "all" ? true : t.direction === dir)
      .filter((t) => q ? t.symbol.toLowerCase().includes(q.toLowerCase()) : true)
      .sort((a, b) => new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime());
  }, [trades, q, status, dir]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search symbol…"
          className="h-9 px-3 text-sm rounded-lg bg-muted/40 border border-border/60 w-56" />
        <Segmented value={status} onChange={(v) => setStatus(v as any)} options={[
          { v: "all", l: "All" }, { v: "open", l: "Open" }, { v: "closed", l: "Closed" },
        ]} />
        <Segmented value={dir} onChange={(v) => setDir(v as any)} options={[
          { v: "all", l: "Any" }, { v: "long", l: "Long" }, { v: "short", l: "Short" },
        ]} />
        <div className="text-xs text-muted-foreground ml-auto">{rows.length} trades</div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/20 border-b border-border/60">
            <tr className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {["Symbol", "Dir", "Instr", "Qty", "Entry", "Exit", "P&L", "R", "Strategy", "Grade", "Date", ""].map((h) => (
                <th key={h} className="text-left font-medium px-3 py-2.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={12}><EmptyState label="No trades match these filters" /></td></tr>
            ) : rows.slice(0, 200).map((t) => {
              const p = pnl(t);
              const r = rMultiple(t);
              return (
                <tr key={t.id} onClick={() => onOpen(t)} className="border-b border-border/40 hover:bg-muted/20 cursor-pointer">
                  <td className="px-3 py-2.5 font-medium">{t.symbol}</td>
                  <td className="px-3 py-2.5"><DirBadge d={t.direction} /></td>
                  <td className="px-3 py-2.5 text-muted-foreground">{t.instrument}</td>
                  <td className="px-3 py-2.5 num">{t.quantity}</td>
                  <td className="px-3 py-2.5 num">{formatINR(t.entry_price)}</td>
                  <td className="px-3 py-2.5 num">{t.exit_price ? formatINR(t.exit_price) : "—"}</td>
                  <td className={cn("px-3 py-2.5 num font-medium", p > 0 ? "text-success" : p < 0 ? "text-destructive" : "")}>
                    {t.status === "closed" ? formatINR(p, true) : <span className="text-muted-foreground">Open</span>}
                  </td>
                  <td className="px-3 py-2.5 num text-muted-foreground">{r ?? "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{t.strategy ?? "—"}</td>
                  <td className="px-3 py-2.5">{t.grade ? <GradeBadge g={t.grade} /> : "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{new Date(t.entry_time).toLocaleDateString()}</td>
                  <td className="px-3 py-2.5"><ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// NEW TRADE (progressive disclosure)
// ============================================================================
function NewTradeTab({ onSaved }: { onSaved: () => void }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Partial<Trade>>({
    direction: "long", instrument: "equity", duration: "swing", status: "open",
    quantity: 0, entry_price: 0, entry_time: new Date().toISOString().slice(0, 16),
    fomo: false, revenge: false, mistakes: [],
  });
  const set = (patch: Partial<Trade>) => setForm((f) => ({ ...f, ...patch }));

  const save = () => {
    if (!form.symbol || !form.entry_price || !form.quantity) return;
    const t: Omit<Trade, "id"> = {
      symbol: form.symbol!.toUpperCase(),
      direction: form.direction!, instrument: form.instrument!,
      duration: form.duration!, status: form.status!,
      quantity: +form.quantity!, entry_price: +form.entry_price!,
      exit_price: form.exit_price ? +form.exit_price : null,
      stop_loss: form.stop_loss ? +form.stop_loss : null,
      target_price: form.target_price ? +form.target_price : null,
      entry_time: new Date(form.entry_time!).toISOString(),
      exit_time: form.exit_time ? new Date(form.exit_time).toISOString() : null,
      strategy: form.strategy, setup: form.setup, timeframe: form.timeframe,
      market_trend: form.market_trend, market_alignment: form.market_alignment,
      trade_type: form.trade_type, source: form.source, rationale: form.rationale,
      risk_amount: form.risk_amount, planned_reward: form.planned_reward,
      confidence_before: form.confidence_before, focus_before: form.focus_before,
      stress_before: form.stress_before, energy_before: form.energy_before,
      fomo: form.fomo, revenge: form.revenge, emotion_before: form.emotion_before,
      mistakes: form.mistakes ?? [], charges: form.charges,
    };
    addTrade(t);
    onSaved();
  };

  return (
    <div className="grid grid-cols-12 gap-5">
      <div className="col-span-12 lg:col-span-8 space-y-5">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            {[1, 2, 3, 4].map((n) => (
              <button key={n} onClick={() => setStep(n)}
                className={cn("h-7 px-3 rounded-full text-[11px] font-medium",
                  step === n ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:text-foreground")}>
                {n}. {["Basics", "Context", "Risk", "Psychology"][n - 1]}
              </button>
            ))}
          </div>

          {step === 1 && (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Symbol"><input placeholder="e.g. RELIANCE" value={form.symbol ?? ""}
                onChange={(e) => set({ symbol: e.target.value })} className={inputCls} /></FormField>
              <FormField label="Direction"><Chips value={form.direction} onChange={(v) => set({ direction: v as Direction })}
                options={[["long", "Long"], ["short", "Short"], ["non_directional", "Non-dir"]]} /></FormField>
              <FormField label="Instrument"><Chips value={form.instrument} onChange={(v) => set({ instrument: v as Instrument })}
                options={[["equity", "Equity"], ["equity_mtf", "MTF"], ["futures", "Futures"], ["options", "Options"]]} /></FormField>
              <FormField label="Duration"><Chips value={form.duration} onChange={(v) => set({ duration: v as Duration })}
                options={[["intraday", "Intraday"], ["swing", "Swing"], ["positional_weekly", "Weekly"], ["positional_monthly", "Monthly"]]} /></FormField>
              <FormField label="Quantity"><input type="number" value={form.quantity ?? ""}
                onChange={(e) => set({ quantity: +e.target.value })} className={inputCls} /></FormField>
              <FormField label="Entry Price"><input type="number" step="0.01" value={form.entry_price ?? ""}
                onChange={(e) => set({ entry_price: +e.target.value })} className={inputCls} /></FormField>
              <FormField label="Exit Price (optional)"><input type="number" step="0.01" value={form.exit_price ?? ""}
                onChange={(e) => set({ exit_price: +e.target.value, status: e.target.value ? "closed" : "open" })} className={inputCls} /></FormField>
              <FormField label="Entry Time"><input type="datetime-local" value={form.entry_time?.slice(0, 16) ?? ""}
                onChange={(e) => set({ entry_time: e.target.value })} className={inputCls} /></FormField>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Strategy"><input placeholder="Breakout, Momentum…" value={form.strategy ?? ""}
                onChange={(e) => set({ strategy: e.target.value })} className={inputCls} /></FormField>
              <FormField label="Setup"><input placeholder="Resistance Breakout…" value={form.setup ?? ""}
                onChange={(e) => set({ setup: e.target.value })} className={inputCls} /></FormField>
              <FormField label="Timeframe"><Chips value={form.timeframe}
                onChange={(v) => set({ timeframe: v })} options={[["Daily", "D"], ["Hourly", "1H"], ["15m", "15m"], ["5m", "5m"], ["Weekly", "W"], ["Monthly", "M"]]} /></FormField>
              <FormField label="Market Trend"><Chips value={form.market_trend}
                onChange={(v) => set({ market_trend: v })} options={[["Strong uptrend", "Str↑"], ["Uptrend", "Up"], ["Sideways", "Side"], ["Downtrend", "Dn"], ["Strong downtrend", "Str↓"]]} /></FormField>
              <FormField label="Alignment"><Chips value={form.market_alignment}
                onChange={(v) => set({ market_alignment: v })} options={[["With trend", "With"], ["Contra trend", "Contra"], ["Neutral", "Neutral"]]} /></FormField>
              <FormField label="Source"><Chips value={form.source}
                onChange={(v) => set({ source: v })} options={[["Self study", "Self"], ["Algo", "Algo"], ["Tip", "Tip"], ["News", "News"], ["Group study", "Group"]]} /></FormField>
              <div className="col-span-2">
                <FormField label="Rationale / Thesis">
                  <textarea rows={3} value={form.rationale ?? ""} onChange={(e) => set({ rationale: e.target.value })}
                    placeholder="Why did you take this trade? What invalidates it?" className={inputCls + " resize-none"} />
                </FormField>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Stop Loss"><input type="number" step="0.01" value={form.stop_loss ?? ""}
                onChange={(e) => set({ stop_loss: +e.target.value })} className={inputCls} /></FormField>
              <FormField label="Target"><input type="number" step="0.01" value={form.target_price ?? ""}
                onChange={(e) => set({ target_price: +e.target.value })} className={inputCls} /></FormField>
              <FormField label="Risk Amount (₹)"><input type="number" value={form.risk_amount ?? ""}
                onChange={(e) => set({ risk_amount: +e.target.value })} className={inputCls} /></FormField>
              <FormField label="Planned Reward (₹)"><input type="number" value={form.planned_reward ?? ""}
                onChange={(e) => set({ planned_reward: +e.target.value })} className={inputCls} /></FormField>
              <FormField label="Charges (₹)"><input type="number" step="0.01" value={form.charges ?? ""}
                onChange={(e) => set({ charges: +e.target.value })} className={inputCls} /></FormField>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Slider label="Confidence" value={form.confidence_before ?? 5} onChange={(v) => set({ confidence_before: v })} />
                <Slider label="Focus" value={form.focus_before ?? 5} onChange={(v) => set({ focus_before: v })} />
                <Slider label="Stress" value={form.stress_before ?? 3} onChange={(v) => set({ stress_before: v })} />
                <Slider label="Energy" value={form.energy_before ?? 5} onChange={(v) => set({ energy_before: v })} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Toggle label="FOMO" value={!!form.fomo} onChange={(v) => set({ fomo: v })} />
                <Toggle label="Revenge trade" value={!!form.revenge} onChange={(v) => set({ revenge: v })} />
              </div>
              <FormField label="Emotion Before Entry">
                <Chips value={form.emotion_before} onChange={(v) => set({ emotion_before: v })}
                  options={["Calm", "Confident", "Focused", "Excited", "Anxious", "Fearful", "Greedy", "Frustrated", "Impulsive", "Bored"].map(x => [x, x])} />
              </FormField>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <button onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}
              className="h-9 px-3 text-xs rounded-lg border border-border/60 hover:bg-muted/40 disabled:opacity-40">Back</button>
            <div className="flex items-center gap-2">
              {step < 4 && (
                <button onClick={() => setStep((s) => Math.min(4, s + 1))}
                  className="h-9 px-3 text-xs rounded-lg border border-border/60 hover:bg-muted/40">Next</button>
              )}
              <button onClick={save}
                className="h-9 px-4 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90">
                Save trade
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-4 space-y-4">
        <div className="glass rounded-2xl p-5">
          <SectionHeader title="Live Preview" />
          <div className="space-y-1.5 text-xs">
            <Row k="Symbol" v={form.symbol ?? "—"} />
            <Row k="Direction" v={form.direction ?? "—"} />
            <Row k="Instrument" v={form.instrument ?? "—"} />
            <Row k="Qty × Entry" v={`${form.quantity ?? 0} × ${formatINR(+form.entry_price! || 0)}`} />
            <Row k="Capital" v={formatINR((+form.entry_price! || 0) * (+form.quantity! || 0), true)} />
            <Row k="Risk (SL)" v={form.stop_loss ? formatINR(Math.abs((+form.entry_price! - +form.stop_loss) * +form.quantity!), true) : "—"} />
            <Row k="Reward (Target)" v={form.target_price ? formatINR(Math.abs((+form.target_price - +form.entry_price!) * +form.quantity!), true) : "—"} />
            <Row k="Planned R" v={form.stop_loss && form.target_price
              ? (Math.abs(+form.target_price - +form.entry_price!) / Math.abs(+form.entry_price! - +form.stop_loss)).toFixed(2)
              : "—"} />
          </div>
        </div>
        <div className="glass rounded-2xl p-5 border-warning/30 border">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-primary mt-0.5" />
            <div className="text-xs">
              <div className="font-medium mb-1">Pre-trade checklist</div>
              <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                <li>Setup confirmed on the intended timeframe</li>
                <li>Stop loss defined before entry</li>
                <li>Risk is within your daily loss cap</li>
                <li>Not entering out of FOMO or revenge</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// OPEN TRADES
// ============================================================================
function OpenTradesTab({ trades, onOpen }: { trades: Trade[]; onOpen: (t: Trade) => void }) {
  const open = useMemo(() => trades.filter((t) => t.status === "open"), [trades]);
  const totalCapital = open.reduce((s, t) => s + t.entry_price * t.quantity, 0);
  const unreal = open.reduce((s, t) => s + unrealized(t), 0);
  const totalRisk = open.reduce((s, t) => s + (t.risk_amount ?? 0), 0);
  const nearTarget = open.filter((t) => t.ltp && t.target_price && Math.abs(t.ltp - t.target_price) / t.entry_price < 0.02);
  const nearStop = open.filter((t) => t.ltp && t.stop_loss && Math.abs(t.ltp - t.stop_loss) / t.entry_price < 0.02);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <KpiCard label="Open Positions" value={open.length.toString()} />
        <KpiCard label="Capital Deployed" value={formatINR(totalCapital, true)} />
        <KpiCard label="Unrealized P&L" value={formatINR(unreal, true)} delta={totalCapital ? (unreal / totalCapital) * 100 : 0} accent />
        <KpiCard label="Portfolio Risk" value={formatINR(totalRisk, true)} hint={`${totalCapital ? ((totalRisk / totalCapital) * 100).toFixed(1) : 0}% of capital`} />
        <KpiCard label="Near Target" value={nearTarget.length.toString()} />
        <KpiCard label="Near Stop" value={nearStop.length.toString()} />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-4 glass rounded-2xl p-5">
          <SectionHeader title="Allocation" subtitle="By sector" />
          <PnLByGroup trades={open} label="Sector" fn={(t) => t.sector ?? "—"} />
          <div className="mt-4"><PnLByGroup trades={open} label="Strategy" fn={(t) => t.strategy ?? "—"} /></div>
        </div>

        <div className="col-span-12 lg:col-span-8 glass rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border/60 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider">Positions</div>
            <div className="text-[10px] text-muted-foreground">LTP is simulated for demo data</div>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-muted/20 border-b border-border/60">
              <tr className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {["Symbol", "Dir", "Qty", "Entry", "LTP", "P&L", "SL", "→SL", "Target", "→TP", "Status"].map((h) =>
                  <th key={h} className="text-left font-medium px-3 py-2.5">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {open.length === 0 ? (
                <tr><td colSpan={11}><EmptyState label="No open positions" /></td></tr>
              ) : open.map((t) => {
                const p = unrealized(t);
                const toSL = t.stop_loss && t.ltp ? ((t.ltp - t.stop_loss) / t.entry_price) * 100 : null;
                const toTP = t.target_price && t.ltp ? ((t.target_price - t.ltp) / t.entry_price) * 100 : null;
                const near = t.ltp && t.stop_loss && Math.abs(t.ltp - t.stop_loss) / t.entry_price < 0.02;
                const status = near ? "Near stop" : t.ltp && t.target_price && Math.abs(t.ltp - t.target_price) / t.entry_price < 0.02 ? "Near target" : "Hold";
                return (
                  <tr key={t.id} onClick={() => onOpen(t)} className="border-b border-border/40 hover:bg-muted/20 cursor-pointer">
                    <td className="px-3 py-2.5 font-medium">{t.symbol}</td>
                    <td className="px-3 py-2.5"><DirBadge d={t.direction} /></td>
                    <td className="px-3 py-2.5 num">{t.quantity}</td>
                    <td className="px-3 py-2.5 num">{formatINR(t.entry_price)}</td>
                    <td className="px-3 py-2.5 num">{t.ltp ? formatINR(t.ltp) : "—"}</td>
                    <td className={cn("px-3 py-2.5 num font-medium", p > 0 ? "text-success" : p < 0 ? "text-destructive" : "")}>{formatINR(p, true)}</td>
                    <td className="px-3 py-2.5 num text-muted-foreground">{t.stop_loss ? formatINR(t.stop_loss) : "—"}</td>
                    <td className="px-3 py-2.5 num text-muted-foreground">{toSL != null ? formatPct(toSL) : "—"}</td>
                    <td className="px-3 py-2.5 num text-muted-foreground">{t.target_price ? formatINR(t.target_price) : "—"}</td>
                    <td className="px-3 py-2.5 num text-muted-foreground">{toTP != null ? formatPct(toTP) : "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider",
                        status === "Near stop" ? "bg-destructive/15 text-destructive" :
                        status === "Near target" ? "bg-success/15 text-success" : "bg-muted/40 text-muted-foreground")}>
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CALENDAR
// ============================================================================
function CalendarTab({ trades }: { trades: Trade[] }) {
  const curve = cumulativeCurve(trades);
  const map = new Map(curve.map((c) => [c.date, c.daily]));
  const today = new Date();
  const weeks: string[][] = [];
  const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const cur = new Date(start);
  cur.setDate(cur.getDate() - cur.getDay());
  while (cur <= end) {
    const w: string[] = [];
    for (let i = 0; i < 7; i++) { w.push(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1); }
    weeks.push(w);
  }
  const max = Math.max(...curve.map((c) => Math.abs(c.daily)), 1);

  return (
    <div className="glass rounded-2xl p-5">
      <SectionHeader title="Trading Calendar" subtitle="Last 3 months of daily P&L" />
      <div className="grid grid-cols-7 gap-1.5 text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="text-center">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {weeks.flat().map((date) => {
          const v = map.get(date);
          const intensity = v ? Math.min(1, Math.abs(v) / max) : 0;
          const bg = v == null ? "bg-muted/20" : v >= 0 ? `bg-success/[${(0.15 + intensity * 0.6).toFixed(2)}]` : `bg-destructive/[${(0.15 + intensity * 0.6).toFixed(2)}]`;
          const day = new Date(date).getDate();
          return (
            <div key={date} className={cn("aspect-square rounded-md p-1.5 border border-border/40 flex flex-col justify-between text-[10px]", bg)}
              style={v != null ? { backgroundColor: `oklch(${v >= 0 ? "0.7 0.16 155" : "0.62 0.22 22"} / ${0.15 + intensity * 0.6})` } : {}}
              title={v != null ? `${date}: ${formatINR(v)}` : date}>
              <div className="text-muted-foreground">{day}</div>
              {v != null && <div className={cn("num font-medium", v >= 0 ? "text-success" : "text-destructive")}>{formatINR(v, true)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// STRATEGIES / PLAYBOOK / REPORTS / MISTAKES / AI
// ============================================================================
function StrategiesTab({ trades }: { trades: Trade[] }) {
  const rows = useMemo(() => {
    const closed = trades.filter((t) => t.status === "closed");
    const g = groupBy(closed, (t) => t.strategy ?? "Uncategorized");
    return [...g.entries()].map(([name, ts]) => {
      const pnls = ts.map(pnl);
      const wins = pnls.filter((p) => p > 0);
      return {
        name, count: ts.length, wr: wins.length / ts.length,
        net: pnls.reduce((s, x) => s + x, 0),
        avg: pnls.reduce((s, x) => s + x, 0) / ts.length,
        best: Math.max(...pnls), worst: Math.min(...pnls),
      };
    }).sort((a, b) => b.net - a.net);
  }, [trades]);

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-muted/20 border-b border-border/60">
          <tr className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {["Strategy", "Trades", "Win Rate", "Net P&L", "Avg P&L", "Best", "Worst"].map((h) =>
              <th key={h} className="text-left font-medium px-4 py-3">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-border/40">
              <td className="px-4 py-3 font-medium">{r.name}</td>
              <td className="px-4 py-3 num">{r.count}</td>
              <td className="px-4 py-3 num">{(r.wr * 100).toFixed(1)}%</td>
              <td className={cn("px-4 py-3 num font-semibold", r.net >= 0 ? "text-success" : "text-destructive")}>{formatINR(r.net, true)}</td>
              <td className="px-4 py-3 num">{formatINR(r.avg, true)}</td>
              <td className="px-4 py-3 num text-success">{formatINR(r.best, true)}</td>
              <td className="px-4 py-3 num text-destructive">{formatINR(r.worst, true)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlaybookTab() {
  return (
    <div className="glass rounded-2xl p-8 text-center">
      <BookOpen className="h-8 w-8 text-primary mx-auto mb-3" />
      <h3 className="font-semibold">Personal Playbook</h3>
      <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
        Build your rulebook — entry, confirmation, stop, target, sizing, and exit rules per strategy.
        The schema is provisioned (strategies table). Editor UI ships in the next pass.
      </p>
    </div>
  );
}

function ReportsTab({ trades }: { trades: Trade[] }) {
  const byDay = useMemo(() => {
    const closed = trades.filter((t) => t.status === "closed" && t.exit_time);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const buckets = days.map((d) => ({ day: d, pnl: 0, count: 0 }));
    for (const t of closed) {
      const idx = new Date(t.exit_time!).getDay();
      buckets[idx].pnl += pnl(t); buckets[idx].count++;
    }
    return buckets;
  }, [trades]);

  const bySector = useMemo(() => {
    const closed = trades.filter((t) => t.status === "closed");
    const g = groupBy(closed, (t) => t.sector ?? "—");
    return [...g.entries()].map(([k, ts]) => ({ k, n: ts.length, sum: ts.reduce((s, t) => s + pnl(t), 0) }))
      .sort((a, b) => b.sum - a.sum);
  }, [trades]);

  const max = Math.max(...byDay.map((b) => Math.abs(b.pnl)), 1);
  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 lg:col-span-6 glass rounded-2xl p-5">
        <SectionHeader title="P&L by Weekday" />
        <div className="space-y-2">
          {byDay.map((b) => (
            <div key={b.day} className="flex items-center gap-3 text-xs">
              <div className="w-10 text-muted-foreground">{b.day}</div>
              <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                <div className={cn("h-full", b.pnl >= 0 ? "bg-success" : "bg-destructive")}
                  style={{ width: `${(Math.abs(b.pnl) / max) * 100}%` }} />
              </div>
              <div className={cn("w-24 text-right num", b.pnl >= 0 ? "text-success" : "text-destructive")}>{formatINR(b.pnl, true)}</div>
              <div className="w-8 text-right text-muted-foreground">{b.count}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="col-span-12 lg:col-span-6 glass rounded-2xl p-5">
        <SectionHeader title="Sector Contribution" />
        <div className="space-y-1.5">
          {bySector.slice(0, 10).map((r) => {
            const localMax = Math.max(...bySector.map((x) => Math.abs(x.sum)), 1);
            return (
              <div key={r.k} className="flex items-center gap-2 text-xs">
                <div className="w-24 truncate">{r.k}</div>
                <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                  <div className={cn("h-full", r.sum >= 0 ? "bg-success" : "bg-destructive")}
                    style={{ width: `${(Math.abs(r.sum) / localMax) * 100}%` }} />
                </div>
                <div className={cn("w-24 text-right num", r.sum >= 0 ? "text-success" : "text-destructive")}>{formatINR(r.sum, true)}</div>
                <div className="w-8 text-right text-muted-foreground">{r.n}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MistakesTab({ trades }: { trades: Trade[] }) {
  const stats = mistakeStats(trades);
  if (!stats.length) return <EmptyState label="No mistakes logged in this range 🎉" />;
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-muted/20 border-b border-border/60">
          <tr className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {["Mistake", "Occurrences", "Total Impact", "Avg / Trade", "Loss Rate"].map((h) =>
              <th key={h} className="text-left font-medium px-4 py-3">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.mistake} className="border-b border-border/40">
              <td className="px-4 py-3 font-medium flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />{s.mistake}
              </td>
              <td className="px-4 py-3 num">{s.count}</td>
              <td className="px-4 py-3 num text-destructive">{formatINR(s.total_impact, true)}</td>
              <td className="px-4 py-3 num">{formatINR(s.avg_loss, true)}</td>
              <td className="px-4 py-3 num">{(s.loss_rate * 100).toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AiReviewTab({ trades }: { trades: Trade[] }) {
  const m = computeMetrics(trades);
  const strategies = groupBy(trades.filter(t => t.status === "closed"), (t) => t.strategy ?? "—");
  const bestStrat = [...strategies.entries()]
    .map(([k, ts]) => ({ k, n: ts.length, sum: ts.reduce((s, t) => s + pnl(t), 0), wr: ts.filter(t => pnl(t) > 0).length / ts.length }))
    .filter((s) => s.n >= 5)
    .sort((a, b) => b.sum - a.sum)[0];
  const mistakes = mistakeStats(trades);
  const worstMistake = mistakes[0];

  const insights: { title: string; body: string; evidence: string }[] = [];
  if (bestStrat) insights.push({
    title: "Strongest setup",
    body: `Your best-performing strategy is ${bestStrat.k}: ${(bestStrat.wr * 100).toFixed(0)}% win rate across ${bestStrat.n} trades and ${formatINR(bestStrat.sum, true)} net P&L.`,
    evidence: `Sample: ${bestStrat.n} closed trades`,
  });
  if (worstMistake && worstMistake.count >= 3) insights.push({
    title: "Biggest recurring mistake",
    body: `"${worstMistake.mistake}" occurred ${worstMistake.count} times and cost ${formatINR(worstMistake.total_impact, true)} in total.`,
    evidence: `Sample: ${worstMistake.count} occurrences`,
  });
  if (m.cur_loss_streak >= 2) insights.push({
    title: "Streak alert",
    body: `You're on a ${m.cur_loss_streak}-trade loss streak. Historically, results after 2+ losses tend to decline — consider a break.`,
    evidence: `Live signal`,
  });
  if (m.profit_factor > 0 && isFinite(m.profit_factor)) insights.push({
    title: "Profit factor",
    body: m.profit_factor >= 1.5 ? `PF of ${m.profit_factor.toFixed(2)} is healthy — every ₹1 risked returns ₹${m.profit_factor.toFixed(2)}.` : `PF of ${m.profit_factor.toFixed(2)} is below the 1.5 target. Focus on trimming losers faster.`,
    evidence: `${m.total} closed trades`,
  });

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-5 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-primary mt-0.5" />
        <div className="text-xs text-muted-foreground">
          Insights are generated from your journaled trades only. Sample sizes are shown for every claim. This is not financial advice.
        </div>
      </div>
      {insights.length === 0 ? (
        <EmptyState label="Not enough data yet — log or import more trades for meaningful AI review." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((i, idx) => (
            <div key={idx} className="glass rounded-2xl p-5">
              <div className="text-[10px] uppercase tracking-widest text-primary font-semibold mb-1">{i.title}</div>
              <div className="text-sm leading-relaxed">{i.body}</div>
              <div className="text-[10px] text-muted-foreground mt-2">{i.evidence}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// IMPORT MODAL
// ============================================================================
function ImportModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("symbol,direction,quantity,entry_price,exit_price,entry_time,exit_time,strategy\nRELIANCE,long,10,2450,2510,2026-07-01T09:30,2026-07-03T15:00,Breakout");
  const [preview, setPreview] = useState<Partial<Trade>[]>([]);

  const parse = () => setPreview(parseCsv(text));
  const commit = () => {
    for (const p of preview) {
      addTrade({
        symbol: p.symbol ?? "UNKNOWN", direction: p.direction ?? "long",
        instrument: p.instrument ?? "equity", duration: p.duration ?? "swing",
        status: p.status ?? "open", quantity: p.quantity ?? 0,
        entry_price: p.entry_price ?? 0, exit_price: p.exit_price ?? null,
        entry_time: p.entry_time ?? new Date().toISOString(),
        exit_time: p.exit_time ?? null, strategy: p.strategy,
      } as Omit<Trade, "id">);
    }
    onClose();
  };

  return (
    <Modal onClose={onClose} title="Import Trades">
      <div className="space-y-4">
        <div className="text-xs text-muted-foreground">
          Paste CSV with columns: <span className="num text-foreground">symbol, direction, quantity, entry_price, exit_price, entry_time, exit_time, strategy</span>.
          Broker-specific parsers (Zerodha, Upstox, ICICI, Angel, Groww) ship in the next pass.
        </div>
        <textarea rows={8} value={text} onChange={(e) => setText(e.target.value)}
          className="w-full text-xs num p-3 rounded-lg bg-muted/40 border border-border/60 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
        <div className="flex items-center gap-2">
          <button onClick={parse} className="h-9 px-3 text-xs rounded-lg border border-border/60 hover:bg-muted/40">Parse preview</button>
          {preview.length > 0 && (
            <button onClick={commit} className="h-9 px-4 text-xs font-medium rounded-lg bg-primary text-primary-foreground">Import {preview.length} trades</button>
          )}
          <button onClick={() => { resetJournal(); onClose(); }} className="ml-auto h-9 px-3 text-xs rounded-lg text-destructive hover:bg-destructive/10">Reset demo data</button>
        </div>
        {preview.length > 0 && (
          <div className="max-h-64 overflow-auto glass rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-muted/20"><tr>{["Symbol", "Dir", "Qty", "Entry", "Exit"].map(h => <th key={h} className="text-left px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {preview.map((p, i) => (
                  <tr key={i} className="border-b border-border/40">
                    <td className="px-3 py-2 font-medium">{p.symbol}</td>
                    <td className="px-3 py-2">{p.direction}</td>
                    <td className="px-3 py-2 num">{p.quantity}</td>
                    <td className="px-3 py-2 num">{p.entry_price}</td>
                    <td className="px-3 py-2 num">{p.exit_price ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ============================================================================
// TRADE DETAIL DRAWER
// ============================================================================
function TradeDetailDrawer({ trade, onClose }: { trade: Trade; onClose: () => void }) {
  const p = pnl(trade);
  const r = rMultiple(trade);
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 bottom-0 w-full max-w-lg glass-strong overflow-y-auto p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{trade.symbol}</h2>
              <DirBadge d={trade.direction} />
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted/40 uppercase tracking-wider">{trade.instrument}</span>
              {trade.grade && <GradeBadge g={trade.grade} />}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {trade.strategy ?? "—"} · {trade.setup ?? ""} · {trade.timeframe ?? ""}
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted/40"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5">
          <Mini label="P&L" value={trade.status === "closed" ? formatINR(p, true) : formatINR(unrealized(trade), true)}
            tone={(trade.status === "closed" ? p : unrealized(trade)) >= 0 ? "succ" : "dest"} />
          <Mini label="R multiple" value={r != null ? `${r}R` : "—"} />
          <Mini label="Qty" value={trade.quantity.toString()} />
          <Mini label="Entry" value={formatINR(trade.entry_price)} />
          <Mini label="Exit / LTP" value={trade.exit_price ? formatINR(trade.exit_price) : trade.ltp ? formatINR(trade.ltp) : "—"} />
          <Mini label="Charges" value={formatINR(trade.charges ?? 0, true)} />
          <Mini label="Stop" value={trade.stop_loss ? formatINR(trade.stop_loss) : "—"} tone="dest" />
          <Mini label="Target" value={trade.target_price ? formatINR(trade.target_price) : "—"} tone="succ" />
          <Mini label="Risk" value={trade.risk_amount ? formatINR(trade.risk_amount, true) : "—"} />
        </div>

        <Section title="Rationale"><p className="text-xs text-muted-foreground leading-relaxed">{trade.rationale ?? "—"}</p></Section>

        <Section title="Market Context">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Row k="Trend" v={trade.market_trend ?? "—"} />
            <Row k="Alignment" v={trade.market_alignment ?? "—"} />
            <Row k="Type" v={trade.trade_type ?? "—"} />
            <Row k="Source" v={trade.source ?? "—"} />
          </div>
        </Section>

        <Section title="Psychology">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Row k="Confidence" v={`${trade.confidence_before ?? "—"}/10`} />
            <Row k="Focus" v={`${trade.focus_before ?? "—"}/10`} />
            <Row k="Stress" v={`${trade.stress_before ?? "—"}/10`} />
            <Row k="Energy" v={`${trade.energy_before ?? "—"}/10`} />
            <Row k="Emotion (before)" v={trade.emotion_before ?? "—"} />
            <Row k="Emotion (after)" v={trade.emotion_after ?? "—"} />
            <Row k="FOMO" v={trade.fomo ? "Yes" : "No"} />
            <Row k="Revenge" v={trade.revenge ? "Yes" : "No"} />
          </div>
        </Section>

        {trade.mistakes && trade.mistakes.length > 0 && (
          <Section title="Mistakes">
            <div className="flex flex-wrap gap-1.5">
              {trade.mistakes.map((m) => (
                <span key={m} className="text-[11px] font-medium bg-destructive/15 text-destructive px-2 py-0.5 rounded-full">{m}</span>
              ))}
            </div>
          </Section>
        )}

        <Section title="Execution Scores">
          <div className="grid grid-cols-4 gap-2 text-xs">
            <Mini label="Entry" value={`${trade.entry_quality ?? "—"}/10`} />
            <Mini label="Exit" value={`${trade.exit_quality ?? "—"}/10`} />
            <Mini label="Risk" value={`${trade.risk_mgmt_quality ?? "—"}/10`} />
            <Mini label="Exec" value={`${trade.execution_quality ?? "—"}/10`} />
          </div>
        </Section>

        <div className="mt-6 flex gap-2">
          {trade.status === "open" && (
            <button onClick={() => {
              const exit = prompt(`Exit price for ${trade.symbol}?`, String(trade.ltp ?? trade.entry_price));
              if (exit) {
                updateTrade(trade.id, {
                  status: "closed", exit_price: +exit,
                  exit_time: new Date().toISOString(),
                });
                onClose();
              }
            }} className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-medium">Close position</button>
          )}
          <button onClick={() => { if (confirm(`Delete ${trade.symbol}?`)) { deleteTrade(trade.id); onClose(); } }}
            className="h-9 px-3 rounded-lg border border-destructive/40 text-destructive text-xs font-medium hover:bg-destructive/10">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PRIMITIVES
// ============================================================================
const inputCls = "w-full h-9 rounded-lg bg-muted/40 border border-border/60 text-sm px-3 num focus:outline-none focus:ring-2 focus:ring-primary/40";

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function Chips({ value, onChange, options }: { value: any; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([v, l]) => (
        <button key={v} type="button" onClick={() => onChange(v)}
          className={cn("px-2.5 h-8 rounded-lg text-[11px] font-medium border transition",
            value === v ? "bg-primary/15 text-primary border-primary/30" : "border-border/60 text-muted-foreground hover:bg-muted/40")}>
          {l}
        </button>
      ))}
    </div>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
        <span className="num font-semibold text-primary">{value}/10</span>
      </div>
      <input type="range" min={1} max={10} value={value} onChange={(e) => onChange(+e.target.value)} className="w-full accent-primary" />
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} type="button"
      className={cn("h-8 px-3 rounded-lg text-[11px] font-medium border transition",
        value ? "bg-destructive/15 text-destructive border-destructive/30" : "border-border/60 text-muted-foreground")}>
      {value ? "✓ " : ""}{label}
    </button>
  );
}

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div className="glass rounded-lg p-0.5 flex">
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)}
          className={cn("h-7 px-2.5 text-[11px] font-medium rounded-md",
            value === o.v ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

function DirBadge({ d }: { d: Direction }) {
  const long = d === "long";
  return (
    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider inline-flex items-center gap-0.5",
      long ? "bg-success/15 text-success" : d === "short" ? "bg-destructive/15 text-destructive" : "bg-muted/40 text-muted-foreground")}>
      {long ? <TrendingUp className="h-2.5 w-2.5" /> : d === "short" ? <TrendingDown className="h-2.5 w-2.5" /> : null}
      {d === "non_directional" ? "N/D" : d}
    </span>
  );
}

function GradeBadge({ g }: { g: string }) {
  const tone = g.startsWith("A") ? "bg-success/15 text-success"
    : g === "B" ? "bg-primary/15 text-primary"
    : g === "C" ? "bg-muted/40 text-foreground"
    : "bg-destructive/15 text-destructive";
  return <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider", tone)}>{g}</span>;
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-14 text-center">
      <div className="inline-flex h-10 w-10 rounded-full bg-muted/30 items-center justify-center mb-2"><FileText className="h-4 w-4 text-muted-foreground" /></div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
      <span className="text-muted-foreground text-[11px] uppercase tracking-wider">{k}</span>
      <span className="num font-medium">{v}</span>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: "succ" | "dest" }) {
  return (
    <div className="p-2 rounded-lg bg-muted/20 border border-border/60">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={cn("text-sm font-medium num mt-0.5",
        tone === "succ" && "text-success", tone === "dest" && "text-destructive")}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-5">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">{title}</div>
      {children}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="glass-strong rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted/40"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
