import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { extStocks, PRESETS, SECTORS_LIST, type ExtStock } from "@/lib/screener-data";
import { Delta, SectionHeader, formatINR } from "@/lib/ui-helpers";
import { quotesQuery, toTdStock } from "@/lib/market-queries";
import {
  Search, LayoutGrid, Table as TableIcon, Bookmark, SlidersHorizontal, Star, Download,
  Sparkles, RotateCcw, Wifi, WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/explorer")({
  component: Explorer,
  head: () => ({
    meta: [
      { title: "Advanced Screener — StockSense AI" },
      { name: "description", content: "Alphaave-style screener: 40+ fundamental, technical, ownership and factor filters across NSE/BSE." },
    ],
  }),
});

type NumRange = { min: number; max: number };
type Filters = {
  q: string;
  sectors: Set<string>;
  mcap: NumRange;         // crore
  pe: NumRange;
  pb: NumRange;
  ps: NumRange;
  evEbitda: NumRange;
  peg: NumRange;
  roe: NumRange;
  roce: NumRange;
  grossMargin: NumRange;
  opMargin: NumRange;
  netMargin: NumRange;
  revGrowth: NumRange;
  epsGrowth: NumRange;
  debtEquity: NumRange;
  fcfYield: NumRange;
  divYield: NumRange;
  rsi: NumRange;
  from52High: NumRange;
  beta: NumRange;
  promoterHold: NumRange;
  fiiHold: NumRange;
  piotroski: NumRange;
  qualityScore: NumRange;
  valueScore: NumRange;
  momentumScore: NumRange;
  growthScore: NumRange;
  aboveSMA50: boolean;
  aboveSMA200: boolean;
};

const DEFAULTS: Filters = {
  q: "",
  sectors: new Set(),
  mcap: { min: 0, max: 5_000_000 },
  pe: { min: 0, max: 200 },
  pb: { min: 0, max: 20 },
  ps: { min: 0, max: 20 },
  evEbitda: { min: 0, max: 60 },
  peg: { min: 0, max: 5 },
  roe: { min: 0, max: 100 },
  roce: { min: 0, max: 100 },
  grossMargin: { min: 0, max: 100 },
  opMargin: { min: 0, max: 100 },
  netMargin: { min: 0, max: 100 },
  revGrowth: { min: -100, max: 200 },
  epsGrowth: { min: -100, max: 200 },
  debtEquity: { min: 0, max: 5 },
  fcfYield: { min: 0, max: 20 },
  divYield: { min: 0, max: 15 },
  rsi: { min: 0, max: 100 },
  from52High: { min: -100, max: 0 },
  beta: { min: 0, max: 3 },
  promoterHold: { min: 0, max: 100 },
  fiiHold: { min: 0, max: 100 },
  piotroski: { min: 0, max: 9 },
  qualityScore: { min: 0, max: 100 },
  valueScore: { min: 0, max: 100 },
  momentumScore: { min: 0, max: 100 },
  growthScore: { min: 0, max: 100 },
  aboveSMA50: false,
  aboveSMA200: false,
};

type SortKey = keyof ExtStock;

function Explorer() {
  const [view, setView] = useState<"table" | "card">("table");
  const [filters, setFilters] = useState<Filters>(DEFAULTS);
  const [preset, setPreset] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("compositeScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const upd = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }));
  const updRange = (k: keyof Filters, side: "min" | "max", v: number) =>
    setFilters((f) => ({ ...f, [k]: { ...(f[k] as NumRange), [side]: v } }));

  // Live prices merged
  const stkQ = useQuery(quotesQuery(extStocks.map((s) => toTdStock(s.symbol))));
  const liveMap = new Map((stkQ.data?.quotes ?? []).map((q) => [q.symbol, q]));
  const isLive = (stkQ.data?.quotes?.length ?? 0) > 0;

  const rows = useMemo(() => {
    let list: ExtStock[] = extStocks.map((s) => {
      const q = liveMap.get(toTdStock(s.symbol));
      return q ? { ...s, price: q.price, change: q.change, changePct: q.changePct } : s;
    });
    const p = PRESETS.find((x) => x.id === preset);
    if (p) list = list.filter(p.filter);
    const f = filters;
    list = list.filter((s) => {
      if (f.q && !`${s.symbol} ${s.name}`.toLowerCase().includes(f.q.toLowerCase())) return false;
      if (f.sectors.size > 0 && !f.sectors.has(s.sector)) return false;
      const chk = (k: keyof Filters, v: number) => {
        const r = f[k] as NumRange;
        return v >= r.min && v <= r.max;
      };
      if (!chk("mcap", s.marketCap)) return false;
      if (!chk("pe", s.pe)) return false;
      if (!chk("pb", s.pb)) return false;
      if (!chk("ps", s.ps)) return false;
      if (!chk("evEbitda", s.evEbitda)) return false;
      if (!chk("peg", s.peg)) return false;
      if (!chk("roe", s.roe)) return false;
      if (!chk("roce", s.roce)) return false;
      if (!chk("grossMargin", s.grossMargin)) return false;
      if (!chk("opMargin", s.opMargin)) return false;
      if (!chk("netMargin", s.netMargin)) return false;
      if (!chk("revGrowth", s.revGrowth)) return false;
      if (!chk("epsGrowth", s.epsGrowth)) return false;
      if (!chk("debtEquity", s.debtEquity)) return false;
      if (!chk("fcfYield", s.fcfYield)) return false;
      if (!chk("divYield", s.divYield)) return false;
      if (!chk("rsi", s.rsi)) return false;
      if (!chk("from52High", s.from52High)) return false;
      if (!chk("beta", s.beta)) return false;
      if (!chk("promoterHold", s.promoterHold)) return false;
      if (!chk("fiiHold", s.fiiHold)) return false;
      if (!chk("piotroski", s.piotroski)) return false;
      if (!chk("qualityScore", s.qualityScore)) return false;
      if (!chk("valueScore", s.valueScore)) return false;
      if (!chk("momentumScore", s.momentumScore)) return false;
      if (!chk("growthScore", s.growthScore)) return false;
      if (f.aboveSMA50 && s.price <= s.sma50) return false;
      if (f.aboveSMA200 && s.price <= s.sma200) return false;
      return true;
    });
    list.sort((a, b) => {
      const av = a[sortKey] as number;
      const bv = b[sortKey] as number;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return list;
  }, [filters, preset, sortKey, sortDir, stkQ.data]);

  const toggleSector = (s: string) => {
    const next = new Set(filters.sectors);
    next.has(s) ? next.delete(s) : next.add(s);
    upd("sectors", next);
  };

  const sortBy = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  };

  const exportCSV = () => {
    const cols: SortKey[] = ["symbol", "name", "sector", "price", "changePct", "marketCap", "pe", "pb", "roe", "roce", "revGrowth", "epsGrowth", "debtEquity", "divYield", "rsi", "from52High", "qualityScore", "valueScore", "momentumScore", "growthScore", "compositeScore"];
    const header = cols.join(",");
    const body = rows.map((r) => cols.map((c) => String(r[c] ?? "")).join(",")).join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "stocksense-screener.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">Advanced Screener</h1>
              <span className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider border text-[10px]",
                isLive ? "bg-success/10 text-success border-success/30" : "bg-muted/40 text-muted-foreground border-border",
              )}>
                {isLive ? <Wifi className="h-2.5 w-2.5" /> : <WifiOff className="h-2.5 w-2.5" />}
                {isLive ? "Live · Twelve Data" : "Sample data"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              40+ filters across fundamentals, technicals, ownership, and factor scores · {extStocks.length} NSE names
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="h-9 px-3.5 rounded-lg text-xs font-medium bg-muted/40 border border-border/60 hover:bg-muted/60 flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
            <button className="h-9 px-3.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-1.5">
              <Bookmark className="h-3.5 w-3.5" /> Save screener
            </button>
          </div>
        </div>

        {/* Presets bar */}
        <div className="glass rounded-2xl p-3 mb-4 flex items-center gap-2 overflow-x-auto">
          <Sparkles className="h-4 w-4 text-primary shrink-0 ml-1" />
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground shrink-0 mr-2">Presets</span>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPreset(preset === p.id ? null : p.id)}
              title={p.desc}
              className={cn(
                "shrink-0 h-8 px-3 rounded-lg text-xs font-medium border transition whitespace-nowrap",
                preset === p.id
                  ? "bg-primary/15 text-primary border-primary/30"
                  : "bg-muted/30 border-border/60 text-muted-foreground hover:text-foreground",
              )}
            >{p.name}</button>
          ))}
          {preset && (
            <button onClick={() => setPreset(null)} className="ml-1 h-8 px-2 rounded-lg text-xs text-muted-foreground hover:text-foreground">Clear</button>
          )}
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Filters */}
          <aside className="col-span-12 lg:col-span-3 space-y-4">
            <div className="glass rounded-2xl p-4 max-h-[calc(100vh-160px)] overflow-y-auto sticky top-16">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Filters</h3>
                </div>
                <button onClick={() => { setFilters(DEFAULTS); setPreset(null); }} className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              </div>

              <FilterGroup title="Sectors">
                <div className="flex flex-wrap gap-1">
                  {SECTORS_LIST.map((s) => (
                    <button
                      key={s}
                      onClick={() => toggleSector(s)}
                      className={cn(
                        "text-[10px] px-2 py-1 rounded border transition",
                        filters.sectors.has(s)
                          ? "bg-primary/15 text-primary border-primary/30"
                          : "bg-muted/30 border-border/60 text-muted-foreground",
                      )}
                    >{s}</button>
                  ))}
                </div>
              </FilterGroup>

              <FilterGroup title="Valuation">
                <RangeRow label="PE" f={filters.pe} on={(a, b) => { updRange("pe", "min", a); updRange("pe", "max", b); }} />
                <RangeRow label="P/B" f={filters.pb} on={(a, b) => { updRange("pb", "min", a); updRange("pb", "max", b); }} step={0.1} />
                <RangeRow label="P/S" f={filters.ps} on={(a, b) => { updRange("ps", "min", a); updRange("ps", "max", b); }} step={0.1} />
                <RangeRow label="EV/EBITDA" f={filters.evEbitda} on={(a, b) => { updRange("evEbitda", "min", a); updRange("evEbitda", "max", b); }} />
                <RangeRow label="PEG" f={filters.peg} on={(a, b) => { updRange("peg", "min", a); updRange("peg", "max", b); }} step={0.1} />
                <RangeRow label="FCF yield %" f={filters.fcfYield} on={(a, b) => { updRange("fcfYield", "min", a); updRange("fcfYield", "max", b); }} step={0.1} />
              </FilterGroup>

              <FilterGroup title="Profitability">
                <RangeRow label="ROE %" f={filters.roe} on={(a, b) => { updRange("roe", "min", a); updRange("roe", "max", b); }} />
                <RangeRow label="ROCE %" f={filters.roce} on={(a, b) => { updRange("roce", "min", a); updRange("roce", "max", b); }} />
                <RangeRow label="Gross M %" f={filters.grossMargin} on={(a, b) => { updRange("grossMargin", "min", a); updRange("grossMargin", "max", b); }} />
                <RangeRow label="Op M %" f={filters.opMargin} on={(a, b) => { updRange("opMargin", "min", a); updRange("opMargin", "max", b); }} />
                <RangeRow label="Net M %" f={filters.netMargin} on={(a, b) => { updRange("netMargin", "min", a); updRange("netMargin", "max", b); }} />
              </FilterGroup>

              <FilterGroup title="Growth">
                <RangeRow label="Rev Δ %" f={filters.revGrowth} on={(a, b) => { updRange("revGrowth", "min", a); updRange("revGrowth", "max", b); }} />
                <RangeRow label="EPS Δ %" f={filters.epsGrowth} on={(a, b) => { updRange("epsGrowth", "min", a); updRange("epsGrowth", "max", b); }} />
              </FilterGroup>

              <FilterGroup title="Balance sheet">
                <RangeRow label="D/E" f={filters.debtEquity} on={(a, b) => { updRange("debtEquity", "min", a); updRange("debtEquity", "max", b); }} step={0.1} />
                <RangeRow label="Div yield %" f={filters.divYield} on={(a, b) => { updRange("divYield", "min", a); updRange("divYield", "max", b); }} step={0.1} />
                <RangeRow label="Piotroski" f={filters.piotroski} on={(a, b) => { updRange("piotroski", "min", a); updRange("piotroski", "max", b); }} />
              </FilterGroup>

              <FilterGroup title="Technicals">
                <RangeRow label="RSI" f={filters.rsi} on={(a, b) => { updRange("rsi", "min", a); updRange("rsi", "max", b); }} />
                <RangeRow label="From 52w hi %" f={filters.from52High} on={(a, b) => { updRange("from52High", "min", a); updRange("from52High", "max", b); }} />
                <RangeRow label="Beta" f={filters.beta} on={(a, b) => { updRange("beta", "min", a); updRange("beta", "max", b); }} step={0.1} />
                <label className="flex items-center gap-2 text-[11px] mt-2 cursor-pointer">
                  <input type="checkbox" checked={filters.aboveSMA50} onChange={(e) => upd("aboveSMA50", e.target.checked)} className="accent-primary" />
                  Above SMA 50
                </label>
                <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                  <input type="checkbox" checked={filters.aboveSMA200} onChange={(e) => upd("aboveSMA200", e.target.checked)} className="accent-primary" />
                  Above SMA 200
                </label>
              </FilterGroup>

              <FilterGroup title="Ownership">
                <RangeRow label="Promoter %" f={filters.promoterHold} on={(a, b) => { updRange("promoterHold", "min", a); updRange("promoterHold", "max", b); }} />
                <RangeRow label="FII %" f={filters.fiiHold} on={(a, b) => { updRange("fiiHold", "min", a); updRange("fiiHold", "max", b); }} />
              </FilterGroup>

              <FilterGroup title="Factor scores">
                <RangeRow label="Quality" f={filters.qualityScore} on={(a, b) => { updRange("qualityScore", "min", a); updRange("qualityScore", "max", b); }} />
                <RangeRow label="Value" f={filters.valueScore} on={(a, b) => { updRange("valueScore", "min", a); updRange("valueScore", "max", b); }} />
                <RangeRow label="Momentum" f={filters.momentumScore} on={(a, b) => { updRange("momentumScore", "min", a); updRange("momentumScore", "max", b); }} />
                <RangeRow label="Growth" f={filters.growthScore} on={(a, b) => { updRange("growthScore", "min", a); updRange("growthScore", "max", b); }} />
              </FilterGroup>
            </div>
          </aside>

          {/* Results */}
          <div className="col-span-12 lg:col-span-9 space-y-4">
            <div className="glass rounded-2xl p-3 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={filters.q}
                  onChange={(e) => upd("q", e.target.value)}
                  placeholder="Search symbol, name, ISIN…"
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-muted/30 border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div className="flex rounded-lg bg-muted/30 border border-border/60 p-0.5">
                <button onClick={() => setView("table")} className={cn("px-2.5 h-8 rounded-md text-xs font-medium flex items-center gap-1.5 transition", view === "table" ? "bg-primary/15 text-primary" : "text-muted-foreground")}>
                  <TableIcon className="h-3.5 w-3.5" /> Table
                </button>
                <button onClick={() => setView("card")} className={cn("px-2.5 h-8 rounded-md text-xs font-medium flex items-center gap-1.5 transition", view === "card" ? "bg-primary/15 text-primary" : "text-muted-foreground")}>
                  <LayoutGrid className="h-3.5 w-3.5" /> Cards
                </button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground flex items-center justify-between">
              <div><span className="text-foreground font-medium">{rows.length}</span> stocks match · sorted by {String(sortKey)} {sortDir === "asc" ? "▲" : "▼"}</div>
            </div>

            {view === "table" ? (
              <div className="glass rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] text-muted-foreground uppercase tracking-wider bg-muted/20">
                        <Th onClick={() => sortBy("symbol")} sortKey={sortKey} k="symbol" dir={sortDir} align="left">Company</Th>
                        <Th onClick={() => sortBy("price")} sortKey={sortKey} k="price" dir={sortDir}>Price</Th>
                        <Th onClick={() => sortBy("changePct")} sortKey={sortKey} k="changePct" dir={sortDir}>Chg</Th>
                        <Th onClick={() => sortBy("marketCap")} sortKey={sortKey} k="marketCap" dir={sortDir}>M.Cap</Th>
                        <Th onClick={() => sortBy("pe")} sortKey={sortKey} k="pe" dir={sortDir}>PE</Th>
                        <Th onClick={() => sortBy("pb")} sortKey={sortKey} k="pb" dir={sortDir}>P/B</Th>
                        <Th onClick={() => sortBy("roe")} sortKey={sortKey} k="roe" dir={sortDir}>ROE</Th>
                        <Th onClick={() => sortBy("revGrowth")} sortKey={sortKey} k="revGrowth" dir={sortDir}>Rev Δ</Th>
                        <Th onClick={() => sortBy("piotroski")} sortKey={sortKey} k="piotroski" dir={sortDir}>Piotr</Th>
                        <Th onClick={() => sortBy("rsi")} sortKey={sortKey} k="rsi" dir={sortDir}>RSI</Th>
                        <Th onClick={() => sortBy("from52High")} sortKey={sortKey} k="from52High" dir={sortDir}>52w</Th>
                        <Th onClick={() => sortBy("qualityScore")} sortKey={sortKey} k="qualityScore" dir={sortDir}>Qual</Th>
                        <Th onClick={() => sortBy("valueScore")} sortKey={sortKey} k="valueScore" dir={sortDir}>Val</Th>
                        <Th onClick={() => sortBy("momentumScore")} sortKey={sortKey} k="momentumScore" dir={sortDir}>Mom</Th>
                        <Th onClick={() => sortBy("compositeScore")} sortKey={sortKey} k="compositeScore" dir={sortDir}>Comp</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((s) => (
                        <tr key={s.symbol} className="border-t border-border/40 hover:bg-muted/20 transition">
                          <td className="px-4 py-2.5">
                            <Link to="/stock/$symbol" params={{ symbol: s.symbol }} className="block">
                              <div className="text-sm font-medium">{s.symbol}</div>
                              <div className="text-[10px] text-muted-foreground">{s.sector}</div>
                            </Link>
                          </td>
                          <td className="px-3 py-2.5 text-right num">{formatINR(s.price)}</td>
                          <td className="px-3 py-2.5 text-right"><Delta value={s.changePct} className="text-xs" /></td>
                          <td className="px-3 py-2.5 text-right num text-muted-foreground">{formatINR(s.marketCap * 1e7, true)}</td>
                          <td className="px-3 py-2.5 text-right num">{s.pe}</td>
                          <td className="px-3 py-2.5 text-right num text-muted-foreground">{s.pb}</td>
                          <td className="px-3 py-2.5 text-right num">{s.roe}%</td>
                          <td className={cn("px-3 py-2.5 text-right num", s.revGrowth >= 0 ? "text-success" : "text-destructive")}>{s.revGrowth > 0 ? "+" : ""}{s.revGrowth}%</td>
                          <td className="px-3 py-2.5 text-right"><span className={cn("num text-xs px-1.5 py-0.5 rounded", s.piotroski >= 7 ? "bg-success/15 text-success" : s.piotroski <= 3 ? "bg-destructive/15 text-destructive" : "text-muted-foreground")}>{s.piotroski}</span></td>
                          <td className="px-3 py-2.5 text-right">
                            <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded num", s.rsi > 70 ? "bg-destructive/15 text-destructive" : s.rsi < 30 ? "bg-success/15 text-success" : "text-muted-foreground")}>{s.rsi}</span>
                          </td>
                          <td className={cn("px-3 py-2.5 text-right num text-xs", s.from52High > -5 ? "text-success" : "text-muted-foreground")}>{s.from52High}%</td>
                          <ScoreCell v={s.qualityScore} />
                          <ScoreCell v={s.valueScore} />
                          <ScoreCell v={s.momentumScore} />
                          <ScoreCell v={s.compositeScore} strong />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {rows.map((s) => (
                  <Link key={s.symbol} to="/stock/$symbol" params={{ symbol: s.symbol }} className="glass rounded-2xl p-4 hover:-translate-y-0.5 transition-all block">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{s.symbol}</h3>
                          <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">{s.sector}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{s.name}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-semibold num">{formatINR(s.price)}</div>
                        <Delta value={s.changePct} className="text-xs" />
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
                      <Mini label="Q" v={s.qualityScore} />
                      <Mini label="V" v={s.valueScore} />
                      <Mini label="M" v={s.momentumScore} />
                      <Mini label="G" v={s.growthScore} />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>PE {s.pe} · ROE {s.roe}%</span>
                      <span>Piotroski {s.piotroski}/9</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 pb-3 border-b border-border/40 last:border-0">
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function RangeRow({ label, f, on, step = 1 }: { label: string; f: NumRange; on: (a: number, b: number) => void; step?: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="num font-medium">{f.min} – {f.max}</span>
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

function Th({ children, onClick, sortKey, k, dir, align = "right" }: { children: React.ReactNode; onClick: () => void; sortKey: SortKey; k: SortKey; dir: "asc" | "desc"; align?: "left" | "right" }) {
  const active = sortKey === k;
  return (
    <th className={cn("font-medium px-3 py-2.5 cursor-pointer select-none hover:text-foreground", align === "left" ? "text-left pl-4" : "text-right", active && "text-primary")} onClick={onClick}>
      {children}{active && <span className="ml-1">{dir === "asc" ? "▲" : "▼"}</span>}
    </th>
  );
}

function ScoreCell({ v, strong }: { v: number; strong?: boolean }) {
  const color = v >= 70 ? "bg-success/15 text-success" : v >= 45 ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive";
  return (
    <td className="px-3 py-2.5 text-right">
      <span className={cn("num text-xs px-1.5 py-0.5 rounded", color, strong && "font-semibold")}>{v}</span>
    </td>
  );
}

function Mini({ label, v }: { label: string; v: number }) {
  const c = v >= 70 ? "text-success" : v >= 45 ? "text-warning" : "text-destructive";
  return (
    <div className="rounded-lg bg-muted/20 p-1.5">
      <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={cn("text-xs font-semibold num mt-0.5", c)}>{v}</div>
    </div>
  );
}
