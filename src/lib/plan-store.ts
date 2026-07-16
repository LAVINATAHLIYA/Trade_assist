// CueTrade-style Daily Plan store — pre/post market notes, planned trades,
// trading rules, and trade-builder strategies. localStorage-backed for now.
import { useSyncExternalStore } from "react";

export type PlannedTrade = {
  id: string;
  symbol: string;
  identifier?: string;
  strategy: string;
  direction: "Long" | "Short" | "Neutral" | "Custom";
  cost_of_trade: number;
  max_risk: number;
  tags: string[];
  notes?: string;
};

export type TradingRule = {
  id: string;
  category: "Position Sizing" | "Risk" | "Entry" | "Exit" | "Mindset" | "Custom";
  rule: string;
  target?: number; // optional numeric threshold (e.g. max risk ₹)
  enabled: boolean;
  auto: boolean; // automatic vs manual check
};

export type OptionLeg = {
  id: string;
  action: "Buy" | "Sell";
  quantity: number;
  instrument: "Stock" | "Call" | "Put";
  strike?: number;
  expiry?: string;
  price: number;
};

export type BuiltStrategy = {
  id: string;
  symbol: string;
  name: string;
  createdAt: string;
  legs: OptionLeg[];
  ivAssumption?: number;
  targetDate?: string;
  notes?: string;
};

export type DailyPlan = {
  date: string; // YYYY-MM-DD
  preMarketNotes: string;
  postMarketNotes: string;
  plannedTrades: PlannedTrade[];
  ruleChecks: Record<string, boolean>;
  savedAt: string;
};

const K_PLANS = "stocksense.plans.v1";
const K_RULES = "stocksense.rules.v1";
const K_STRATS = "stocksense.strats.v1";

const DEFAULT_RULES: TradingRule[] = [
  { id: "r1", category: "Position Sizing", rule: "Cost of stock trade should be less than", target: 500000, enabled: true, auto: true },
  { id: "r2", category: "Position Sizing", rule: "Cost of option trade should be less than", target: 200000, enabled: true, auto: true },
  { id: "r3", category: "Risk", rule: "Maximum risk of the trade should be less than", target: 5000, enabled: true, auto: true },
  { id: "r4", category: "Risk", rule: "Maximum risk of the account should be less than", target: 25000, enabled: true, auto: true },
  { id: "r5", category: "Entry", rule: "Always place a protective stop", enabled: true, auto: false },
  { id: "r6", category: "Exit", rule: "Know your profit objective. Set a target for every trade.", enabled: true, auto: false },
  { id: "r7", category: "Mindset", rule: "Do not go against the trend", enabled: true, auto: false },
  { id: "r8", category: "Mindset", rule: "Think in terms of probabilities", enabled: true, auto: false },
  { id: "r9", category: "Mindset", rule: "No revenge trading after a loss", enabled: true, auto: false },
];

// ---------------- generic tiny store ----------------
function makeStore<T>(key: string, initial: () => T) {
  let cache: T | null = null;
  const listeners = new Set<() => void>();
  function read(): T {
    if (cache) return cache;
    if (typeof window === "undefined") return (cache = initial());
    try {
      const raw = localStorage.getItem(key);
      if (raw) return (cache = JSON.parse(raw));
    } catch {}
    cache = initial();
    try { localStorage.setItem(key, JSON.stringify(cache)); } catch {}
    return cache;
  }
  function commit(next: T) {
    cache = next;
    try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
    listeners.forEach((l) => l());
  }
  function use(): T {
    return useSyncExternalStore(
      (l) => { listeners.add(l); return () => listeners.delete(l); },
      () => read(),
      () => initial(),
    );
  }
  return { read, commit, use };
}

// plans keyed by date
const plansStore = makeStore<Record<string, DailyPlan>>(K_PLANS, () => ({}));
const rulesStore = makeStore<TradingRule[]>(K_RULES, () => DEFAULT_RULES);
const stratsStore = makeStore<BuiltStrategy[]>(K_STRATS, () => []);

export function usePlans() { return plansStore.use(); }
export function useRules() { return rulesStore.use(); }
export function useStrategies() { return stratsStore.use(); }

export function todayKey() { return new Date().toISOString().slice(0, 10); }

export function getPlan(date: string): DailyPlan {
  const all = plansStore.read();
  return all[date] ?? {
    date, preMarketNotes: "", postMarketNotes: "",
    plannedTrades: [], ruleChecks: {}, savedAt: "",
  };
}

export function savePlan(plan: DailyPlan) {
  const next = { ...plansStore.read(), [plan.date]: { ...plan, savedAt: new Date().toISOString() } };
  plansStore.commit(next);
}

export function deletePlan(date: string) {
  const next = { ...plansStore.read() };
  delete next[date];
  plansStore.commit(next);
}

export function upsertRule(rule: TradingRule) {
  const arr = rulesStore.read();
  const idx = arr.findIndex((r) => r.id === rule.id);
  const next = idx >= 0 ? arr.map((r) => (r.id === rule.id ? rule : r)) : [...arr, rule];
  rulesStore.commit(next);
}
export function deleteRule(id: string) {
  rulesStore.commit(rulesStore.read().filter((r) => r.id !== id));
}
export function toggleRule(id: string) {
  rulesStore.commit(rulesStore.read().map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
}

export function addStrategy(s: Omit<BuiltStrategy, "id" | "createdAt">) {
  stratsStore.commit([{ ...s, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...stratsStore.read()]);
}
export function deleteStrategy(id: string) {
  stratsStore.commit(stratsStore.read().filter((s) => s.id !== id));
}

// Compute payoff of a combined stock/option strategy at expiration
export function payoffAt(legs: OptionLeg[], spot: number): number {
  let pnl = 0;
  for (const l of legs) {
    const sign = l.action === "Buy" ? 1 : -1;
    let intrinsic = 0;
    if (l.instrument === "Stock") intrinsic = spot - l.price;
    else if (l.instrument === "Call") intrinsic = Math.max(0, spot - (l.strike ?? 0)) - l.price;
    else if (l.instrument === "Put") intrinsic = Math.max(0, (l.strike ?? 0) - spot) - l.price;
    pnl += sign * intrinsic * l.quantity;
  }
  return pnl;
}

export function payoffCurve(legs: OptionLeg[], center: number, spread = 0.2, points = 41) {
  const lo = center * (1 - spread);
  const hi = center * (1 + spread);
  const step = (hi - lo) / (points - 1);
  return Array.from({ length: points }, (_, i) => {
    const s = lo + i * step;
    return { spot: s, pnl: payoffAt(legs, s) };
  });
}
