import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { stocks } from "@/lib/mock-data";
import { Delta, KpiCard, SectionHeader, formatINR, formatPct } from "@/lib/ui-helpers";
import { quotesQuery, timeSeriesQuery, toTdStock } from "@/lib/market-queries";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, RadialBarChart, RadialBar, PolarAngleAxis,
  ComposedChart, Line, ReferenceLine,
} from "recharts";
import { Bookmark, Bell, Share2, TrendingUp, TrendingDown, Zap, Shield, Brain, Activity, Wifi, WifiOff, LineChart as LineIcon } from "lucide-react";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/stock/$symbol")({
  loader: ({ params }) => {
    const stock = stocks.find((s) => s.symbol === params.symbol.toUpperCase());
    if (!stock) throw notFound();
    return { stock };
  },
  component: StockDetail,
  notFoundComponent: () => (
    <AppShell>
      <div className="p-8 text-center text-muted-foreground">Stock not found.</div>
    </AppShell>
  ),
  head: ({ params }) => ({
    meta: [{ title: `${params.symbol} — StockSense AI` }],
  }),
});

const TABS = [
  "Overview", "Financials", "Ratios", "Technicals", "AI Analysis",
  "News", "Peers", "Shareholding", "Quarterly", "Annual Reports",
] as const;
type Tab = typeof TABS[number];

const RANGE_TO_QUERY: Record<string, { interval: string; outputsize: number }> = {
  "1D": { interval: "5min", outputsize: 78 },
  "1W": { interval: "30min", outputsize: 60 },
  "1M": { interval: "1day", outputsize: 22 },
  "3M": { interval: "1day", outputsize: 66 },
  "1Y": { interval: "1day", outputsize: 252 },
  "5Y": { interval: "1week", outputsize: 260 },
  MAX: { interval: "1month", outputsize: 240 },
};

function sma(data: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { out.push(null); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j];
    out.push(sum / period);
  }
  return out;
}
function ema(data: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { out.push(null); continue; }
    if (prev === null) {
      let sum = 0; for (let j = 0; j < period; j++) sum += data[j];
      prev = sum / period;
    } else prev = data[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}
function bollinger(data: number[], period = 20, mult = 2) {
  const mid = sma(data, period);
  const up: (number | null)[] = []; const lo: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1 || mid[i] === null) { up.push(null); lo.push(null); continue; }
    let s = 0;
    for (let j = i - period + 1; j <= i; j++) s += (data[j] - (mid[i] as number)) ** 2;
    const sd = Math.sqrt(s / period);
    up.push((mid[i] as number) + mult * sd);
    lo.push((mid[i] as number) - mult * sd);
  }
  return { mid, up, lo };
}
function rsi(data: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = [null];
  let gains = 0, losses = 0;
  for (let i = 1; i < data.length; i++) {
    const d = data[i] - data[i - 1];
    if (i <= period) {
      if (d > 0) gains += d; else losses -= d;
      if (i === period) { const rs = gains / (losses || 1); out.push(100 - 100 / (1 + rs)); }
      else out.push(null);
    } else {
      gains = (gains * (period - 1) + Math.max(d, 0)) / period;
      losses = (losses * (period - 1) + Math.max(-d, 0)) / period;
      const rs = gains / (losses || 1);
      out.push(100 - 100 / (1 + rs));
    }
  }
  return out;
}
function macd(data: number[], fast = 12, slow = 26, signal = 9) {
  const e1 = ema(data, fast); const e2 = ema(data, slow);
  const line = data.map((_, i) => (e1[i] !== null && e2[i] !== null) ? (e1[i] as number) - (e2[i] as number) : null);
  const validVals = line.map((v) => v ?? 0);
  const sig = ema(validVals, signal);
  const hist = line.map((v, i) => (v !== null && sig[i] !== null) ? v - (sig[i] as number) : null);
  return { line, sig, hist };
}

type IndicatorKey = "sma20" | "sma50" | "ema20" | "bb" | "rsi" | "macd";

function StockDetail() {
  const { stock: base } = Route.useLoaderData();
  const [tab, setTab] = useState<Tab>("Overview");
  const [range, setRange] = useState("1Y");
  const [inds, setInds] = useState<Set<IndicatorKey>>(new Set(["sma50", "bb"]));
  const tdSymbol = toTdStock(base.symbol);

  const toggleInd = (k: IndicatorKey) => {
    const n = new Set(inds); n.has(k) ? n.delete(k) : n.add(k); setInds(n);
  };

  // Live quote
  const quoteQ = useQuery(quotesQuery([tdSymbol]));
  const live = quoteQ.data?.quotes?.[0];
  const stock = live
    ? { ...base, price: live.price, change: live.change, changePct: live.changePct }
    : base;
  const isLive = Boolean(live);

  // Live time series
  const { interval, outputsize } = RANGE_TO_QUERY[range] ?? RANGE_TO_QUERY["1Y"];
  const seriesQ = useQuery(timeSeriesQuery(tdSymbol, interval, outputsize));

  const chartData = useMemo(() => {
    const bars = seriesQ.data?.bars ?? [];
    let base: Array<{ i: number; price: number; volume: number; t?: string }> = [];
    if (bars.length > 0) {
      base = bars.map((b, i) => ({ i, price: b.close, volume: b.volume, t: b.t }));
    } else {
      const n = outputsize;
      let v = stock.price * 0.75;
      let seed = Math.abs(Math.floor(stock.price * 1000)) + n;
      const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
      for (let i = 0; i < n; i++) {
        v = v * (1 + (Math.sin(i * 0.15) * 0.02 + (rand() - 0.48) * 0.02));
        base.push({ i, price: +v.toFixed(2), volume: Math.round(50 + rand() * 250) });
      }
      base[n - 1].price = stock.price;
    }
    const closes = base.map((r) => r.price);
    const s20 = sma(closes, 20); const s50 = sma(closes, 50);
    const e20 = ema(closes, 20);
    const bb = bollinger(closes, 20, 2);
    const rs = rsi(closes, 14);
    const mc = macd(closes);
    return base.map((r, i) => ({
      ...r,
      sma20: s20[i], sma50: s50[i], ema20: e20[i],
      bbUp: bb.up[i], bbLo: bb.lo[i], bbMid: bb.mid[i],
      rsi: rs[i], macd: mc.line[i], macdSig: mc.sig[i], macdHist: mc.hist[i],
    }));
  }, [seriesQ.data, stock.price, outputsize]);


  return (
    <AppShell>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        {/* Hero */}
        <div className="glass rounded-2xl p-6 surface-glow relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center gap-5 justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-[var(--gradient-emerald)] grid place-items-center text-2xl font-bold text-primary-foreground shadow-[var(--shadow-glow)]">
                {stock.symbol[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight">{stock.name}</h1>
                  <span className="text-xs font-medium text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
                    NSE : {stock.symbol}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{stock.sector}</span>
                  <span>·</span>
                  <span>Large cap</span>
                  <span>·</span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider border text-[10px]",
                      isLive
                        ? "bg-success/10 text-success border-success/30"
                        : "bg-muted/40 text-muted-foreground border-border",
                    )}
                    title={isLive ? "Twelve Data · live" : "Live data unavailable"}
                  >
                    {isLive ? <Wifi className="h-2.5 w-2.5" /> : <WifiOff className="h-2.5 w-2.5" />}
                    {isLive ? "Live" : "Sample"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-3xl font-semibold num tracking-tight">{formatINR(stock.price)}</div>
                <div className="flex items-center gap-2 justify-end text-sm">
                  <Delta value={stock.changePct} />
                  <span className="text-muted-foreground">
                    {stock.change > 0 ? "+" : ""}₹{stock.change}
                  </span>
                </div>
              </div>
              <div className="flex gap-1.5">
                <IconBtn icon={<Bell className="h-4 w-4" />} />
                <IconBtn icon={<Bookmark className="h-4 w-4" />} />
                <IconBtn icon={<Share2 className="h-4 w-4" />} />
              </div>
            </div>
          </div>

          {/* Scores */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <ScoreCard label="Fundamental" value={78} icon={<Shield className="h-3.5 w-3.5" />} />
            <ScoreCard label="Technical" value={64} icon={<Activity className="h-3.5 w-3.5" />} />
            <ScoreCard label="Momentum" value={82} icon={<Zap className="h-3.5 w-3.5" />} />
            <ScoreCard label="Risk" value={42} icon={<Brain className="h-3.5 w-3.5" />} inverse />
          </div>
        </div>

        {/* Chart */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold">Price Chart</h3>
              <p className="text-[11px] text-muted-foreground">TradingView-style · daily close</p>
            </div>
            <div className="flex gap-1 text-[11px]">
              {["1D", "1W", "1M", "3M", "1Y", "5Y", "MAX"].map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn(
                    "px-2.5 py-1 rounded-md font-medium transition",
                    r === range ? "bg-primary/15 text-primary border border-primary/20" : "text-muted-foreground hover:bg-muted/40",
                  )}
                >{r}</button>
              ))}
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="pxg" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.74 0.17 155)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.74 0.17 155)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="i" hide />
                <YAxis domain={["dataMin - 50", "dataMax + 50"]} tick={{ fill: "oklch(0.68 0.02 240)", fontSize: 11 }} width={55} tickFormatter={(v) => v.toLocaleString("en-IN")} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.2 0.014 240)",
                    border: "1px solid oklch(0.3 0.015 240 / 0.6)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="price" stroke="oklch(0.74 0.17 155)" strokeWidth={2} fill="url(#pxg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="h-24 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="i" hide />
                <YAxis hide />
                <Bar dataKey="volume" fill="oklch(0.3 0.02 240)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <KpiCard label="Market Cap" value={formatINR(stock.marketCap * 1e7, true)} />
          <KpiCard label="PE Ratio" value={stock.pe.toString()} hint="Sector avg 24" />
          <KpiCard label="ROE" value={`${stock.roe}%`} />
          <KpiCard label="ROCE" value={`${stock.roce}%`} />
          <KpiCard label="Rev Growth" value={`${stock.revGrowth > 0 ? "+" : ""}${stock.revGrowth}%`} />
          <KpiCard label="Div Yield" value={`${stock.divYield}%`} />
        </div>

        {/* Tabs */}
        <div>
          <div className="glass rounded-xl p-1 flex gap-0.5 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition",
                  tab === t ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/30",
                )}
              >{t}</button>
            ))}
          </div>

          <div className="mt-5">
            {tab === "AI Analysis" ? (
              <AIAnalysis symbol={stock.symbol} />
            ) : tab === "Overview" ? (
              <Overview />
            ) : (
              <div className="glass rounded-2xl p-10 text-center text-muted-foreground text-sm">
                <div className="text-lg font-semibold mb-1">{tab}</div>
                <div>Detailed {tab.toLowerCase()} data would render here.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function IconBtn({ icon }: { icon: React.ReactNode }) {
  return (
    <button className="h-9 w-9 grid place-items-center rounded-lg bg-muted/40 border border-border/60 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition">
      {icon}
    </button>
  );
}

function ScoreCard({ label, value, icon, inverse }: { label: string; value: number; icon: React.ReactNode; inverse?: boolean }) {
  const good = inverse ? value < 50 : value > 60;
  const color = good ? "oklch(0.74 0.17 155)" : value > 40 ? "oklch(0.82 0.16 82)" : "oklch(0.65 0.22 22)";
  return (
    <div className="rounded-xl p-3.5 bg-muted/20 border border-border/60 flex items-center gap-3">
      <div className="w-14 h-14 shrink-0">
        <ResponsiveContainer>
          <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ v: value, fill: color }]} startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="v" cornerRadius={10} background={{ fill: "oklch(0.28 0.015 240 / 0.4)" }} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <div>
        <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {icon} {label}
        </div>
        <div className="text-xl font-semibold num" style={{ color }}>
          {value}<span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>
    </div>
  );
}

function AIAnalysis({ symbol }: { symbol: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="glass rounded-2xl p-5 border-l-2 border-l-success">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-success" />
          <h3 className="text-sm font-semibold text-success">Bull Thesis</h3>
        </div>
        <ul className="space-y-2.5 text-sm">
          {[
            "Consistent 18%+ ROCE over 5 years signals durable competitive advantage",
            "Order book at all-time high, providing revenue visibility for 24+ months",
            "Margin expansion trajectory as raw material costs normalize",
            "Institutional buying: FII stake up 3.2% in last quarter",
          ].map((p, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-success mt-1">▸</span>
              <span className="text-muted-foreground leading-relaxed">{p}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="glass rounded-2xl p-5 border-l-2 border-l-destructive">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown className="h-4 w-4 text-destructive" />
          <h3 className="text-sm font-semibold text-destructive">Bear Thesis</h3>
        </div>
        <ul className="space-y-2.5 text-sm">
          {[
            "Trading at 32% premium to 5-year median PE — limited multiple expansion room",
            "Rising interest rates could compress margins for capital-intensive segments",
            "Regulatory overhang in key markets remains unresolved",
            "Insider selling: promoter pledge increased by 4% this quarter",
          ].map((p, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-destructive mt-1">▸</span>
              <span className="text-muted-foreground leading-relaxed">{p}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="md:col-span-2 glass rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">AI Verdict</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="text-foreground font-medium">Moderately Bullish.</span> {symbol} shows strong
          fundamental momentum with expanding operating leverage. Entry preferred on 5-8% pullback to
          ₹{Math.round(2650).toLocaleString("en-IN")} zone. Position sizing: 3-5% of portfolio. Stop below
          ₹{Math.round(2480).toLocaleString("en-IN")}. 12-month target range ₹3,200–3,450.
        </p>
      </div>
    </div>
  );
}

function Overview() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="glass rounded-2xl p-5 md:col-span-2">
        <SectionHeader title="Business Overview" />
        <p className="text-sm text-muted-foreground leading-relaxed">
          Diversified conglomerate operating across energy, materials, retail, and digital services.
          One of India's largest private-sector enterprises with a market-leading position in refining and
          petrochemicals, expanding rapidly into consumer-facing digital and retail businesses through
          its subsidiaries.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <InfoRow label="Founded" value="1966" />
          <InfoRow label="Headquarters" value="Mumbai, India" />
          <InfoRow label="Employees" value="245,000+" />
          <InfoRow label="Website" value="reliance.com" />
        </div>
      </div>
      <div className="glass rounded-2xl p-5">
        <SectionHeader title="Key Ratios" />
        <div className="space-y-3 text-sm">
          <InfoRow label="P/B Ratio" value="2.4" />
          <InfoRow label="Debt / Equity" value="0.42" />
          <InfoRow label="Current Ratio" value="1.28" />
          <InfoRow label="EPS (TTM)" value="₹98.24" />
          <InfoRow label="Book Value" value="₹1,215" />
          <InfoRow label="Beta" value="0.94" />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border/40 pb-1.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-medium num">{value}</span>
    </div>
  );
}
