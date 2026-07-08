import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { stocks, sectors } from "@/lib/mock-data";
import { Delta, SectionHeader, formatINR } from "@/lib/ui-helpers";
import { quotesQuery, toTdStock } from "@/lib/market-queries";
import { Search, LayoutGrid, Table as TableIcon, Bookmark, SlidersHorizontal, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/explorer")({
  component: Explorer,
  head: () => ({
    meta: [
      { title: "Stock Explorer — StockSense AI" },
      { name: "description", content: "Advanced stock screening with 30+ fundamental and technical filters." },
    ],
  }),
});

const savedScreeners = [
  { name: "High Quality Compounders", count: 24, icon: "★" },
  { name: "Turnaround Plays", count: 18 },
  { name: "Dividend Aristocrats", count: 12 },
  { name: "Small Cap Momentum", count: 31 },
];

type Filters = {
  peMin: number; peMax: number;
  roeMin: number;
  mcMin: number;
  revGrowthMin: number;
  divYieldMin: number;
  rsiMin: number; rsiMax: number;
  sector: string;
};

function Explorer() {
  const [view, setView] = useState<"table" | "card">("table");
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Filters>({
    peMin: 0, peMax: 100,
    roeMin: 0,
    mcMin: 0,
    revGrowthMin: -100,
    divYieldMin: 0,
    rsiMin: 0, rsiMax: 100,
    sector: "All",
  });

  const stkQ = useQuery(quotesQuery(stocks.map((s) => toTdStock(s.symbol))));
  const liveMap = new Map((stkQ.data?.quotes ?? []).map((q) => [q.symbol, q]));
  const liveStocks = useMemo(
    () =>
      stocks.map((s) => {
        const q = liveMap.get(toTdStock(s.symbol));
        return q ? { ...s, price: q.price, change: q.change, changePct: q.changePct } : s;
      }),
    [stkQ.data],
  );

  const results = useMemo(() => {
    return liveStocks.filter((s) => {
      if (q && !`${s.symbol} ${s.name}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (s.pe < filters.peMin || s.pe > filters.peMax) return false;
      if (s.roe < filters.roeMin) return false;
      if (s.revGrowth < filters.revGrowthMin) return false;
      if (s.divYield < filters.divYieldMin) return false;
      if (s.rsi < filters.rsiMin || s.rsi > filters.rsiMax) return false;
      if (filters.sector !== "All" && s.sector !== filters.sector) return false;
      return true;
    });
  }, [q, filters, liveStocks]);

  return (
    <AppShell>
      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Stock Explorer</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Screen {stocks.length}+ stocks by fundamentals, technicals, and momentum.
            </p>
          </div>
          <button className="h-9 px-3.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-1.5">
            <Bookmark className="h-3.5 w-3.5" /> Save screener
          </button>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Filters sidebar */}
          <aside className="col-span-12 lg:col-span-3 space-y-4">
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Filters</h3>
              </div>

              <div className="space-y-4">
                <FilterGroup label="Sector">
                  <select
                    value={filters.sector}
                    onChange={(e) => setFilters({ ...filters, sector: e.target.value })}
                    className="w-full h-9 rounded-lg bg-muted/40 border border-border/60 text-xs px-3 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option>All</option>
                    {sectors.map((s) => (
                      <option key={s.name}>{s.name}</option>
                    ))}
                  </select>
                </FilterGroup>

                <RangeFilter
                  label="PE Ratio"
                  min={0} max={100}
                  low={filters.peMin} high={filters.peMax}
                  onChange={(low, high) => setFilters({ ...filters, peMin: low, peMax: high })}
                />
                <SliderFilter
                  label="ROE min" suffix="%" min={0} max={50}
                  value={filters.roeMin}
                  onChange={(v) => setFilters({ ...filters, roeMin: v })}
                />
                <SliderFilter
                  label="Revenue Growth min" suffix="%" min={-20} max={50}
                  value={filters.revGrowthMin}
                  onChange={(v) => setFilters({ ...filters, revGrowthMin: v })}
                />
                <SliderFilter
                  label="Dividend Yield min" suffix="%" min={0} max={5} step={0.1}
                  value={filters.divYieldMin}
                  onChange={(v) => setFilters({ ...filters, divYieldMin: v })}
                />
                <RangeFilter
                  label="RSI" min={0} max={100}
                  low={filters.rsiMin} high={filters.rsiMax}
                  onChange={(low, high) => setFilters({ ...filters, rsiMin: low, rsiMax: high })}
                />
              </div>

              <button
                onClick={() =>
                  setFilters({ peMin: 0, peMax: 100, roeMin: 0, mcMin: 0, revGrowthMin: -100, divYieldMin: 0, rsiMin: 0, rsiMax: 100, sector: "All" })
                }
                className="mt-4 w-full text-xs text-muted-foreground hover:text-foreground py-2 rounded-lg border border-border/60 hover:bg-muted/30 transition"
              >
                Reset all
              </button>
            </div>

            <div className="glass rounded-2xl p-4">
              <SectionHeader title="Saved Screeners" />
              <div className="space-y-1">
                {savedScreeners.map((s) => (
                  <button
                    key={s.name}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition text-left"
                  >
                    <div className="flex items-center gap-2">
                      {s.icon && <Star className="h-3 w-3 text-warning fill-warning" />}
                      <span className="text-xs font-medium">{s.name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground num">{s.count}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Results */}
          <div className="col-span-12 lg:col-span-9 space-y-4">
            <div className="glass rounded-2xl p-3 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by symbol, name, ISIN..."
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-muted/30 border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div className="flex rounded-lg bg-muted/30 border border-border/60 p-0.5">
                <button
                  onClick={() => setView("table")}
                  className={cn(
                    "px-2.5 h-8 rounded-md text-xs font-medium flex items-center gap-1.5 transition",
                    view === "table" ? "bg-primary/15 text-primary" : "text-muted-foreground",
                  )}
                >
                  <TableIcon className="h-3.5 w-3.5" /> Table
                </button>
                <button
                  onClick={() => setView("card")}
                  className={cn(
                    "px-2.5 h-8 rounded-md text-xs font-medium flex items-center gap-1.5 transition",
                    view === "card" ? "bg-primary/15 text-primary" : "text-muted-foreground",
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Cards
                </button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              <span className="text-foreground font-medium">{results.length}</span> stocks match your filters
            </div>

            {view === "table" ? (
              <div className="glass rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[11px] text-muted-foreground uppercase tracking-wider bg-muted/20">
                        <th className="text-left font-medium px-4 py-2.5">Company</th>
                        <th className="text-right font-medium px-3 py-2.5">Price</th>
                        <th className="text-right font-medium px-3 py-2.5">Chg</th>
                        <th className="text-right font-medium px-3 py-2.5">M.Cap</th>
                        <th className="text-right font-medium px-3 py-2.5">PE</th>
                        <th className="text-right font-medium px-3 py-2.5">ROE</th>
                        <th className="text-right font-medium px-3 py-2.5">ROCE</th>
                        <th className="text-right font-medium px-3 py-2.5">Rev Δ</th>
                        <th className="text-right font-medium px-3 py-2.5">D/E</th>
                        <th className="text-right font-medium px-3 py-2.5">Div%</th>
                        <th className="text-right font-medium px-3 py-2.5">RSI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((s) => (
                        <tr key={s.symbol} className="border-t border-border/40 hover:bg-muted/20 transition">
                          <td className="px-4 py-3">
                            <Link to="/stock/$symbol" params={{ symbol: s.symbol }} className="block">
                              <div className="text-sm font-medium">{s.symbol}</div>
                              <div className="text-[11px] text-muted-foreground">{s.sector}</div>
                            </Link>
                          </td>
                          <td className="px-3 py-3 text-right num">{formatINR(s.price)}</td>
                          <td className="px-3 py-3 text-right"><Delta value={s.changePct} /></td>
                          <td className="px-3 py-3 text-right num text-muted-foreground">
                            {formatINR(s.marketCap * 1e7, true)}
                          </td>
                          <td className="px-3 py-3 text-right num">{s.pe}</td>
                          <td className="px-3 py-3 text-right num">{s.roe}%</td>
                          <td className="px-3 py-3 text-right num">{s.roce}%</td>
                          <td className={cn("px-3 py-3 text-right num", s.revGrowth >= 0 ? "text-success" : "text-destructive")}>
                            {s.revGrowth > 0 ? "+" : ""}{s.revGrowth}%
                          </td>
                          <td className="px-3 py-3 text-right num text-muted-foreground">{s.debtEquity}</td>
                          <td className="px-3 py-3 text-right num text-muted-foreground">{s.divYield}%</td>
                          <td className="px-3 py-3 text-right">
                            <span className={cn(
                              "text-xs font-medium px-1.5 py-0.5 rounded num",
                              s.rsi > 70 ? "bg-destructive/15 text-destructive" :
                              s.rsi < 30 ? "bg-success/15 text-success" :
                              "text-muted-foreground",
                            )}>{s.rsi}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.map((s) => (
                  <Link
                    key={s.symbol}
                    to="/stock/$symbol"
                    params={{ symbol: s.symbol }}
                    className="glass rounded-2xl p-5 hover:-translate-y-0.5 transition-all block"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{s.symbol}</h3>
                          <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">{s.sector}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.name}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold num">{formatINR(s.price)}</div>
                        <Delta value={s.changePct} className="text-xs" />
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                      <MiniMetric label="PE" value={s.pe.toString()} />
                      <MiniMetric label="ROE" value={`${s.roe}%`} />
                      <MiniMetric label="Rev Δ" value={`${s.revGrowth > 0 ? "+" : ""}${s.revGrowth}%`} positive={s.revGrowth >= 0} />
                      <MiniMetric label="RSI" value={s.rsi.toString()} />
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

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function SliderFilter({
  label, min, max, step = 1, value, suffix, onChange,
}: {
  label: string; min: number; max: number; step?: number; value: number; suffix?: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="num font-medium">{value}{suffix}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full accent-primary"
      />
    </div>
  );
}

function RangeFilter({
  label, min, max, low, high, onChange,
}: {
  label: string; min: number; max: number; low: number; high: number; onChange: (low: number, high: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="num font-medium">{low} – {high}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number" min={min} max={max} value={low}
          onChange={(e) => onChange(+e.target.value, high)}
          className="h-8 rounded-md bg-muted/40 border border-border/60 text-xs px-2 num focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
        <input
          type="number" min={min} max={max} value={high}
          onChange={(e) => onChange(low, +e.target.value)}
          className="h-8 rounded-md bg-muted/40 border border-border/60 text-xs px-2 num focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
      </div>
    </div>
  );
}

function MiniMetric({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-lg bg-muted/20 p-2">
      <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={cn("text-xs font-semibold num mt-0.5", positive === true && "text-success", positive === false && "text-destructive")}>
        {value}
      </div>
    </div>
  );
}
