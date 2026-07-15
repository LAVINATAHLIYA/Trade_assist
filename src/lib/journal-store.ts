// Journal store — localStorage-backed for this pass. The Supabase schema
// (trades / strategies / trade_reviews / trade_attachments) is already
// provisioned; swap this store for server functions once auth is wired.
import { useSyncExternalStore } from "react";

export type Direction = "long" | "short" | "non_directional";
export type Instrument = "equity" | "equity_mtf" | "futures" | "options";
export type Duration = "intraday" | "swing" | "positional_weekly" | "positional_monthly";
export type Status = "open" | "closed" | "cancelled";
export type Grade = "A+" | "A" | "B" | "C" | "D" | "F";

export type Trade = {
  id: string;
  symbol: string;
  sector?: string;
  direction: Direction;
  instrument: Instrument;
  duration: Duration;
  status: Status;
  quantity: number;
  entry_price: number;
  exit_price?: number | null;
  ltp?: number; // simulated last-traded price for open trades
  stop_loss?: number | null;
  target_price?: number | null;
  entry_time: string; // ISO
  exit_time?: string | null;
  strategy?: string;
  setup?: string;
  timeframe?: string;
  market_trend?: string;
  market_alignment?: string;
  trade_type?: string;
  source?: string;
  rationale?: string;
  risk_amount?: number | null;
  planned_reward?: number | null;
  confidence_before?: number;
  focus_before?: number;
  stress_before?: number;
  energy_before?: number;
  fomo?: boolean;
  revenge?: boolean;
  followed_plan?: boolean;
  emotion_before?: string;
  emotion_after?: string;
  entry_quality?: number;
  exit_quality?: number;
  risk_mgmt_quality?: number;
  execution_quality?: number;
  what_went_well?: string;
  what_went_wrong?: string;
  lessons?: string;
  mistakes?: string[];
  charges?: number;
  grade?: Grade;
};

const KEY = "stocksense.journal.v1";

// ---------- deterministic sample seed (marked as demo) ----------
const SECTORS: Record<string, string> = {
  RELIANCE: "Energy", HDFCBANK: "Banking", TCS: "IT", INFY: "IT",
  ICICIBANK: "Banking", SBIN: "Banking", ITC: "FMCG", BHARTIARTL: "Telecom",
  LT: "Infra", MARUTI: "Auto", ADANIENT: "Conglomerate", TATAMOTORS: "Auto",
  ASIANPAINT: "Paints", SUNPHARMA: "Pharma", HINDUNILVR: "FMCG", AXISBANK: "Banking",
  BAJFINANCE: "NBFC", KOTAKBANK: "Banking", WIPRO: "IT", HCLTECH: "IT",
};
const SYMS = Object.keys(SECTORS);

const STRATS = ["Breakout", "Pullback", "Momentum", "Mean Reversion", "Earnings", "Trendline B/O", "Cup & Handle"];
const SETUPS = ["Resistance Breakout", "Support Breakdown", "Trendline Breakout", "Pullback", "Gap Fill", "Cup and Handle"];
const TFS = ["Daily", "Hourly", "15m", "Weekly"];
const TRENDS = ["Strong uptrend", "Uptrend", "Sideways", "Downtrend"];
const MISTAKES_POOL = [
  "No stop loss", "Moved stop loss", "Oversized position", "Revenge trade",
  "FOMO entry", "Early exit", "Late exit", "Chased breakout",
  "Averaged loser", "Contra-trend trade", "Ignored trading plan",
];
const EMOTIONS = ["Calm", "Confident", "Focused", "Anxious", "Greedy", "FOMO", "Impulsive"];

function hash(s: string) { let h = 7; for (const c of s) h = ((h * 31) + c.charCodeAt(0)) >>> 0; return h; }
function makeRand(seed: number) { let s = seed || 1; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }
function pick<T>(arr: T[], r: () => number) { return arr[Math.floor(r() * arr.length)]; }

function generateSeed(): Trade[] {
  const r = makeRand(20260715);
  const now = Date.now();
  const trades: Trade[] = [];
  for (let i = 0; i < 82; i++) {
    const sym = SYMS[Math.floor(r() * SYMS.length)];
    const entry = +(200 + hash(sym + i) % 3000 + r() * 400).toFixed(2);
    const dir: Direction = r() > 0.28 ? "long" : "short";
    const dayOffset = Math.floor(r() * 140); // last ~4 months
    const entryTime = new Date(now - dayOffset * 86400000 - Math.floor(r() * 6 * 3600000));
    const holdMinutes = Math.floor(r() * (r() > 0.5 ? 8000 : 400)) + 15;
    const isClosed = i > 5; // first ~6 are open
    const winBias = r();
    const move = (winBias > 0.42 ? 1 : -1) * (0.005 + r() * 0.06);
    const exitPrice = +(entry * (1 + (dir === "long" ? move : -move))).toFixed(2);
    const qty = Math.max(1, Math.floor(10 + r() * 90));
    const pnl = isClosed ? +((exitPrice - entry) * qty * (dir === "long" ? 1 : -1)).toFixed(2) : undefined;
    const stop = +(entry * (dir === "long" ? 0.97 : 1.03)).toFixed(2);
    const target = +(entry * (dir === "long" ? 1.06 : 0.94)).toFixed(2);
    const risk = Math.abs(entry - stop) * qty;
    const mistakes = pnl !== undefined && pnl < 0 && r() > 0.5
      ? [pick(MISTAKES_POOL, r()), ...(r() > 0.7 ? [pick(MISTAKES_POOL, r())] : [])] : [];
    const conf = 4 + Math.floor(r() * 6);
    const t: Trade = {
      id: `demo-${i}`,
      symbol: sym,
      sector: SECTORS[sym],
      direction: dir,
      instrument: r() > 0.8 ? "futures" : r() > 0.6 ? "options" : "equity",
      duration: holdMinutes < 360 ? "intraday" : r() > 0.5 ? "swing" : "positional_weekly",
      status: isClosed ? "closed" : "open",
      quantity: qty,
      entry_price: entry,
      exit_price: isClosed ? exitPrice : null,
      ltp: isClosed ? undefined : +(entry * (1 + (r() - 0.45) * 0.05)).toFixed(2),
      stop_loss: stop,
      target_price: target,
      entry_time: entryTime.toISOString(),
      exit_time: isClosed ? new Date(entryTime.getTime() + holdMinutes * 60000).toISOString() : null,
      strategy: pick(STRATS, r()),
      setup: pick(SETUPS, r()),
      timeframe: pick(TFS, r()),
      market_trend: pick(TRENDS, r()),
      market_alignment: r() > 0.3 ? "With trend" : "Contra trend",
      trade_type: r() > 0.5 ? "Momentum breakout" : "Swing",
      source: r() > 0.5 ? "Self study" : "Discretionary adhoc",
      rationale: "Setup confirmed on multiple timeframes. Entered on retest of breakout level.",
      risk_amount: +risk.toFixed(2),
      planned_reward: +(risk * 2.2).toFixed(2),
      confidence_before: conf,
      focus_before: 4 + Math.floor(r() * 6),
      stress_before: Math.floor(r() * 7),
      energy_before: 4 + Math.floor(r() * 6),
      fomo: r() > 0.85,
      revenge: r() > 0.9,
      followed_plan: mistakes.length === 0,
      emotion_before: pick(EMOTIONS, r()),
      emotion_after: pnl !== undefined ? (pnl > 0 ? "Confident" : "Frustrated") : "Focused",
      entry_quality: 5 + Math.floor(r() * 5),
      exit_quality: mistakes.length ? 3 + Math.floor(r() * 4) : 6 + Math.floor(r() * 4),
      risk_mgmt_quality: mistakes.includes("No stop loss") || mistakes.includes("Moved stop loss") ? 3 : 7 + Math.floor(r() * 3),
      execution_quality: 5 + Math.floor(r() * 5),
      mistakes,
      charges: +(qty * entry * 0.0005).toFixed(2),
      grade: !isClosed ? undefined : pnl! > risk * 1.5 ? "A" : pnl! > 0 ? "B" : mistakes.length ? "D" : "C",
    };
    trades.push(t);
  }
  return trades;
}

// ---------- store ----------
let cached: Trade[] | null = null;
const listeners = new Set<() => void>();

function read(): Trade[] {
  if (cached) return cached;
  if (typeof window === "undefined") return (cached = generateSeed());
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return (cached = JSON.parse(raw));
  } catch {}
  cached = generateSeed();
  try { localStorage.setItem(KEY, JSON.stringify(cached)); } catch {}
  return cached;
}

function commit(next: Trade[]) {
  cached = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}

export function useTrades(): Trade[] {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => read(),
    () => generateSeed(), // SSR snapshot
  );
}

export function addTrade(t: Omit<Trade, "id">) {
  const next = [{ ...t, id: crypto.randomUUID() }, ...read()];
  commit(next);
}
export function updateTrade(id: string, patch: Partial<Trade>) {
  commit(read().map((t) => (t.id === id ? { ...t, ...patch } : t)));
}
export function deleteTrade(id: string) { commit(read().filter((t) => t.id !== id)); }
export function resetJournal() { cached = null; try { localStorage.removeItem(KEY); } catch {} listeners.forEach((l) => l()); }

// ---------- computations ----------
export type Metrics = ReturnType<typeof computeMetrics>;

export function pnl(t: Trade): number {
  if (t.status !== "closed" || t.exit_price == null) return 0;
  return (t.exit_price - t.entry_price) * t.quantity * (t.direction === "long" ? 1 : -1) - (t.charges ?? 0);
}
export function unrealized(t: Trade): number {
  if (t.status === "open" && t.ltp != null) {
    return (t.ltp - t.entry_price) * t.quantity * (t.direction === "long" ? 1 : -1);
  }
  return 0;
}
export function rMultiple(t: Trade): number | null {
  if (t.status !== "closed" || !t.risk_amount || t.risk_amount === 0) return null;
  return +(pnl(t) / t.risk_amount).toFixed(2);
}

export function filterByRange(all: Trade[], range: string): Trade[] {
  const now = Date.now();
  const day = 86400000;
  const map: Record<string, number> = {
    today: 1, week: 7, month: 30, "3m": 90, "6m": 180, ytd: -1, "1y": 365, all: -2,
  };
  const v = map[range] ?? -2;
  if (v === -2) return all;
  const cutoff = v === -1
    ? new Date(new Date().getFullYear(), 0, 1).getTime()
    : now - v * day;
  return all.filter((t) => new Date(t.entry_time).getTime() >= cutoff);
}

export function computeMetrics(trades: Trade[]) {
  const closed = trades.filter((t) => t.status === "closed");
  const pnls = closed.map(pnl);
  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p < 0);
  const gross_profit = wins.reduce((s, x) => s + x, 0);
  const gross_loss = losses.reduce((s, x) => s + x, 0);
  const net = gross_profit + gross_loss;
  const charges = closed.reduce((s, t) => s + (t.charges ?? 0), 0);
  const winRate = closed.length ? wins.length / closed.length : 0;
  const avgWin = wins.length ? gross_profit / wins.length : 0;
  const avgLoss = losses.length ? gross_loss / losses.length : 0;
  const pf = gross_loss !== 0 ? Math.abs(gross_profit / gross_loss) : gross_profit > 0 ? Infinity : 0;
  const expectancy = closed.length ? net / closed.length : 0;
  const rr = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;
  // streaks
  const chrono = [...closed].sort((a, b) => new Date(a.exit_time!).getTime() - new Date(b.exit_time!).getTime());
  let cs = 0, ls = 0, maxW = 0, maxL = 0, curW = 0, curL = 0;
  for (const t of chrono) {
    const p = pnl(t);
    if (p >= 0) { curW++; curL = 0; maxW = Math.max(maxW, curW); }
    else { curL++; curW = 0; maxL = Math.max(maxL, curL); }
  }
  cs = curW; ls = curL;
  // drawdown from cumulative
  let cum = 0, peak = 0, dd = 0;
  for (const t of chrono) { cum += pnl(t); peak = Math.max(peak, cum); dd = Math.min(dd, cum - peak); }
  const recovery = dd !== 0 ? Math.abs(net / dd) : 0;
  // sharpe (daily)
  const byDay: Record<string, number> = {};
  for (const t of chrono) {
    const d = new Date(t.exit_time!).toISOString().slice(0, 10);
    byDay[d] = (byDay[d] ?? 0) + pnl(t);
  }
  const daily = Object.values(byDay);
  const mean = daily.length ? daily.reduce((s, x) => s + x, 0) / daily.length : 0;
  const sd = daily.length > 1 ? Math.sqrt(daily.reduce((s, x) => s + (x - mean) ** 2, 0) / (daily.length - 1)) : 0;
  const sharpe = sd ? (mean / sd) * Math.sqrt(252) : 0;
  const holdTimes = closed
    .filter((t) => t.exit_time)
    .map((t) => (new Date(t.exit_time!).getTime() - new Date(t.entry_time).getTime()) / 3600000);
  const avgHold = holdTimes.length ? holdTimes.reduce((s, x) => s + x, 0) / holdTimes.length : 0;
  const best = pnls.length ? Math.max(...pnls) : 0;
  const worst = pnls.length ? Math.min(...pnls) : 0;

  return {
    net, gross_profit, gross_loss, charges,
    net_after_charges: net,
    win_rate: winRate,
    profit_factor: pf,
    expectancy,
    avg_win: avgWin,
    avg_loss: avgLoss,
    rr,
    total: closed.length,
    wins: wins.length,
    losses: losses.length,
    cur_win_streak: cs,
    cur_loss_streak: ls,
    max_win_streak: maxW,
    max_loss_streak: maxL,
    max_drawdown: dd,
    recovery_factor: recovery,
    sharpe,
    avg_hold_hours: avgHold,
    best, worst,
  };
}

export function cumulativeCurve(trades: Trade[]): { date: string; cum: number; daily: number }[] {
  const closed = trades.filter((t) => t.status === "closed" && t.exit_time)
    .sort((a, b) => new Date(a.exit_time!).getTime() - new Date(b.exit_time!).getTime());
  const byDay: Record<string, number> = {};
  for (const t of closed) {
    const d = new Date(t.exit_time!).toISOString().slice(0, 10);
    byDay[d] = (byDay[d] ?? 0) + pnl(t);
  }
  let cum = 0;
  return Object.entries(byDay).map(([date, daily]) => ({ date, daily, cum: (cum += daily) }));
}

export function groupBy<T extends string | number>(trades: Trade[], key: (t: Trade) => T): Map<T, Trade[]> {
  const m = new Map<T, Trade[]>();
  for (const t of trades) {
    const k = key(t);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(t);
  }
  return m;
}

export function mistakeStats(trades: Trade[]) {
  const closed = trades.filter((t) => t.status === "closed");
  const map: Record<string, { count: number; impact: number; losses: number }> = {};
  for (const t of closed) {
    for (const m of t.mistakes ?? []) {
      map[m] ??= { count: 0, impact: 0, losses: 0 };
      map[m].count++;
      const p = pnl(t);
      map[m].impact += p;
      if (p < 0) map[m].losses++;
    }
  }
  return Object.entries(map)
    .map(([mistake, s]) => ({
      mistake,
      count: s.count,
      total_impact: s.impact,
      avg_loss: s.count ? s.impact / s.count : 0,
      loss_rate: s.count ? s.losses / s.count : 0,
    }))
    .sort((a, b) => a.total_impact - b.total_impact);
}

// Simple CSV import (columns: symbol,direction,quantity,entry_price,exit_price,entry_time,exit_time,strategy)
export function parseCsv(text: string): Partial<Trade>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row: any = {};
    headers.forEach((h, i) => (row[h] = cells[i]?.trim()));
    return {
      symbol: row.symbol,
      direction: (row.direction ?? "long").toLowerCase() as Direction,
      quantity: +row.quantity || 0,
      entry_price: +row.entry_price || 0,
      exit_price: row.exit_price ? +row.exit_price : null,
      entry_time: row.entry_time ? new Date(row.entry_time).toISOString() : new Date().toISOString(),
      exit_time: row.exit_time ? new Date(row.exit_time).toISOString() : null,
      strategy: row.strategy,
      status: row.exit_price ? "closed" as const : "open" as const,
      instrument: (row.instrument ?? "equity") as Instrument,
      duration: (row.duration ?? "swing") as Duration,
    };
  });
}
