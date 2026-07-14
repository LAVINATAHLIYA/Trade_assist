import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import {
  extStocks,
  PRESETS,
  SECTORS_LIST,
  INDUSTRY_LIST,
  SIGNAL_TABS,
  parseNaturalLanguage,
  type ExtStock,
  type SignalKind,
  type MarketCapCategory,
} from "@/lib/screener-data";
import { Delta, Sparkline, formatINR } from "@/lib/ui-helpers";
import { quotesQuery, toTdStock } from "@/lib/market-queries";
import {
  Search, Bookmark, SlidersHorizontal, Download, Sparkles, RotateCcw,
  Wifi, WifiOff, ChevronDown, ChevronRight, X, Plus, Star, Zap,
  TrendingUp, TrendingDown, Activity, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/explorer")({
  component: Explorer,
  head: () => ({
    meta: [
      { title: "Stock Screener — StockSense AI" },
      { name: "description", content: "Professional multi-factor screener: fundamentals, technicals, momentum, volume anomaly, F&O, events and AI-powered signals for NSE/BSE." },
    ],
  }),
});

type NumRange = { min: number; max: number };
type BoolFlag = boolean;

type Filters = {
  q: string;
  sectors: Set<string>;
  industries: Set<string>;
  mcapCats: Set<MarketCapCategory>;
  indexMembership: Set<string>;
  exchange: Set<"NSE" | "BSE">;
  fnoOnly: BoolFlag;
  risk: Set<"low" | "medium" | "high">;
  signalStrength: NumRange;

  // Price / returns
  price: NumRange;
  mcap: NumRange;
  from52High: NumRange;
  from52Low: NumRange;
  ret1w: NumRange;
  ret1m: NumRange;
  ret3m: NumRange;
  ret1y: NumRange;
  cagr3y: NumRange;

  // Valuation
  pe: NumRange;
  forwardPe: NumRange;
  pb: NumRange;
  ps: NumRange;
  peg: NumRange;
  evEbitda: NumRange;
  earningsYield: NumRange;
  fcfYield: NumRange;

  // Growth
  revGrowth: NumRange;
  revGrowth3y: NumRange;
  epsGrowth: NumRange;
  profitGrowth: NumRange;

  // Profitability
  roe: NumRange;
  roce: NumRange;
  roa: NumRange;
  grossMargin: NumRange;
  opMargin: NumRange;
  netMargin: NumRange;
  piotroski: NumRange;
  altmanZ: NumRange;

  // Balance sheet
  debtEquity: NumRange;
  currentRatio: NumRange;
  interestCover: NumRange;
  debtEbitda: NumRange;

  // Ownership
  promoterHold: NumRange;
  promoterPledge: NumRange;
  fiiHold: NumRange;
  diiHold: NumRange;
  divYield: NumRange;

  // Volume / liquidity
  volRatio: NumRange;
  relVolume: NumRange;
  deliveryPct: NumRange;
  turnover: NumRange;

  // Trend / MAs
  aboveSMA50: BoolFlag;
  aboveSMA200: BoolFlag;
  goldenCross: BoolFlag;

  // Technicals
  rsi: NumRange;
  adx: NumRange;
  mfi: NumRange;
  bbPosition: NumRange;
  macdBull: BoolFlag;

  // Patterns
  patterns: Set<string>;

  // RS / scores
  rsVsNifty: NumRange;
  qualityScore: NumRange;
  valueScore: NumRange;
  momentumScore: NumRange;
  growthScore: NumRange;
  aiScore: NumRange;

  // Risk
  beta: NumRange;
  histVol: NumRange;
  maxDrawdown: NumRange;
  sharpe: NumRange;

  // F&O
  oiChange: NumRange;
  pcr: NumRange;
  iv: NumRange;

  // Events
  eventsOnly: BoolFlag;
};

const R = (min: number, max: number): NumRange => ({ min, max });
const DEFAULTS: Filters = {
  q: "",
  sectors: new Set(), industries: new Set(), mcapCats: new Set(),
  indexMembership: new Set(), exchange: new Set(), fnoOnly: false,
  risk: new Set(), signalStrength: R(0, 100),

  price: R(0, 100000), mcap: R(0, 5_000_000),
  from52High: R(-100, 0), from52Low: R(0, 500),
  ret1w: R(-100, 200), ret1m: R(-100, 300), ret3m: R(-100, 500), ret1y: R(-100, 500),
  cagr3y: R(-50, 100),

  pe: R(0, 200), forwardPe: R(0, 200), pb: R(0, 20), ps: R(0, 20),
  peg: R(0, 5), evEbitda: R(0, 60), earningsYield: R(0, 30), fcfYield: R(0, 20),

  revGrowth: R(-100, 200), revGrowth3y: R(-50, 100),
  epsGrowth: R(-100, 200), profitGrowth: R(-100, 200),

  roe: R(0, 100), roce: R(0, 100), roa: R(0, 60),
  grossMargin: R(0, 100), opMargin: R(0, 100), netMargin: R(0, 100),
  piotroski: R(0, 9), altmanZ: R(0, 10),

  debtEquity: R(0, 5), currentRatio: R(0, 10), interestCover: R(0, 100), debtEbitda: R(0, 10),

  promoterHold: R(0, 100), promoterPledge: R(0, 100),
  fiiHold: R(0, 100), diiHold: R(0, 100), divYield: R(0, 15),

  volRatio: R(0, 20), relVolume: R(0, 20), deliveryPct: R(0, 100), turnover: R(0, 100000),

  aboveSMA50: false, aboveSMA200: false, goldenCross: false,

  rsi: R(0, 100), adx: R(0, 100), mfi: R(0, 100), bbPosition: R(0, 100), macdBull: false,

  patterns: new Set(),

  rsVsNifty: R(-100, 100),
  qualityScore: R(0, 100), valueScore: R(0, 100), momentumScore: R(0, 100),
  growthScore: R(0, 100), aiScore: R(0, 100),

  beta: R(0, 3), histVol: R(0, 100), maxDrawdown: R(-100, 0), sharpe: R(-5, 10),

  oiChange: R(-100, 100), pcr: R(0, 5), iv: R(0, 200),

  eventsOnly: false,
};

const MCAP_CATS: MarketCapCategory[] = ["Mega", "Large", "Mid", "Small", "Micro"];
const INDEX_LIST = ["NIFTY 50", "NIFTY 100", "NIFTY 500", "SENSEX"];
const PATTERN_LIST = ["Cup & Handle", "Double Bottom", "Bullish Engulfing", "Hammer", "Inside Bar", "Flag Breakout", "Triangle Breakout", "Head & Shoulders", "Double Top", "Gap Up"];

type SortKey = keyof ExtStock;
const PAGE_SIZES = [25, 50, 100];

const SIGNAL_COLOR: Record<SignalKind, string> = {
  momentum: "bg-primary/15 text-primary border-primary/30",
  "volume-anomaly": "bg-warning/15 text-warning border-warning/30",
  "relative-strength": "bg-primary/15 text-primary border-primary/30",
  breakout: "bg-success/15 text-success border-success/30",
  breakdown: "bg-destructive/15 text-destructive border-destructive/30",
  quality: "bg-success/15 text-success border-success/30",
  growth: "bg-primary/15 text-primary border-primary/30",
  value: "bg-success/15 text-success border-success/30",
  dividend: "bg-muted/40 text-foreground border-border",
  fno: "bg-warning/15 text-warning border-warning/30",
  event: "bg-warning/15 text-warning border-warning/30",
  "ai-pick": "bg-primary/15 text-primary border-primary/30",
};

function Explorer() {
  const [filters, setFilters] = useState<Filters>(DEFAULTS);
  const [preset, setPreset] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | SignalKind>("all");
  const [sortKey, setSortKey] = useState<SortKey>("aiScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<ExtStock | null>(null);
  const [nlOpen, setNlOpen] = useState(false);
  const [nlText, setNlText] = useState("");
  const [nlConds, setNlConds] = useState<ReturnType<typeof parseNaturalLanguage>>([]);
  const [nlActive, setNlActive] = useState(false);
  const [saved, setSaved] = useState<{ id: string; name: string }[]>([]);
  const [now, setNow] = useState<string>("");

  // Live update time (client only to avoid hydration mismatch)
  useEffect(() => {
    const upd = () => setNow(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    upd();
    const t = setInterval(upd, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("stocksense-screens");
      if (raw) setSaved(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const upd = <K extends keyof Filters>(k: K, v: Filters[K]) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };
  const updRange = (k: keyof Filters, side: "min" | "max", v: number) =>
    setFilters((f) => ({ ...f, [k]: { ...(f[k] as NumRange), [side]: v } }));
  const toggleSet = <T,>(k: keyof Filters, v: T) => {
    setFilters((f) => {
      const cur = new Set(f[k] as Set<T>);
      cur.has(v) ? cur.delete(v) : cur.add(v);
      return { ...f, [k]: cur };
    });
    setPage(1);
  };

  const stkQ = useQuery(quotesQuery(extStocks.map((s) => toTdStock(s.symbol))));
  const liveMap = useMemo(() => new Map((stkQ.data?.quotes ?? []).map((q) => [q.symbol, q])), [stkQ.data]);
  const isLive = (stkQ.data?.quotes?.length ?? 0) > 0;

  const rows = useMemo(() => {
    let list: ExtStock[] = extStocks.map((s) => {
      const q = liveMap.get(toTdStock(s.symbol));
      return q ? { ...s, price: q.price, change: q.change, changePct: q.changePct } : s;
    });

    // Signal tab
    if (tab !== "all") list = list.filter((s) => s.signals.some((sig) => sig.kind === tab));

    // Preset
    const p = PRESETS.find((x) => x.id === preset);
    if (p) list = list.filter(p.filter);

    // NL
    if (nlActive && nlConds.length) list = list.filter((s) => nlConds.every((c) => c.test(s)));

    const f = filters;
    const chk = (k: keyof Filters, v: number) => {
      const r = f[k] as NumRange;
      return v >= r.min && v <= r.max;
    };
    list = list.filter((s) => {
      if (f.q && !`${s.symbol} ${s.name} ${s.industry}`.toLowerCase().includes(f.q.toLowerCase())) return false;
      if (f.sectors.size && !f.sectors.has(s.sector)) return false;
      if (f.industries.size && !f.industries.has(s.industry)) return false;
      if (f.mcapCats.size && !f.mcapCats.has(s.mcapCategory)) return false;
      if (f.indexMembership.size && !s.indexMembership.some((i) => f.indexMembership.has(i))) return false;
      if (f.exchange.size && !f.exchange.has(s.exchange)) return false;
      if (f.fnoOnly && !s.fnoEligible) return false;
      if (f.risk.size && !f.risk.has(s.risk)) return false;
      if (!chk("signalStrength", s.signalStrength)) return false;
      if (!chk("price", s.price)) return false;
      if (!chk("mcap", s.marketCap)) return false;
      if (!chk("from52High", s.from52High)) return false;
      if (!chk("from52Low", s.from52Low)) return false;
      if (!chk("ret1w", s.ret1w)) return false;
      if (!chk("ret1m", s.ret1m)) return false;
      if (!chk("ret3m", s.ret3m)) return false;
      if (!chk("ret1y", s.ret1y)) return false;
      if (!chk("cagr3y", s.cagr3y)) return false;
      if (!chk("pe", s.pe)) return false;
      if (!chk("forwardPe", s.forwardPe)) return false;
      if (!chk("pb", s.pb)) return false;
      if (!chk("ps", s.ps)) return false;
      if (!chk("peg", s.peg)) return false;
      if (!chk("evEbitda", s.evEbitda)) return false;
      if (!chk("earningsYield", s.earningsYield)) return false;
      if (!chk("fcfYield", s.fcfYield)) return false;
      if (!chk("revGrowth", s.revGrowth)) return false;
      if (!chk("revGrowth3y", s.revGrowth3y)) return false;
      if (!chk("epsGrowth", s.epsGrowth)) return false;
      if (!chk("profitGrowth", s.profitGrowth)) return false;
      if (!chk("roe", s.roe)) return false;
      if (!chk("roce", s.roce)) return false;
      if (!chk("roa", s.roa)) return false;
      if (!chk("grossMargin", s.grossMargin)) return false;
      if (!chk("opMargin", s.opMargin)) return false;
      if (!chk("netMargin", s.netMargin)) return false;
      if (!chk("piotroski", s.piotroski)) return false;
      if (!chk("altmanZ", s.altmanZ)) return false;
      if (!chk("debtEquity", s.debtEquity)) return false;
      if (!chk("currentRatio", s.currentRatio)) return false;
      if (!chk("interestCover", s.interestCover)) return false;
      if (!chk("debtEbitda", s.debtEbitda)) return false;
      if (!chk("promoterHold", s.promoterHold)) return false;
      if (!chk("promoterPledge", s.promoterPledge)) return false;
      if (!chk("fiiHold", s.fiiHold)) return false;
      if (!chk("diiHold", s.diiHold)) return false;
      if (!chk("divYield", s.divYield)) return false;
      if (!chk("volRatio", s.volRatio)) return false;
      if (!chk("relVolume", s.relVolume)) return false;
      if (!chk("deliveryPct", s.deliveryPct)) return false;
      if (!chk("turnover", s.turnover)) return false;
      if (f.aboveSMA50 && s.price <= s.sma50) return false;
      if (f.aboveSMA200 && s.price <= s.sma200) return false;
      if (f.goldenCross && !s.goldenCross) return false;
      if (!chk("rsi", s.rsi)) return false;
      if (!chk("adx", s.adx)) return false;
      if (!chk("mfi", s.mfi)) return false;
      if (!chk("bbPosition", s.bbPosition)) return false;
      if (f.macdBull && s.macdCross !== "bull") return false;
      if (f.patterns.size && !s.patterns.some((p2) => f.patterns.has(p2))) return false;
      if (!chk("rsVsNifty", s.rsVsNifty)) return false;
      if (!chk("qualityScore", s.qualityScore)) return false;
      if (!chk("valueScore", s.valueScore)) return false;
      if (!chk("momentumScore", s.momentumScore)) return false;
      if (!chk("growthScore", s.growthScore)) return false;
      if (!chk("aiScore", s.aiScore)) return false;
      if (!chk("beta", s.beta)) return false;
      if (!chk("histVol", s.histVol)) return false;
      if (!chk("maxDrawdown", s.maxDrawdown)) return false;
      if (!chk("sharpe", s.sharpe)) return false;
      if (!chk("oiChange", s.oiChange)) return false;
      if (!chk("pcr", s.pcr)) return false;
      if (!chk("iv", s.iv)) return false;
      if (f.eventsOnly && s.eventFlags.length === 0) return false;
      return true;
    });

    list.sort((a, b) => {
      const av = a[sortKey] as unknown as number;
      const bv = b[sortKey] as unknown as number;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return list;
  }, [filters, preset, tab, sortKey, sortDir, liveMap, nlActive, nlConds]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  const sortBy = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  };

  const exportCSV = () => {
    const cols: SortKey[] = ["symbol", "name", "sector", "industry", "mcapCategory", "price", "changePct", "marketCap", "pe", "pb", "roe", "roce", "revGrowth", "epsGrowth", "debtEquity", "divYield", "rsi", "from52High", "volRatio", "rsVsNifty", "qualityScore", "valueScore", "momentumScore", "growthScore", "aiScore", "riskScore"];
    const header = cols.join(",");
    const body = rows.map((r) => cols.map((c) => String(r[c] ?? "")).join(",")).join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "stocksense-screener.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const saveScreen = () => {
    const name = prompt("Name this screen");
    if (!name) return;
    const next = [...saved, { id: crypto.randomUUID(), name }];
    setSaved(next);
    try { localStorage.setItem("stocksense-screens", JSON.stringify(next)); } catch { /* ignore */ }
  };

  const runNl = () => {
    const c = parseNaturalLanguage(nlText);
    setNlConds(c);
  };

  // Active filter chips (only non-default)
  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (filters.sectors.size) filters.sectors.forEach((s) => chips.push({ key: `sec-${s}`, label: s, onClear: () => toggleSet("sectors", s) }));
    if (filters.mcapCats.size) filters.mcapCats.forEach((s) => chips.push({ key: `mc-${s}`, label: `${s} cap`, onClear: () => toggleSet("mcapCats", s) }));
    if (filters.fnoOnly) chips.push({ key: "fno", label: "F&O only", onClear: () => upd("fnoOnly", false) });
    if (filters.aboveSMA50) chips.push({ key: "sma50", label: "Above SMA50", onClear: () => upd("aboveSMA50", false) });
    if (filters.aboveSMA200) chips.push({ key: "sma200", label: "Above SMA200", onClear: () => upd("aboveSMA200", false) });
    if (filters.macdBull) chips.push({ key: "macd", label: "MACD bullish", onClear: () => upd("macdBull", false) });
    if (filters.goldenCross) chips.push({ key: "gc", label: "Golden cross", onClear: () => upd("goldenCross", false) });
    if (filters.eventsOnly) chips.push({ key: "ev", label: "With events", onClear: () => upd("eventsOnly", false) });
    if (nlActive && nlConds.length) nlConds.forEach((c, i) => chips.push({ key: `nl-${i}`, label: `AI: ${c.label}`, onClear: () => { setNlConds((x) => x.filter((_, j) => j !== i)); } }));
    return chips;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, nlActive, nlConds]);

  return (
    <AppShell>
      <div className="p-6 max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">Stock Screener</h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-success/30 bg-success/10 text-success text-[10px] font-semibold uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> NSE Open
              </span>
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-semibold uppercase tracking-wider text-[10px]",
                isLive ? "bg-success/10 text-success border-success/30" : "bg-muted/40 text-muted-foreground border-border",
              )}>
                {isLive ? <Wifi className="h-2.5 w-2.5" /> : <WifiOff className="h-2.5 w-2.5" />}
                {isLive ? "Live · Twelve Data" : "Sample data"}
              </span>
              <span className="text-[11px] text-muted-foreground num" suppressHydrationWarning>Updated {now || "—"}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Multi-factor screening across fundamentals, technicals, momentum, volume, F&O and AI signals · {extStocks.length} names
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setNlOpen((v) => !v)} className="h-9 px-3 rounded-lg text-xs font-medium bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Ask AI
            </button>
            <div className="relative">
              <select className="h-9 pl-3 pr-8 rounded-lg text-xs font-medium bg-muted/40 border border-border/60 hover:bg-muted/60 appearance-none">
                <option>Saved Screens ({saved.length})</option>
                {saved.map((s) => <option key={s.id}>{s.name}</option>)}
              </select>
              <ChevronDown className="h-3.5 w-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            <button onClick={saveScreen} className="h-9 px-3 rounded-lg text-xs font-medium bg-muted/40 border border-border/60 hover:bg-muted/60 flex items-center gap-1.5">
              <Bookmark className="h-3.5 w-3.5" /> Save
            </button>
            <button onClick={exportCSV} className="h-9 px-3 rounded-lg text-xs font-medium bg-muted/40 border border-border/60 hover:bg-muted/60 flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
          </div>
        </div>

        {/* NL AI panel */}
        {nlOpen && (
          <div className="glass rounded-2xl p-4 mb-4 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">AI Natural-Language Screener</h3>
              <span className="text-[10px] text-muted-foreground">Describe the stocks you want to find</span>
            </div>
            <textarea
              value={nlText}
              onChange={(e) => setNlText(e.target.value)}
              placeholder="e.g. Find profitable Indian companies with ROCE above 20%, low debt and RSI below 40"
              rows={2}
              className="w-full rounded-lg bg-muted/30 border border-border/60 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[
                "Find profitable Indian companies with ROCE above 20%, low debt and RSI below 40",
                "Small-cap momentum stocks breaking resistance with volume above 2x average",
                "Fundamentally strong stocks within 10% of their 52-week low",
                "F&O stocks with short covering and rising relative strength",
              ].map((ex) => (
                <button key={ex} onClick={() => setNlText(ex)} className="text-[10px] px-2 py-1 rounded border border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground hover:border-primary/40">
                  {ex.slice(0, 48)}…
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button onClick={runNl} className="h-8 px-3 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" /> Parse
              </button>
              {nlConds.length > 0 && (
                <>
                  <button onClick={() => { setNlActive(true); setNlOpen(false); }} className="h-8 px-3 rounded-lg text-xs font-medium bg-success/15 text-success border border-success/30">Apply</button>
                  <button onClick={() => { setNlText(""); setNlConds([]); setNlActive(false); }} className="h-8 px-3 rounded-lg text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                </>
              )}
            </div>
            {nlConds.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/40">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Detected filters</div>
                <div className="flex flex-wrap gap-1.5">
                  {nlConds.map((c, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-primary/30 bg-primary/10 text-primary">
                      {c.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {nlText && nlConds.length === 0 && (
              <div className="mt-2 text-[11px] text-warning">No filters detected — try mentioning ROCE, ROE, RSI, PE, debt, revenue growth, volume, 52w high/low, F&O.</div>
            )}
          </div>
        )}

        {/* Signal tabs */}
        <div className="glass rounded-2xl p-1.5 mb-3 flex items-center gap-1 overflow-x-auto">
          {SIGNAL_TABS.map((t) => {
            const active = tab === t.id;
            const count = t.id === "all" ? extStocks.length : extStocks.filter((s) => s.signals.some((sig) => sig.kind === t.id)).length;
            return (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setPage(1); }}
                className={cn(
                  "shrink-0 h-8 px-3 rounded-lg text-xs font-medium transition whitespace-nowrap flex items-center gap-1.5",
                  active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
                )}
              >
                {t.label}
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded num", active ? "bg-primary/20" : "bg-muted/40")}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Quick filter bar */}
        <div className="glass rounded-2xl p-3 mb-3 flex items-center gap-2 overflow-x-auto flex-wrap">
          <QuickPill label="Sector" open>
            <div className="flex flex-wrap gap-1 max-w-md">
              {SECTORS_LIST.map((s) => (
                <MiniChip key={s} active={filters.sectors.has(s)} onClick={() => toggleSet("sectors", s)}>{s}</MiniChip>
              ))}
            </div>
          </QuickPill>
          <QuickPill label="Mkt Cap">
            <div className="flex flex-wrap gap-1">
              {MCAP_CATS.map((c) => (
                <MiniChip key={c} active={filters.mcapCats.has(c)} onClick={() => toggleSet("mcapCats", c)}>{c}</MiniChip>
              ))}
            </div>
          </QuickPill>
          <QuickPill label="Index">
            <div className="flex flex-wrap gap-1">
              {INDEX_LIST.map((c) => (
                <MiniChip key={c} active={filters.indexMembership.has(c)} onClick={() => toggleSet("indexMembership", c)}>{c}</MiniChip>
              ))}
            </div>
          </QuickPill>
          <button onClick={() => upd("fnoOnly", !filters.fnoOnly)} className={cn("h-7 px-2.5 rounded-md text-[11px] border", filters.fnoOnly ? "bg-primary/15 text-primary border-primary/30" : "bg-muted/30 border-border/60 text-muted-foreground")}>F&O only</button>
          <QuickPill label="Risk">
            <div className="flex gap-1">
              {(["low", "medium", "high"] as const).map((c) => (
                <MiniChip key={c} active={filters.risk.has(c)} onClick={() => toggleSet("risk", c)}>{c}</MiniChip>
              ))}
            </div>
          </QuickPill>
          {(activeChips.length > 0 || preset || tab !== "all") && (
            <button onClick={() => { setFilters(DEFAULTS); setPreset(null); setTab("all"); setNlActive(false); setNlConds([]); }} className="ml-auto text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1">
              <RotateCcw className="h-3 w-3" /> Reset all
            </button>
          )}
        </div>

        {/* Active chips */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {activeChips.map((c) => (
              <span key={c.key} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-primary/30 bg-primary/10 text-primary">
                {c.label}
                <button onClick={c.onClear} className="hover:text-foreground"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}

        {/* Presets */}
        <div className="glass rounded-2xl p-2.5 mb-4 flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground shrink-0 ml-1">Presets</span>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPreset(preset === p.id ? null : p.id)}
              title={p.desc}
              className={cn(
                "shrink-0 h-7 px-2.5 rounded-md text-[11px] font-medium border transition whitespace-nowrap",
                preset === p.id ? "bg-primary/15 text-primary border-primary/30" : "bg-muted/30 border-border/60 text-muted-foreground hover:text-foreground",
              )}
            >{p.name}</button>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-12 gap-4">
          {/* Filters drawer */}
          <aside className="col-span-12 lg:col-span-3">
            <div className="glass rounded-2xl p-3 max-h-[calc(100vh-120px)] overflow-y-auto sticky top-16">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Advanced Filters</h3>
                </div>
                <button onClick={() => setFilters(DEFAULTS)} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              </div>

              <FilterCategory title="Company & Classification" defaultOpen>
                <MultiChips label="Industry" list={INDUSTRY_LIST} set={filters.industries} onToggle={(v) => toggleSet("industries", v)} />
                <MultiChips label="Exchange" list={["NSE", "BSE"]} set={filters.exchange} onToggle={(v) => toggleSet("exchange", v)} />
                <ToggleRow label="F&O Eligible only" checked={filters.fnoOnly} onChange={(v) => upd("fnoOnly", v)} />
              </FilterCategory>

              <FilterCategory title="Price & Returns">
                <RangeRow label="Price (₹)" f={filters.price} on={(a, b) => { updRange("price", "min", a); updRange("price", "max", b); }} />
                <RangeRow label="Mkt Cap (Cr)" f={filters.mcap} on={(a, b) => { updRange("mcap", "min", a); updRange("mcap", "max", b); }} />
                <RangeRow label="From 52w hi %" f={filters.from52High} on={(a, b) => { updRange("from52High", "min", a); updRange("from52High", "max", b); }} />
                <RangeRow label="From 52w lo %" f={filters.from52Low} on={(a, b) => { updRange("from52Low", "min", a); updRange("from52Low", "max", b); }} />
                <RangeRow label="1W return %" f={filters.ret1w} on={(a, b) => { updRange("ret1w", "min", a); updRange("ret1w", "max", b); }} />
                <RangeRow label="1M return %" f={filters.ret1m} on={(a, b) => { updRange("ret1m", "min", a); updRange("ret1m", "max", b); }} />
                <RangeRow label="3M return %" f={filters.ret3m} on={(a, b) => { updRange("ret3m", "min", a); updRange("ret3m", "max", b); }} />
                <RangeRow label="1Y return %" f={filters.ret1y} on={(a, b) => { updRange("ret1y", "min", a); updRange("ret1y", "max", b); }} />
                <RangeRow label="3Y CAGR %" f={filters.cagr3y} on={(a, b) => { updRange("cagr3y", "min", a); updRange("cagr3y", "max", b); }} />
              </FilterCategory>

              <FilterCategory title="Valuation">
                <RangeRow label="PE" f={filters.pe} on={(a, b) => { updRange("pe", "min", a); updRange("pe", "max", b); }} />
                <RangeRow label="Fwd PE" f={filters.forwardPe} on={(a, b) => { updRange("forwardPe", "min", a); updRange("forwardPe", "max", b); }} />
                <RangeRow label="P/B" f={filters.pb} on={(a, b) => { updRange("pb", "min", a); updRange("pb", "max", b); }} step={0.1} />
                <RangeRow label="P/S" f={filters.ps} on={(a, b) => { updRange("ps", "min", a); updRange("ps", "max", b); }} step={0.1} />
                <RangeRow label="PEG" f={filters.peg} on={(a, b) => { updRange("peg", "min", a); updRange("peg", "max", b); }} step={0.1} />
                <RangeRow label="EV/EBITDA" f={filters.evEbitda} on={(a, b) => { updRange("evEbitda", "min", a); updRange("evEbitda", "max", b); }} />
                <RangeRow label="Earnings Yld %" f={filters.earningsYield} on={(a, b) => { updRange("earningsYield", "min", a); updRange("earningsYield", "max", b); }} step={0.1} />
                <RangeRow label="FCF Yld %" f={filters.fcfYield} on={(a, b) => { updRange("fcfYield", "min", a); updRange("fcfYield", "max", b); }} step={0.1} />
              </FilterCategory>

              <FilterCategory title="Growth">
                <RangeRow label="Rev Δ % YoY" f={filters.revGrowth} on={(a, b) => { updRange("revGrowth", "min", a); updRange("revGrowth", "max", b); }} />
                <RangeRow label="Rev Δ % 3Y" f={filters.revGrowth3y} on={(a, b) => { updRange("revGrowth3y", "min", a); updRange("revGrowth3y", "max", b); }} />
                <RangeRow label="EPS Δ %" f={filters.epsGrowth} on={(a, b) => { updRange("epsGrowth", "min", a); updRange("epsGrowth", "max", b); }} />
                <RangeRow label="Profit Δ %" f={filters.profitGrowth} on={(a, b) => { updRange("profitGrowth", "min", a); updRange("profitGrowth", "max", b); }} />
              </FilterCategory>

              <FilterCategory title="Profitability & Quality">
                <RangeRow label="ROE %" f={filters.roe} on={(a, b) => { updRange("roe", "min", a); updRange("roe", "max", b); }} />
                <RangeRow label="ROCE %" f={filters.roce} on={(a, b) => { updRange("roce", "min", a); updRange("roce", "max", b); }} />
                <RangeRow label="ROA %" f={filters.roa} on={(a, b) => { updRange("roa", "min", a); updRange("roa", "max", b); }} />
                <RangeRow label="Gross M %" f={filters.grossMargin} on={(a, b) => { updRange("grossMargin", "min", a); updRange("grossMargin", "max", b); }} />
                <RangeRow label="Op M %" f={filters.opMargin} on={(a, b) => { updRange("opMargin", "min", a); updRange("opMargin", "max", b); }} />
                <RangeRow label="Net M %" f={filters.netMargin} on={(a, b) => { updRange("netMargin", "min", a); updRange("netMargin", "max", b); }} />
                <RangeRow label="Piotroski" f={filters.piotroski} on={(a, b) => { updRange("piotroski", "min", a); updRange("piotroski", "max", b); }} />
                <RangeRow label="Altman Z" f={filters.altmanZ} on={(a, b) => { updRange("altmanZ", "min", a); updRange("altmanZ", "max", b); }} step={0.1} />
              </FilterCategory>

              <FilterCategory title="Balance Sheet & Debt">
                <RangeRow label="D/E" f={filters.debtEquity} on={(a, b) => { updRange("debtEquity", "min", a); updRange("debtEquity", "max", b); }} step={0.1} />
                <RangeRow label="Current Ratio" f={filters.currentRatio} on={(a, b) => { updRange("currentRatio", "min", a); updRange("currentRatio", "max", b); }} step={0.1} />
                <RangeRow label="Int Cover" f={filters.interestCover} on={(a, b) => { updRange("interestCover", "min", a); updRange("interestCover", "max", b); }} />
                <RangeRow label="Debt/EBITDA" f={filters.debtEbitda} on={(a, b) => { updRange("debtEbitda", "min", a); updRange("debtEbitda", "max", b); }} step={0.1} />
              </FilterCategory>

              <FilterCategory title="Dividends & Shareholding">
                <RangeRow label="Div Yield %" f={filters.divYield} on={(a, b) => { updRange("divYield", "min", a); updRange("divYield", "max", b); }} step={0.1} />
                <RangeRow label="Promoter %" f={filters.promoterHold} on={(a, b) => { updRange("promoterHold", "min", a); updRange("promoterHold", "max", b); }} />
                <RangeRow label="Promoter Pledge %" f={filters.promoterPledge} on={(a, b) => { updRange("promoterPledge", "min", a); updRange("promoterPledge", "max", b); }} />
                <RangeRow label="FII %" f={filters.fiiHold} on={(a, b) => { updRange("fiiHold", "min", a); updRange("fiiHold", "max", b); }} />
                <RangeRow label="DII %" f={filters.diiHold} on={(a, b) => { updRange("diiHold", "min", a); updRange("diiHold", "max", b); }} />
              </FilterCategory>

              <FilterCategory title="Volume & Liquidity">
                <RangeRow label="Volume Ratio" f={filters.volRatio} on={(a, b) => { updRange("volRatio", "min", a); updRange("volRatio", "max", b); }} step={0.1} />
                <RangeRow label="Rel Volume" f={filters.relVolume} on={(a, b) => { updRange("relVolume", "min", a); updRange("relVolume", "max", b); }} step={0.1} />
                <RangeRow label="Delivery %" f={filters.deliveryPct} on={(a, b) => { updRange("deliveryPct", "min", a); updRange("deliveryPct", "max", b); }} />
                <RangeRow label="Turnover (Cr)" f={filters.turnover} on={(a, b) => { updRange("turnover", "min", a); updRange("turnover", "max", b); }} />
              </FilterCategory>

              <FilterCategory title="Trend & Moving Averages">
                <ToggleRow label="Above SMA 50" checked={filters.aboveSMA50} onChange={(v) => upd("aboveSMA50", v)} />
                <ToggleRow label="Above SMA 200" checked={filters.aboveSMA200} onChange={(v) => upd("aboveSMA200", v)} />
                <ToggleRow label="Golden Cross" checked={filters.goldenCross} onChange={(v) => upd("goldenCross", v)} />
              </FilterCategory>

              <FilterCategory title="Technical Indicators">
                <RangeRow label="RSI 14" f={filters.rsi} on={(a, b) => { updRange("rsi", "min", a); updRange("rsi", "max", b); }} />
                <RangeRow label="ADX" f={filters.adx} on={(a, b) => { updRange("adx", "min", a); updRange("adx", "max", b); }} />
                <RangeRow label="MFI" f={filters.mfi} on={(a, b) => { updRange("mfi", "min", a); updRange("mfi", "max", b); }} />
                <RangeRow label="BB Position" f={filters.bbPosition} on={(a, b) => { updRange("bbPosition", "min", a); updRange("bbPosition", "max", b); }} />
                <ToggleRow label="MACD Bullish Cross" checked={filters.macdBull} onChange={(v) => upd("macdBull", v)} />
              </FilterCategory>

              <FilterCategory title="Price Action Patterns">
                <div className="flex flex-wrap gap-1">
                  {PATTERN_LIST.map((p) => (
                    <MiniChip key={p} active={filters.patterns.has(p)} onClick={() => toggleSet("patterns", p)}>{p}</MiniChip>
                  ))}
                </div>
              </FilterCategory>

              <FilterCategory title="Relative Strength & Scores">
                <RangeRow label="RS vs Nifty %" f={filters.rsVsNifty} on={(a, b) => { updRange("rsVsNifty", "min", a); updRange("rsVsNifty", "max", b); }} />
                <RangeRow label="Quality" f={filters.qualityScore} on={(a, b) => { updRange("qualityScore", "min", a); updRange("qualityScore", "max", b); }} />
                <RangeRow label="Value" f={filters.valueScore} on={(a, b) => { updRange("valueScore", "min", a); updRange("valueScore", "max", b); }} />
                <RangeRow label="Momentum" f={filters.momentumScore} on={(a, b) => { updRange("momentumScore", "min", a); updRange("momentumScore", "max", b); }} />
                <RangeRow label="Growth" f={filters.growthScore} on={(a, b) => { updRange("growthScore", "min", a); updRange("growthScore", "max", b); }} />
                <RangeRow label="AI Score" f={filters.aiScore} on={(a, b) => { updRange("aiScore", "min", a); updRange("aiScore", "max", b); }} />
              </FilterCategory>

              <FilterCategory title="Volatility & Risk">
                <RangeRow label="Beta" f={filters.beta} on={(a, b) => { updRange("beta", "min", a); updRange("beta", "max", b); }} step={0.1} />
                <RangeRow label="Hist Vol %" f={filters.histVol} on={(a, b) => { updRange("histVol", "min", a); updRange("histVol", "max", b); }} />
                <RangeRow label="Max DD %" f={filters.maxDrawdown} on={(a, b) => { updRange("maxDrawdown", "min", a); updRange("maxDrawdown", "max", b); }} />
                <RangeRow label="Sharpe" f={filters.sharpe} on={(a, b) => { updRange("sharpe", "min", a); updRange("sharpe", "max", b); }} step={0.1} />
              </FilterCategory>

              <FilterCategory title="F&O / Derivatives">
                <RangeRow label="OI Change %" f={filters.oiChange} on={(a, b) => { updRange("oiChange", "min", a); updRange("oiChange", "max", b); }} />
                <RangeRow label="PCR" f={filters.pcr} on={(a, b) => { updRange("pcr", "min", a); updRange("pcr", "max", b); }} step={0.1} />
                <RangeRow label="IV %" f={filters.iv} on={(a, b) => { updRange("iv", "min", a); updRange("iv", "max", b); }} />
              </FilterCategory>

              <FilterCategory title="Events">
                <ToggleRow label="Only stocks with events" checked={filters.eventsOnly} onChange={(v) => upd("eventsOnly", v)} />
              </FilterCategory>
            </div>
          </aside>

          {/* Results */}
          <div className="col-span-12 lg:col-span-9 space-y-3">
            <div className="glass rounded-2xl p-2.5 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={filters.q}
                  onChange={(e) => upd("q", e.target.value)}
                  placeholder="Search symbol, name, industry…"
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-muted/30 border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div className="text-[11px] text-muted-foreground">
                <span className="text-foreground font-medium num">{rows.length}</span> results
              </div>
              <select value={pageSize} onChange={(e) => { setPageSize(+e.target.value); setPage(1); }} className="h-9 px-2 rounded-lg text-xs bg-muted/30 border border-border/60">
                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} / page</option>)}
              </select>
            </div>

            {rows.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <Search className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <div className="text-sm font-medium">No stocks match your criteria</div>
                <div className="text-xs text-muted-foreground mt-1">Try loosening filters or reset all.</div>
                <button onClick={() => setFilters(DEFAULTS)} className="mt-4 h-8 px-3 rounded-lg text-xs bg-primary/10 text-primary border border-primary/30">Reset filters</button>
              </div>
            ) : (
              <div className="glass rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[1400px]">
                    <thead>
                      <tr className="text-[10px] text-muted-foreground uppercase tracking-wider bg-muted/20 sticky top-0">
                        <th className="px-3 py-2 text-left w-10">#</th>
                        <Th sortKey={sortKey} k="symbol" dir={sortDir} onClick={() => sortBy("symbol")} align="left">Stock</Th>
                        <th className="px-3 py-2 text-left">Signal</th>
                        <Th sortKey={sortKey} k="aiScore" dir={sortDir} onClick={() => sortBy("aiScore")}>AI</Th>
                        <Th sortKey={sortKey} k="signalStrength" dir={sortDir} onClick={() => sortBy("signalStrength")}>Prob</Th>
                        <Th sortKey={sortKey} k="changePct" dir={sortDir} onClick={() => sortBy("changePct")}>Chg</Th>
                        <Th sortKey={sortKey} k="price" dir={sortDir} onClick={() => sortBy("price")}>LTP</Th>
                        <Th sortKey={sortKey} k="volRatio" dir={sortDir} onClick={() => sortBy("volRatio")}>Vol×</Th>
                        <Th sortKey={sortKey} k="marketCap" dir={sortDir} onClick={() => sortBy("marketCap")}>M.Cap</Th>
                        <Th sortKey={sortKey} k="pe" dir={sortDir} onClick={() => sortBy("pe")}>PE</Th>
                        <Th sortKey={sortKey} k="roe" dir={sortDir} onClick={() => sortBy("roe")}>ROE</Th>
                        <Th sortKey={sortKey} k="roce" dir={sortDir} onClick={() => sortBy("roce")}>ROCE</Th>
                        <Th sortKey={sortKey} k="rsi" dir={sortDir} onClick={() => sortBy("rsi")}>RSI</Th>
                        <Th sortKey={sortKey} k="rsVsNifty" dir={sortDir} onClick={() => sortBy("rsVsNifty")}>RS</Th>
                        <Th sortKey={sortKey} k="riskScore" dir={sortDir} onClick={() => sortBy("riskScore")}>Risk</Th>
                        <th className="px-3 py-2 text-left">Sector</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((s, i) => (
                        <tr key={s.symbol} onClick={() => setSelected(s)} className={cn("border-t border-border/40 hover:bg-muted/20 transition cursor-pointer", selected?.symbol === s.symbol && "bg-primary/5")}>
                          <td className="px-3 py-2.5 text-[11px] text-muted-foreground num">{(page - 1) * pageSize + i + 1}</td>
                          <td className="px-3 py-2.5 sticky left-0 bg-background/60 backdrop-blur">
                            <div className="text-sm font-medium">{s.symbol}</div>
                            <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">{s.name}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            {s.signals[0] ? (
                              <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium whitespace-nowrap", SIGNAL_COLOR[s.signals[0].kind])}>
                                {s.signals[0].label}
                              </span>
                            ) : <span className="text-[10px] text-muted-foreground">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-right"><ScoreCell v={s.aiScore} /></td>
                          <td className="px-3 py-2.5 text-right num text-xs text-muted-foreground">{s.signalStrength || "—"}{s.signalStrength ? "%" : ""}</td>
                          <td className="px-3 py-2.5 text-right"><Delta value={s.changePct} className="text-xs" /></td>
                          <td className="px-3 py-2.5 text-right num">{formatINR(s.price)}</td>
                          <td className={cn("px-3 py-2.5 text-right num text-xs", s.volRatio > 2 ? "text-warning font-semibold" : s.volRatio > 1.4 ? "text-primary" : "text-muted-foreground")}>{s.volRatio.toFixed(2)}×</td>
                          <td className="px-3 py-2.5 text-right num text-xs text-muted-foreground">{formatINR(s.marketCap * 1e7, true)}</td>
                          <td className="px-3 py-2.5 text-right num text-xs">{s.pe}</td>
                          <td className="px-3 py-2.5 text-right num text-xs">{s.roe}%</td>
                          <td className="px-3 py-2.5 text-right num text-xs">{s.roce}%</td>
                          <td className="px-3 py-2.5 text-right">
                            <span className={cn("text-xs px-1.5 py-0.5 rounded num", s.rsi > 70 ? "bg-destructive/15 text-destructive" : s.rsi < 30 ? "bg-success/15 text-success" : "text-muted-foreground")}>{s.rsi.toFixed(0)}</span>
                          </td>
                          <td className={cn("px-3 py-2.5 text-right num text-xs", s.rsVsNifty > 0 ? "text-success" : "text-destructive")}>{s.rsVsNifty > 0 ? "+" : ""}{s.rsVsNifty.toFixed(1)}%</td>
                          <td className="px-3 py-2.5 text-right">
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded uppercase font-medium", s.risk === "low" ? "bg-success/15 text-success" : s.risk === "high" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning")}>{s.risk}</span>
                          </td>
                          <td className="px-3 py-2.5 text-[10px] text-muted-foreground whitespace-nowrap">{s.sector}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                <div className="flex items-center justify-between p-3 border-t border-border/40 text-xs">
                  <div className="text-muted-foreground">
                    Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, rows.length)} of {rows.length}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage(1)} disabled={page === 1} className="h-7 px-2 rounded border border-border/60 bg-muted/30 disabled:opacity-30">«</button>
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-7 px-2 rounded border border-border/60 bg-muted/30 disabled:opacity-30">‹</button>
                    <span className="px-2 num">{page} / {pageCount}</span>
                    <button onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page === pageCount} className="h-7 px-2 rounded border border-border/60 bg-muted/30 disabled:opacity-30">›</button>
                    <button onClick={() => setPage(pageCount)} disabled={page === pageCount} className="h-7 px-2 rounded border border-border/60 bg-muted/30 disabled:opacity-30">»</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick analysis drawer */}
        {selected && <QuickDrawer stock={selected} onClose={() => setSelected(null)} />}
      </div>
    </AppShell>
  );
}

/* ---------- helpers ---------- */

function FilterCategory({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-2 pb-2 border-b border-border/40 last:border-0">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 hover:text-foreground">
        <span>{title}</span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {open && <div className="space-y-2">{children}</div>}
    </div>
  );
}

function RangeRow({ label, f, on, step = 1 }: { label: string; f: NumRange; on: (a: number, b: number) => void; step?: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="num font-medium text-[10px]">{f.min} – {f.max}</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <input type="number" step={step} value={f.min} onChange={(e) => on(+e.target.value, f.max)}
          className="h-7 rounded-md bg-muted/40 border border-border/60 text-[11px] px-2 num focus:outline-none focus:ring-1 focus:ring-primary/40" />
        <input type="number" step={step} value={f.max} onChange={(e) => on(f.min, +e.target.value)}
          className="h-7 rounded-md bg-muted/40 border border-border/60 text-[11px] px-2 num focus:outline-none focus:ring-1 focus:ring-primary/40" />
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-[11px] cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-primary" />
      {label}
    </label>
  );
}

function MultiChips<T extends string>({ label, list, set, onToggle }: { label: string; list: readonly T[] | T[]; set: Set<T>; onToggle: (v: T) => void }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
      <div className="flex flex-wrap gap-1">
        {list.map((v) => (
          <MiniChip key={v} active={set.has(v)} onClick={() => onToggle(v)}>{v}</MiniChip>
        ))}
      </div>
    </div>
  );
}

function MiniChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-[10px] px-2 py-0.5 rounded border transition whitespace-nowrap capitalize",
        active ? "bg-primary/15 text-primary border-primary/30" : "bg-muted/30 border-border/60 text-muted-foreground hover:text-foreground",
      )}
    >{children}</button>
  );
}

function QuickPill({ label, children, open = false }: { label: string; children: React.ReactNode; open?: boolean }) {
  const [isOpen, setOpen] = useState(open);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="h-7 px-2.5 rounded-md text-[11px] font-medium bg-muted/30 border border-border/60 text-muted-foreground hover:text-foreground flex items-center gap-1">
        {label} <ChevronDown className="h-3 w-3" />
      </button>
      {isOpen && (
        <div className="absolute z-20 top-full mt-1 left-0 glass rounded-lg border border-border/60 p-2 shadow-xl min-w-[220px]">
          {children}
        </div>
      )}
    </div>
  );
}

function Th({ children, onClick, sortKey, k, dir, align = "right" }: { children: React.ReactNode; onClick: () => void; sortKey: SortKey; k: SortKey; dir: "asc" | "desc"; align?: "left" | "right" }) {
  const active = sortKey === k;
  return (
    <th className={cn("font-medium px-3 py-2 cursor-pointer select-none hover:text-foreground whitespace-nowrap", align === "left" ? "text-left" : "text-right", active && "text-primary")} onClick={onClick}>
      {children}{active && <span className="ml-1">{dir === "asc" ? "▲" : "▼"}</span>}
    </th>
  );
}

function ScoreCell({ v, strong }: { v: number; strong?: boolean }) {
  const color = v >= 70 ? "bg-success/15 text-success" : v >= 45 ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive";
  return <span className={cn("num text-xs px-1.5 py-0.5 rounded", color, strong && "font-semibold")}>{v}</span>;
}

/* ---------- quick analysis drawer ---------- */

function QuickDrawer({ stock: s, onClose }: { stock: ExtStock; onClose: () => void }) {
  const spark = useMemo(() => {
    // deterministic tiny sparkline seeded by symbol
    const seed = s.symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 1);
    let x = seed * 13;
    const rnd = () => { x = (x * 9301 + 49297) % 233280; return x / 233280; };
    const arr: number[] = [];
    let v = s.price;
    for (let i = 0; i < 40; i++) {
      v = v * (1 + Math.sin(i * 0.4) * 0.008 + (rnd() - 0.5) * 0.012);
      arr.push(v);
    }
    return arr;
  }, [s.symbol, s.price]);

  return (
    <>
      <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40" onClick={onClose} />
      <aside className="fixed top-0 right-0 h-screen w-full max-w-md bg-background border-l border-border/60 z-50 overflow-y-auto">
        <div className="p-5 border-b border-border/40 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{s.symbol}</h2>
              <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">{s.sector}</span>
              <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">{s.mcapCategory}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{s.name} · {s.industry}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted/50 text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-semibold num">{formatINR(s.price)}</div>
              <Delta value={s.changePct} className="text-sm" />
            </div>
            <div className="text-right text-[10px] text-muted-foreground">
              <div>M.Cap {formatINR(s.marketCap * 1e7, true)}</div>
              <div>Vol {s.volRatio.toFixed(2)}× avg</div>
            </div>
          </div>

          <div className="glass rounded-xl p-3">
            <Sparkline data={spark} positive={s.changePct >= 0} />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2 num">
              <span>Low ₹{s.dayLow}</span>
              <span>High ₹{s.dayHigh}</span>
            </div>
          </div>

          {/* AI summary */}
          <div className="glass rounded-xl p-3 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold">AI Summary</span>
              <span className="ml-auto text-[10px] text-muted-foreground">Confidence 78%</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {s.name} is trading at PE {s.pe} vs industry {s.industryPe}, with ROCE of {s.roce}% and {s.revGrowth > 0 ? "+" : ""}{s.revGrowth}% revenue growth.
              Momentum is {s.momentumScore > 60 ? "strong" : s.momentumScore > 40 ? "neutral" : "weak"} with RSI {s.rsi.toFixed(0)} and {s.from52High.toFixed(1)}% from 52w high.
            </p>
          </div>

          {/* Scores */}
          <div className="grid grid-cols-4 gap-2">
            <ScoreTile label="Fundamental" v={s.fundamentalScore} />
            <ScoreTile label="Technical" v={s.technicalScore} />
            <ScoreTile label="Momentum" v={s.momentumScore} />
            <ScoreTile label="Risk" v={s.riskScore} invert />
          </div>

          {/* Signals */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Active Signals</div>
            {s.signals.length ? (
              <div className="space-y-2">
                {s.signals.slice(0, 5).map((sig, i) => (
                  <div key={i} className="glass rounded-lg p-2.5 flex items-start gap-2">
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium whitespace-nowrap capitalize", SIGNAL_COLOR[sig.kind])}>{sig.kind.replace("-", " ")}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium">{sig.label}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{sig.note}</div>
                    </div>
                    <div className="text-right text-[10px] text-muted-foreground shrink-0">
                      <div className="num font-semibold text-foreground">{sig.strength}%</div>
                      <div>prob {sig.probability}%</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="text-xs text-muted-foreground">No active signals</div>}
          </div>

          {/* Bull / Bear */}
          <div className="grid grid-cols-2 gap-2">
            <div className="glass rounded-lg p-3 border border-success/20">
              <div className="flex items-center gap-1.5 text-success text-[10px] uppercase tracking-widest font-semibold mb-1.5">
                <TrendingUp className="h-3 w-3" /> Bull case
              </div>
              <ul className="text-[11px] text-muted-foreground space-y-1">
                {s.roce > 15 && <li>• ROCE {s.roce}%</li>}
                {s.revGrowth > 12 && <li>• Rev +{s.revGrowth}%</li>}
                {s.piotroski >= 7 && <li>• Piotroski {s.piotroski}/9</li>}
                {s.rsVsNifty > 0 && <li>• Leading Nifty +{s.rsVsNifty}%</li>}
                {s.qualityScore > 65 && <li>• Quality {s.qualityScore}</li>}
              </ul>
            </div>
            <div className="glass rounded-lg p-3 border border-destructive/20">
              <div className="flex items-center gap-1.5 text-destructive text-[10px] uppercase tracking-widest font-semibold mb-1.5">
                <TrendingDown className="h-3 w-3" /> Bear case
              </div>
              <ul className="text-[11px] text-muted-foreground space-y-1">
                {s.pe > 40 && <li>• PE {s.pe} elevated</li>}
                {s.debtEquity > 1 && <li>• D/E {s.debtEquity}</li>}
                {s.from52High < -20 && <li>• {s.from52High}% off 52w high</li>}
                {s.rsi > 70 && <li>• RSI overbought</li>}
                {s.riskScore > 60 && <li>• Risk score {s.riskScore}</li>}
              </ul>
            </div>
          </div>

          {/* Key risks */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Key Risks</div>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] px-2 py-1 rounded-md bg-muted/40 border border-border/60">Beta {s.beta}</span>
              <span className="text-[10px] px-2 py-1 rounded-md bg-muted/40 border border-border/60">Vol {s.histVol}%</span>
              <span className="text-[10px] px-2 py-1 rounded-md bg-muted/40 border border-border/60">MaxDD {s.maxDrawdown}%</span>
              <span className="text-[10px] px-2 py-1 rounded-md bg-muted/40 border border-border/60">Sharpe {s.sharpe}</span>
              {s.promoterPledge > 0 && <span className="text-[10px] px-2 py-1 rounded-md bg-destructive/15 text-destructive border border-destructive/30">Pledge {s.promoterPledge}%</span>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button className="flex-1 h-9 rounded-lg text-xs font-medium bg-muted/40 border border-border/60 hover:bg-muted/60 flex items-center justify-center gap-1.5">
              <Star className="h-3.5 w-3.5" /> Watchlist
            </button>
            <button className="flex-1 h-9 rounded-lg text-xs font-medium bg-muted/40 border border-border/60 hover:bg-muted/60 flex items-center justify-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Compare
            </button>
            <Link to="/stock/$symbol" params={{ symbol: s.symbol }} className="flex-1 h-9 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 flex items-center justify-center gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" /> Open
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}

function ScoreTile({ label, v, invert = false }: { label: string; v: number; invert?: boolean }) {
  const good = invert ? v < 40 : v >= 70;
  const bad = invert ? v > 65 : v < 45;
  const color = good ? "text-success" : bad ? "text-destructive" : "text-warning";
  return (
    <div className="glass rounded-lg p-2 text-center">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn("text-base font-semibold num mt-0.5", color)}>{v}</div>
    </div>
  );
}

// Unused imports kept for future use
void Activity;
