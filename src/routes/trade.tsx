import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { stocks } from "@/lib/mock-data";
import { Delta, formatINR } from "@/lib/ui-helpers";
import { quotesQuery, timeSeriesQuery, toTdStock } from "@/lib/market-queries";
import {
  Area, AreaChart, Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip,
} from "recharts";
import { Zap, TrendingUp, TrendingDown, Timer, Keyboard, Wifi, WifiOff, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/trade")({
  component: Trade,
  head: () => ({
    meta: [
      { title: "Trading Terminal — StockSense AI" },
      { name: "description", content: "Cuetrading-style order ticket, watchlist, market depth, and hotkey-driven execution." },
    ],
  }),
});

type Side = "BUY" | "SELL";
type OrderType = "MKT" | "LMT" | "SL" | "SL-M";
type Product = "CNC" | "MIS" | "NRML";
type Order = { id: string; ts: number; symbol: string; side: Side; type: OrderType; qty: number; price: number; status: "OPEN" | "FILLED" | "CANCELLED" };

// Deterministic depth generation
function seededDepth(symbol: string, mid: number) {
  let s = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 1) * 17;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const bids = Array.from({ length: 5 }, (_, i) => ({
    price: +(mid - (i + 1) * mid * 0.0008).toFixed(2),
    qty: Math.round(100 + rnd() * 4000),
    orders: 1 + Math.floor(rnd() * 40),
  }));
  const asks = Array.from({ length: 5 }, (_, i) => ({
    price: +(mid + (i + 1) * mid * 0.0008).toFixed(2),
    qty: Math.round(100 + rnd() * 4000),
    orders: 1 + Math.floor(rnd() * 40),
  }));
  return { bids, asks };
}

function Trade() {
  const [watchlist, setWatchlist] = useState<string[]>(["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "MARUTI", "ITC", "LT", "ADANIENT", "SBIN"]);
  const [active, setActive] = useState<string>("RELIANCE");
  const [side, setSide] = useState<Side>("BUY");
  const [orderType, setOrderType] = useState<OrderType>("LMT");
  const [product, setProduct] = useState<Product>("MIS");
  const [qty, setQty] = useState<number>(1);
  const [price, setPrice] = useState<number>(0);
  const [orders, setOrders] = useState<Order[]>([]);

  const activeStock = stocks.find((s) => s.symbol === active)!;

  const quotesQ = useQuery(quotesQuery(watchlist.map(toTdStock)));
  const isLive = (quotesQ.data?.quotes?.length ?? 0) > 0;
  const liveMap = useMemo(() => new Map((quotesQ.data?.quotes ?? []).map((q) => [q.symbol, q])), [quotesQ.data]);

  const activeLive = liveMap.get(toTdStock(active));
  const ltp = activeLive?.price ?? activeStock.price;
  const chgPct = activeLive?.changePct ?? activeStock.changePct;

  useEffect(() => { setPrice(+ltp.toFixed(2)); }, [active, ltp]);

  const depth = useMemo(() => seededDepth(active, ltp), [active, ltp]);

  const seriesQ = useQuery(timeSeriesQuery(toTdStock(active), "5min", 78));
  const chart = useMemo(() => {
    const bars = seriesQ.data?.bars ?? [];
    if (bars.length > 0) return bars.map((b, i) => ({ i, p: b.close, v: b.volume }));
    // Synthetic intraday, deterministic
    let s = active.split("").reduce((a, c) => a + c.charCodeAt(0), 1) * 11;
    const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const arr: Array<{ i: number; p: number; v: number }> = [];
    let v = ltp * 0.995;
    for (let i = 0; i < 78; i++) {
      v = v * (1 + (Math.sin(i * 0.2) * 0.001 + (r() - 0.5) * 0.002));
      arr.push({ i, p: +v.toFixed(2), v: Math.round(500 + r() * 5000) });
    }
    arr[arr.length - 1].p = ltp;
    return arr;
  }, [seriesQ.data, ltp, active]);

  const placeOrder = () => {
    const o: Order = {
      id: `ord-${Date.now()}`,
      ts: Date.now(),
      symbol: active,
      side, type: orderType, qty,
      price: orderType === "MKT" ? ltp : price,
      status: orderType === "MKT" ? "FILLED" : "OPEN",
    };
    setOrders((prev) => [o, ...prev]);
  };

  // Hotkeys: B/S = side, M/L = market/limit, +/- = qty, Enter = place
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === "b" || e.key === "B") setSide("BUY");
      else if (e.key === "s" || e.key === "S") setSide("SELL");
      else if (e.key === "m" || e.key === "M") setOrderType("MKT");
      else if (e.key === "l" || e.key === "L") setOrderType("LMT");
      else if (e.key === "+") setQty((q) => q + 1);
      else if (e.key === "-") setQty((q) => Math.max(1, q - 1));
      else if (e.key === "Enter") placeOrder();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const totalValue = qty * (orderType === "MKT" ? ltp : price);
  const marginReq = totalValue / (product === "MIS" ? 5 : 1);

  return (
    <AppShell>
      <div className="p-4 max-w-[1800px] mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">Trading Terminal</h1>
            <span className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider border text-[10px]",
              isLive ? "bg-success/10 text-success border-success/30" : "bg-muted/40 text-muted-foreground border-border",
            )}>
              {isLive ? <Wifi className="h-2.5 w-2.5" /> : <WifiOff className="h-2.5 w-2.5" />}
              {isLive ? "Live" : "Sample"}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <Keyboard className="h-3.5 w-3.5" />
            <kbd className="px-1.5 py-0.5 rounded bg-muted/40 border border-border/60 font-mono">B</kbd> Buy
            <kbd className="px-1.5 py-0.5 rounded bg-muted/40 border border-border/60 font-mono">S</kbd> Sell
            <kbd className="px-1.5 py-0.5 rounded bg-muted/40 border border-border/60 font-mono">M/L</kbd> Mkt/Lmt
            <kbd className="px-1.5 py-0.5 rounded bg-muted/40 border border-border/60 font-mono">+/-</kbd> Qty
            <kbd className="px-1.5 py-0.5 rounded bg-muted/40 border border-border/60 font-mono">⏎</kbd> Place
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3">
          {/* Watchlist */}
          <aside className="col-span-12 lg:col-span-3 glass rounded-2xl overflow-hidden flex flex-col max-h-[calc(100vh-120px)]">
            <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Watchlist</div>
              <span className="text-[10px] text-muted-foreground num">{watchlist.length}</span>
            </div>
            <div className="overflow-y-auto flex-1">
              {watchlist.map((sym) => {
                const st = stocks.find((s) => s.symbol === sym);
                if (!st) return null;
                const live = liveMap.get(toTdStock(sym));
                const price = live?.price ?? st.price;
                const cp = live?.changePct ?? st.changePct;
                return (
                  <button
                    key={sym}
                    onClick={() => setActive(sym)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-2.5 text-left border-l-2 transition group",
                      active === sym ? "bg-primary/10 border-l-primary" : "border-l-transparent hover:bg-muted/20",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{sym}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{st.sector}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs num font-medium">{formatINR(price)}</div>
                      <Delta value={cp} className="text-[10px]" />
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setWatchlist((w) => w.filter((x) => x !== sym)); }}
                      className="ml-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    ><X className="h-3 w-3" /></button>
                  </button>
                );
              })}
            </div>
            <div className="p-3 border-t border-border/40">
              <input
                placeholder="Add symbol…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = (e.target as HTMLInputElement).value.toUpperCase().trim();
                    if (val && stocks.find((s) => s.symbol === val) && !watchlist.includes(val)) {
                      setWatchlist((w) => [...w, val]);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }
                }}
                className="w-full h-8 rounded-md bg-muted/40 border border-border/60 text-xs px-3 focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
          </aside>

          {/* Center: chart + depth */}
          <div className="col-span-12 lg:col-span-6 space-y-3">
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-semibold">{active}</div>
                    <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">NSE</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">{activeStock.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-semibold num">{formatINR(ltp)}</div>
                  <Delta value={chgPct} className="text-sm" />
                </div>
              </div>
              <div className="h-48">
                <ResponsiveContainer>
                  <AreaChart data={chart}>
                    <defs>
                      <linearGradient id="tg" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.74 0.17 155)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="oklch(0.74 0.17 155)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="i" hide />
                    <YAxis domain={["dataMin", "dataMax"]} hide />
                    <Tooltip contentStyle={{ background: "oklch(0.2 0.014 240)", border: "1px solid oklch(0.3 0.015 240 / 0.6)", borderRadius: 8, fontSize: 11 }} />
                    <Area type="monotone" dataKey="p" stroke="oklch(0.74 0.17 155)" strokeWidth={1.5} fill="url(#tg)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="h-14 mt-1">
                <ResponsiveContainer>
                  <BarChart data={chart}>
                    <XAxis dataKey="i" hide />
                    <YAxis hide />
                    <Bar dataKey="v" fill="oklch(0.32 0.02 240)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Market depth (level 2) */}
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Market Depth · Level 2</div>
                <div className="text-[10px] text-muted-foreground">Best 5 bids / asks</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <DepthTable rows={depth.bids} side="bid" />
                <DepthTable rows={depth.asks} side="ask" />
              </div>
              <div className="mt-3 pt-3 border-t border-border/40 grid grid-cols-3 text-[11px] text-center">
                <div><div className="text-muted-foreground">Total Bid Qty</div><div className="num text-success font-medium">{depth.bids.reduce((a, b) => a + b.qty, 0).toLocaleString("en-IN")}</div></div>
                <div><div className="text-muted-foreground">Spread</div><div className="num font-medium">{(depth.asks[0].price - depth.bids[0].price).toFixed(2)}</div></div>
                <div><div className="text-muted-foreground">Total Ask Qty</div><div className="num text-destructive font-medium">{depth.asks.reduce((a, b) => a + b.qty, 0).toLocaleString("en-IN")}</div></div>
              </div>
            </div>

            {/* Orders */}
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold flex items-center gap-2"><Timer className="h-4 w-4 text-primary" /> Orders</div>
                <div className="text-[10px] text-muted-foreground">{orders.length} today</div>
              </div>
              {orders.length === 0 ? (
                <div className="text-xs text-muted-foreground py-6 text-center">No orders yet. Use the ticket to place one.</div>
              ) : (
                <div className="max-h-52 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      <tr><th className="text-left py-1.5">Time</th><th className="text-left">Sym</th><th className="text-left">Side</th><th className="text-left">Type</th><th className="text-right">Qty</th><th className="text-right">Price</th><th className="text-right">Status</th><th></th></tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id} className="border-t border-border/30">
                          <td className="py-1.5 num text-muted-foreground">{new Date(o.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</td>
                          <td className="font-medium">{o.symbol}</td>
                          <td className={o.side === "BUY" ? "text-success font-medium" : "text-destructive font-medium"}>{o.side}</td>
                          <td className="text-muted-foreground">{o.type}</td>
                          <td className="text-right num">{o.qty}</td>
                          <td className="text-right num">{formatINR(o.price)}</td>
                          <td className="text-right"><span className={cn("text-[10px] px-1.5 py-0.5 rounded", o.status === "FILLED" ? "bg-success/15 text-success" : o.status === "OPEN" ? "bg-warning/15 text-warning" : "bg-muted/40 text-muted-foreground")}>{o.status}</span></td>
                          <td className="text-right">
                            {o.status === "OPEN" && (
                              <button onClick={() => setOrders((p) => p.map((x) => x.id === o.id ? { ...x, status: "CANCELLED" } : x))} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Order ticket */}
          <aside className="col-span-12 lg:col-span-3 glass rounded-2xl p-4 h-fit sticky top-16">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">Order Ticket</div>

            <div className="grid grid-cols-2 gap-1 mb-3">
              <button onClick={() => setSide("BUY")} className={cn("h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition", side === "BUY" ? "bg-success text-background" : "bg-muted/40 text-muted-foreground hover:text-foreground")}>
                <TrendingUp className="h-4 w-4" /> BUY
              </button>
              <button onClick={() => setSide("SELL")} className={cn("h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition", side === "SELL" ? "bg-destructive text-background" : "bg-muted/40 text-muted-foreground hover:text-foreground")}>
                <TrendingDown className="h-4 w-4" /> SELL
              </button>
            </div>

            <div className="mb-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Symbol</div>
              <div className="h-9 rounded-md bg-muted/40 border border-border/60 px-3 flex items-center justify-between">
                <span className="text-sm font-medium">{active}</span>
                <span className="text-xs num text-muted-foreground">{formatINR(ltp)}</span>
              </div>
            </div>

            <div className="mb-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Product</div>
              <div className="flex rounded-md bg-muted/30 border border-border/60 p-0.5">
                {(["MIS", "CNC", "NRML"] as Product[]).map((p) => (
                  <button key={p} onClick={() => setProduct(p)} className={cn("flex-1 h-7 rounded text-[11px] font-medium", product === p ? "bg-primary/15 text-primary" : "text-muted-foreground")}>{p}</button>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Order type</div>
              <div className="flex rounded-md bg-muted/30 border border-border/60 p-0.5">
                {(["MKT", "LMT", "SL", "SL-M"] as OrderType[]).map((t) => (
                  <button key={t} onClick={() => setOrderType(t)} className={cn("flex-1 h-7 rounded text-[11px] font-medium", orderType === t ? "bg-primary/15 text-primary" : "text-muted-foreground")}>{t}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Qty</div>
                <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, +e.target.value))}
                  className="w-full h-9 rounded-md bg-muted/40 border border-border/60 text-sm px-3 num focus:outline-none focus:ring-1 focus:ring-primary/40" />
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Price</div>
                <input type="number" step={0.05} value={price} disabled={orderType === "MKT"} onChange={(e) => setPrice(+e.target.value)}
                  className="w-full h-9 rounded-md bg-muted/40 border border-border/60 text-sm px-3 num focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-40" />
              </div>
            </div>

            <div className="rounded-lg bg-muted/20 p-3 mb-3 space-y-1.5 text-[11px]">
              <div className="flex justify-between"><span className="text-muted-foreground">Value</span><span className="num font-medium">{formatINR(totalValue)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Margin ({product})</span><span className="num font-medium">{formatINR(marginReq)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Charges (est)</span><span className="num text-muted-foreground">{formatINR(totalValue * 0.0003 + 20)}</span></div>
            </div>

            <button onClick={placeOrder}
              className={cn("w-full h-11 rounded-lg text-sm font-semibold transition",
                side === "BUY" ? "bg-success text-background hover:opacity-90" : "bg-destructive text-background hover:opacity-90")}>
              {side} {active} · {qty} @ {orderType === "MKT" ? "MKT" : formatINR(price)}
            </button>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function DepthTable({ rows, side }: { rows: Array<{ price: number; qty: number; orders: number }>; side: "bid" | "ask" }) {
  const maxQty = Math.max(...rows.map((r) => r.qty));
  const c = side === "bid" ? "success" : "destructive";
  return (
    <div>
      <div className={cn("text-[10px] uppercase tracking-widest font-semibold mb-1.5", side === "bid" ? "text-success" : "text-destructive")}>
        {side === "bid" ? "Bids" : "Asks"}
      </div>
      <div className="space-y-0.5">
        {rows.map((r, i) => (
          <div key={i} className="relative flex items-center justify-between text-[11px] py-1 px-2 rounded">
            <div className={cn("absolute inset-y-0 rounded", side === "bid" ? "right-0 bg-success/10" : "left-0 bg-destructive/10")}
              style={{ width: `${(r.qty / maxQty) * 100}%` }} />
            <div className="relative num font-medium" style={{ color: side === "bid" ? "oklch(0.74 0.17 155)" : "oklch(0.65 0.22 22)" }}>{r.price}</div>
            <div className="relative num text-muted-foreground">{r.qty.toLocaleString("en-IN")}</div>
            <div className="relative num text-muted-foreground text-[10px]">{r.orders}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
