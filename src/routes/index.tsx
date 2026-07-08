import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { indices, stocks, sectors, earnings, aiInsights, holdings } from "@/lib/mock-data";
import { Delta, KpiCard, SectionHeader, Sparkline, formatINR, formatPct } from "@/lib/ui-helpers";
import { INDEX_SYMBOL_MAP, quotesQuery, toTdStock } from "@/lib/market-queries";
import { Sparkles, TrendingUp, TrendingDown, Calendar, Wallet, ChevronRight, Activity, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard — StockSense AI" },
      { name: "description", content: "Real-time market intelligence, portfolio insights, and AI-driven signals." },
    ],
  }),
});

function Dashboard() {
  // Live index quotes
  const indexSymbols = indices.map((i) => INDEX_SYMBOL_MAP[i.symbol]).filter(Boolean);
  const idxQ = useQuery(quotesQuery(indexSymbols));
  const idxMap = new Map((idxQ.data?.quotes ?? []).map((q) => [q.symbol, q]));

  // Live stock quotes (used across heatmap / movers / watchlist)
  const stockSymbols = stocks.map((s) => toTdStock(s.symbol));
  const stkQ = useQuery(quotesQuery(stockSymbols));
  const stkMap = new Map((stkQ.data?.quotes ?? []).map((q) => [q.symbol, q]));

  const liveStocks = stocks.map((s) => {
    const q = stkMap.get(toTdStock(s.symbol));
    return q ? { ...s, price: q.price, change: q.change, changePct: q.changePct } : s;
  });

  const gainers = [...liveStocks].sort((a, b) => b.changePct - a.changePct).slice(0, 5);
  const losers = [...liveStocks].sort((a, b) => a.changePct - b.changePct).slice(0, 5);
  const watchlist = liveStocks.slice(0, 6);

  const portfolioValue = holdings.reduce((s, h) => s + h.qty * h.ltp, 0);
  const portfolioCost = holdings.reduce((s, h) => s + h.qty * h.avg, 0);
  const pnl = portfolioValue - portfolioCost;
  const pnlPct = (pnl / portfolioCost) * 100;

  const isLive = (idxQ.data?.quotes?.length ?? 0) > 0 || (stkQ.data?.quotes?.length ?? 0) > 0;

  return (
    <AppShell>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium tracking-wider uppercase">Friday · 3 Jul 2026</div>
            <h1 className="text-2xl font-semibold tracking-tight mt-1">
              Good morning, Arjun <span className="text-gradient-emerald">.</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border",
                  isLive
                    ? "bg-success/10 text-success border-success/30"
                    : "bg-muted/40 text-muted-foreground border-border",
                )}
                title={isLive ? "Twelve Data · live" : "Live data unavailable, showing sample"}
              >
                {isLive ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {isLive ? "Live" : "Sample"}
              </span>
              Markets are up. Your portfolio is <span className="text-success font-medium">+2.14%</span> today.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <button className="h-9 px-3 rounded-lg text-xs font-medium bg-muted/40 border border-border hover:bg-muted/60 transition">
              Export
            </button>
            <button className="h-9 px-3.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Generate AI brief
            </button>
          </div>
        </div>

        {/* Market Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {indices.map((idx) => {
            const live = idxMap.get(INDEX_SYMBOL_MAP[idx.symbol]);
            const price = live?.price ?? idx.price;
            const changePct = live?.changePct ?? idx.changePct;
            return (
              <div key={idx.symbol} className="glass rounded-2xl p-4 transition-all hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {idx.symbol}
                  </span>
                  <Delta value={changePct} className="text-[11px]" />
                </div>
                <div className="mt-2 text-lg font-semibold num tracking-tight">
                  {price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-muted-foreground">{idx.name}</div>
                <div className="mt-2">
                  <Sparkline data={idx.spark} positive={changePct >= 0} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left column */}
          <div className="col-span-12 xl:col-span-8 space-y-6">
            {/* Heatmap */}
            <div className="glass rounded-2xl p-5">
              <SectionHeader
                title="Market Heatmap"
                subtitle="Nifty 50 constituents by market cap · today's change"
                action={
                  <div className="flex gap-1 text-[10px]">
                    {["1D", "1W", "1M", "3M", "1Y"].map((t) => (
                      <button
                        key={t}
                        className={cn(
                          "px-2 py-1 rounded-md font-medium transition",
                          t === "1D"
                            ? "bg-primary/15 text-primary border border-primary/20"
                            : "text-muted-foreground hover:bg-muted/40",
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                }
              />
              <div className="grid grid-cols-6 md:grid-cols-8 gap-1.5">
                {stocks.slice(0, 20).map((s) => {
                  const intensity = Math.min(Math.abs(s.changePct) / 3, 1);
                  const positive = s.changePct >= 0;
                  const bg = positive
                    ? `oklch(0.4 ${0.06 + intensity * 0.12} 155 / ${0.4 + intensity * 0.5})`
                    : `oklch(0.4 ${0.08 + intensity * 0.15} 22 / ${0.4 + intensity * 0.5})`;
                  return (
                    <Link
                      key={s.symbol}
                      to="/stock/$symbol"
                      params={{ symbol: s.symbol }}
                      className="aspect-square rounded-lg p-2 flex flex-col justify-between text-white hover:ring-2 hover:ring-primary/40 transition"
                      style={{ background: bg }}
                    >
                      <div className="text-[10px] font-semibold truncate">{s.symbol}</div>
                      <div className="text-[10px] num font-medium">{formatPct(s.changePct, 1)}</div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Gainers / Losers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MoversCard title="Top Gainers" icon={<TrendingUp className="h-4 w-4 text-success" />} items={gainers} />
              <MoversCard title="Top Losers" icon={<TrendingDown className="h-4 w-4 text-destructive" />} items={losers} />
            </div>

            {/* Watchlist */}
            <div className="glass rounded-2xl p-5">
              <SectionHeader
                title="Watchlist"
                subtitle="6 stocks · Core India"
                action={<button className="text-xs text-primary font-medium hover:underline">Manage</button>}
              />
              <div className="overflow-hidden rounded-xl border border-border/60">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] text-muted-foreground uppercase tracking-wider bg-muted/20">
                      <th className="text-left font-medium px-4 py-2.5">Symbol</th>
                      <th className="text-right font-medium px-4 py-2.5">Price</th>
                      <th className="text-right font-medium px-4 py-2.5">Change</th>
                      <th className="text-right font-medium px-4 py-2.5 hidden sm:table-cell">Volume</th>
                      <th className="text-right font-medium px-4 py-2.5 hidden md:table-cell">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {watchlist.map((s) => (
                      <tr key={s.symbol} className="border-t border-border/40 hover:bg-muted/20 transition">
                        <td className="px-4 py-3">
                          <Link to="/stock/$symbol" params={{ symbol: s.symbol }} className="block">
                            <div className="font-medium text-sm">{s.symbol}</div>
                            <div className="text-[11px] text-muted-foreground">{s.name}</div>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right num font-medium">{formatINR(s.price)}</td>
                        <td className="px-4 py-3 text-right"><Delta value={s.changePct} /></td>
                        <td className="px-4 py-3 text-right num text-muted-foreground hidden sm:table-cell">
                          {s.volume.toFixed(1)}L
                        </td>
                        <td className="px-4 py-3 text-right hidden md:table-cell w-24">
                          <Sparkline data={indices[0].spark.map((v) => v * (0.8 + Math.random() * 0.4))} positive={s.changePct >= 0} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="col-span-12 xl:col-span-4 space-y-6">
            {/* Portfolio Summary */}
            <div className="glass rounded-2xl p-5 relative overflow-hidden surface-glow">
              <SectionHeader
                title="Portfolio"
                subtitle="Live · updated seconds ago"
                action={
                  <Link to="/portfolio" className="text-xs text-primary font-medium hover:underline flex items-center gap-0.5">
                    Open <ChevronRight className="h-3 w-3" />
                  </Link>
                }
              />
              <div className="text-3xl font-semibold num tracking-tight">{formatINR(portfolioValue)}</div>
              <div className="mt-1 flex items-center gap-2 text-sm">
                <Delta value={pnlPct} />
                <span className="text-muted-foreground">
                  {pnl >= 0 ? "+" : ""}
                  {formatINR(pnl)}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <MiniStat label="Day" value="+₹8.2K" positive />
                <MiniStat label="Week" value="+2.4%" positive />
                <MiniStat label="XIRR" value="21.8%" positive />
              </div>
              <div className="mt-4 pt-4 border-t border-border/40">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-muted-foreground">Health score</span>
                  <span className="font-semibold text-success">82 / 100</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                  <div className="h-full bg-[var(--gradient-emerald)]" style={{ width: "82%" }} />
                </div>
              </div>
            </div>

            {/* AI Insights */}
            <div className="glass rounded-2xl p-5">
              <SectionHeader
                title="AI Insights"
                subtitle="Personalized · updated 4 min ago"
                action={<Sparkles className="h-4 w-4 text-primary" />}
              />
              <div className="space-y-3">
                {aiInsights.map((ins, i) => (
                  <div key={i} className="rounded-xl p-3.5 bg-muted/20 border border-border/60 hover:border-primary/30 transition">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider",
                          ins.tone === "bull" && "bg-success/15 text-success",
                          ins.tone === "warn" && "bg-warning/15 text-warning",
                        )}
                      >
                        {ins.tag}
                      </span>
                    </div>
                    <div className="text-sm font-medium leading-snug">{ins.title}</div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ins.body}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Earnings */}
            <div className="glass rounded-2xl p-5">
              <SectionHeader
                title="Upcoming Earnings"
                subtitle="Next 10 days"
                action={<Calendar className="h-4 w-4 text-muted-foreground" />}
              />
              <div className="space-y-2">
                {earnings.map((e) => (
                  <div key={e.symbol} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition">
                    <div className="w-12 h-12 rounded-lg bg-muted/40 grid place-items-center border border-border/60">
                      <div className="text-[10px] font-medium text-muted-foreground">{e.date.split(" ")[0]}</div>
                      <div className="text-sm font-semibold num -mt-0.5">{e.date.split(" ")[1]}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{e.name}</div>
                      <div className="text-[11px] text-muted-foreground">{e.time} · Est. {e.est}</div>
                    </div>
                    <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                      {e.symbol}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sector Performance */}
        <div className="glass rounded-2xl p-5">
          <SectionHeader
            title="Sector Performance"
            subtitle="Today · relative to Nifty"
            action={<Activity className="h-4 w-4 text-muted-foreground" />}
          />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {sectors.map((s) => (
              <div key={s.name} className="rounded-xl p-3.5 bg-muted/20 border border-border/60 hover:border-primary/30 transition">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{s.name}</span>
                  <Delta value={s.perf} className="text-xs" />
                </div>
                <div className="text-[10px] text-muted-foreground">Weight {s.weight}%</div>
                <div className="mt-2 h-1 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className={cn("h-full", s.perf >= 0 ? "bg-success" : "bg-destructive")}
                    style={{ width: `${Math.min(Math.abs(s.perf) * 25 + 20, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function MiniStat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-lg bg-muted/20 border border-border/60 p-2.5">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={cn("text-sm font-semibold num mt-0.5", positive ? "text-success" : "text-destructive")}>{value}</div>
    </div>
  );
}

function MoversCard({ title, icon, items }: { title: string; icon: React.ReactNode; items: typeof stocks }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="space-y-1">
        {items.map((s) => (
          <Link
            key={s.symbol}
            to="/stock/$symbol"
            params={{ symbol: s.symbol }}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium">{s.symbol}</div>
              <div className="text-[11px] text-muted-foreground truncate">{s.name}</div>
            </div>
            <div className="text-right">
              <div className="text-sm num font-medium">{formatINR(s.price)}</div>
              <Delta value={s.changePct} className="text-[11px]" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
