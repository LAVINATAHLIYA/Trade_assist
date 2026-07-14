// Extended screener dataset: fundamentals + technicals + factor scores + signals.
// Fully deterministic (per-symbol PRNG) so SSR/CSR values match exactly.
import { stocks, type Stock } from "@/lib/mock-data";

const makeRand = (seed: number) => {
  let s = seed || 1;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};
const hashStr = (str: string) =>
  str.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 11);
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

export type SignalKind =
  | "momentum"
  | "volume-anomaly"
  | "relative-strength"
  | "breakout"
  | "breakdown"
  | "quality"
  | "growth"
  | "value"
  | "dividend"
  | "fno"
  | "event"
  | "ai-pick";

export type RiskLevel = "low" | "medium" | "high";

export type Signal = {
  kind: SignalKind;
  label: string;
  strength: number;      // 0-100
  probability: number;   // 0-100 confidence
  detectedAt: string;    // deterministic timestamp
  risk: RiskLevel;
  note: string;
};

export type MarketCapCategory = "Mega" | "Large" | "Mid" | "Small" | "Micro";

export type ExtStock = Stock & {
  // Company / classification
  exchange: "NSE" | "BSE";
  industry: string;
  mcapCategory: MarketCapCategory;
  indexMembership: string[];
  fnoEligible: boolean;
  // Price / returns
  open: number;
  prevClose: number;
  dayHigh: number;
  dayLow: number;
  wk52High: number;
  wk52Low: number;
  from52High: number;
  from52Low: number;
  ret1w: number;
  ret1m: number;
  ret3m: number;
  ret6m: number;
  ret1y: number;
  cagr3y: number;
  cagr5y: number;
  // Valuation
  industryPe: number;
  forwardPe: number;
  pb: number;
  ps: number;
  peg: number;
  evEbitda: number;
  evSales: number;
  pcf: number;
  earningsYield: number;
  fcfYield: number;
  // Growth
  revGrowth3y: number;
  revGrowth5y: number;
  profitGrowth: number;
  profitGrowth3y: number;
  epsGrowth: number;
  epsGrowth3y: number;
  ebitdaGrowth: number;
  // Profitability
  roa: number;
  grossMargin: number;
  ebitdaMargin: number;
  opMargin: number;
  netMargin: number;
  fcf: number;
  fcfMargin: number;
  assetTurnover: number;
  piotroski: number;
  altmanZ: number;
  // Balance sheet
  totalDebt: number;
  netDebt: number;
  currentRatio: number;
  quickRatio: number;
  interestCover: number;
  debtEbitda: number;
  cash: number;
  workingCap: number;
  // Ownership
  promoterHold: number;
  promoterChange: number;
  promoterPledge: number;
  fiiHold: number;
  fiiChange: number;
  diiHold: number;
  diiChange: number;
  publicHold: number;
  divPayout: number;
  // Volume / liquidity
  avgVol5: number;
  avgVol20: number;
  avgVol50: number;
  volRatio: number;
  relVolume: number;
  deliveryPct: number;
  volSpike: number;
  turnover: number;
  // Trend & MAs
  sma20: number;
  sma50: number;
  sma100: number;
  sma200: number;
  ema9: number;
  ema20: number;
  ema50: number;
  goldenCross: boolean;
  deathCross: boolean;
  // Technicals
  macd: number;
  macdSignal: number;
  macdCross: "bull" | "bear" | "none";
  adx: number;
  atr: number;
  atrPct: number;
  stochRsi: number;
  cci: number;
  mfi: number;
  williamsR: number;
  bbPosition: number;   // 0-100 within bands
  bbWidth: number;
  // Patterns
  patterns: string[];
  // Relative strength & scores
  rsVsNifty: number;
  rsVsSector: number;
  momentumScore: number;
  technicalScore: number;
  fundamentalScore: number;
  qualityScore: number;
  growthScore: number;
  valueScore: number;
  riskScore: number;
  aiScore: number;
  compositeScore: number;
  // Risk
  histVol: number;
  beta: number;
  maxDrawdown: number;
  sharpe: number;
  sortino: number;
  var95: number;
  // F&O
  futOi: number;
  oiChange: number;
  oiInterpretation: "long-buildup" | "short-buildup" | "short-covering" | "long-unwinding" | "neutral";
  pcr: number;
  maxPain: number;
  iv: number;
  ivPercentile: number;
  ivRank: number;
  // Events
  upcomingEarnings: string | null;
  earningsSurprise: number;
  eventFlags: string[];
  // Aggregated signals
  signals: Signal[];
  signalStrength: number;
  primarySignal: SignalKind;
  risk: RiskLevel;
};

const INDUSTRIES: Record<string, string> = {
  Energy: "Oil & Gas Refining",
  IT: "IT Services",
  Financials: "Banking",
  Telecom: "Wireless Telecom",
  Consumer: "FMCG",
  Industrials: "Heavy Engineering",
  Materials: "Paints & Coatings",
  Auto: "Automobiles",
  Pharma: "Pharmaceuticals",
  Conglomerate: "Diversified",
};
const PATTERNS_POOL = [
  "Cup & Handle", "Double Bottom", "Bullish Engulfing", "Hammer",
  "Inside Bar", "Flag Breakout", "Triangle Breakout", "Doji",
  "Head & Shoulders", "Double Top", "Gap Up", "Gap Down",
];
const EVENTS_POOL = ["Earnings", "Dividend", "Bulk Deal", "Insider Buy", "Bonus", "Split"];

const catForMcap = (mc: number): MarketCapCategory => {
  if (mc > 200000) return "Mega";
  if (mc > 50000) return "Large";
  if (mc > 15000) return "Mid";
  if (mc > 3000) return "Small";
  return "Micro";
};

function buildSignals(s: ExtStock, r: () => number): Signal[] {
  const out: Signal[] = [];
  const ts = "2025-07-14T09:15:00Z";
  const pushIf = (cond: boolean, sig: Signal) => cond && out.push(sig);
  pushIf(s.momentumScore > 70 && s.ret1m > 8, {
    kind: "momentum", label: "Strong momentum",
    strength: clamp(s.momentumScore), probability: clamp(60 + s.ret1m),
    detectedAt: ts, risk: s.beta > 1.3 ? "high" : "medium",
    note: `+${s.ret1m}% in 30d with RS ${s.rsVsNifty > 0 ? "+" : ""}${s.rsVsNifty}`,
  });
  pushIf(s.volRatio > 2, {
    kind: "volume-anomaly", label: `Volume ${s.volRatio.toFixed(1)}× avg`,
    strength: clamp(50 + s.volRatio * 10), probability: clamp(60 + s.volRatio * 8),
    detectedAt: ts, risk: "medium",
    note: `Delivery ${s.deliveryPct}% · turnover ₹${(s.turnover).toFixed(0)}Cr`,
  });
  pushIf(s.rsVsNifty > 8, {
    kind: "relative-strength", label: "Leading Nifty",
    strength: clamp(50 + s.rsVsNifty), probability: clamp(55 + s.rsVsNifty * 0.8),
    detectedAt: ts, risk: "low", note: `+${s.rsVsNifty}% vs Nifty 3m`,
  });
  pushIf(s.from52High > -3 && s.volRatio > 1.4, {
    kind: "breakout", label: "52w breakout setup",
    strength: clamp(70 + s.volRatio * 5), probability: 72,
    detectedAt: ts, risk: "medium",
    note: `${Math.abs(s.from52High).toFixed(1)}% from 52w high`,
  });
  pushIf(s.from52High < -25 && s.rsi < 35, {
    kind: "breakdown", label: "Weak trend",
    strength: clamp(-s.from52High), probability: 68,
    detectedAt: ts, risk: "high", note: `RSI ${s.rsi} · ${s.from52High}% off high`,
  });
  pushIf(s.qualityScore > 75 && s.debtEquity < 0.5, {
    kind: "quality", label: "Quality compounder",
    strength: s.qualityScore, probability: 78,
    detectedAt: ts, risk: "low",
    note: `ROCE ${s.roce}% · D/E ${s.debtEquity}`,
  });
  pushIf(s.growthScore > 75, {
    kind: "growth", label: "Hyper growth",
    strength: s.growthScore, probability: 70, detectedAt: ts, risk: "medium",
    note: `Rev ${s.revGrowth}% · EPS ${s.epsGrowth}%`,
  });
  pushIf(s.valueScore > 70, {
    kind: "value", label: "Undervalued",
    strength: s.valueScore, probability: 65, detectedAt: ts, risk: "low",
    note: `PE ${s.pe} vs ind ${s.industryPe}`,
  });
  pushIf(s.divYield > 2.5, {
    kind: "dividend", label: "Dividend play",
    strength: clamp(50 + s.divYield * 8), probability: 74,
    detectedAt: ts, risk: "low", note: `Yield ${s.divYield}% · payout ${s.divPayout}%`,
  });
  pushIf(s.fnoEligible && Math.abs(s.oiChange) > 12, {
    kind: "fno", label: s.oiInterpretation.replace("-", " "),
    strength: clamp(40 + Math.abs(s.oiChange) * 2),
    probability: 66, detectedAt: ts, risk: "high",
    note: `OI ${s.oiChange > 0 ? "+" : ""}${s.oiChange}% · PCR ${s.pcr}`,
  });
  pushIf(s.eventFlags.length > 0, {
    kind: "event", label: s.eventFlags[0],
    strength: 60, probability: 62, detectedAt: ts, risk: "medium",
    note: s.eventFlags.join(" · "),
  });
  pushIf(s.aiScore > 78, {
    kind: "ai-pick", label: "AI top pick",
    strength: s.aiScore, probability: clamp(60 + s.aiScore * 0.3),
    detectedAt: ts, risk: r() > 0.7 ? "high" : "medium",
    note: `Composite ${s.compositeScore} · risk ${s.riskScore}`,
  });
  return out;
}

export const extStocks: ExtStock[] = stocks.map((st) => {
  const r = makeRand(hashStr(st.symbol));
  const industry = INDUSTRIES[st.sector] ?? st.sector;
  const mcapCategory = catForMcap(st.marketCap);

  const wk52High = +(st.price * (1.02 + r() * 0.28)).toFixed(2);
  const wk52Low = +(st.price * (0.55 + r() * 0.3)).toFixed(2);
  const from52High = +(((st.price - wk52High) / wk52High) * 100).toFixed(2);
  const from52Low = +(((st.price - wk52Low) / wk52Low) * 100).toFixed(2);
  const prevClose = +(st.price - st.change).toFixed(2);
  const open = +(prevClose * (0.998 + r() * 0.006)).toFixed(2);
  const dayHigh = +(Math.max(st.price, open) * (1 + r() * 0.012)).toFixed(2);
  const dayLow = +(Math.min(st.price, open) * (1 - r() * 0.012)).toFixed(2);

  const ret1w = +((st.changePct * 0.8 + (r() - 0.5) * 6).toFixed(2));
  const ret1m = +(ret1w * 1.4 + (r() - 0.4) * 12).toFixed(2);
  const ret3m = +(ret1m * 1.3 + (r() - 0.4) * 18).toFixed(2);
  const ret6m = +(ret3m * 1.2 + (r() - 0.4) * 22).toFixed(2);
  const ret1y = +(ret6m * 1.15 + (r() - 0.35) * 30).toFixed(2);
  const cagr3y = +(6 + r() * 28).toFixed(1);
  const cagr5y = +(4 + r() * 22).toFixed(1);

  const industryPe = +(st.pe * (0.7 + r() * 0.7)).toFixed(1);
  const forwardPe = +(st.pe * (0.75 + r() * 0.3)).toFixed(1);
  const pb = +(1 + r() * 8).toFixed(2);
  const ps = +(0.8 + r() * 9).toFixed(2);
  const peg = +(0.4 + r() * 3).toFixed(2);
  const evEbitda = +(6 + r() * 22).toFixed(1);
  const evSales = +(1 + r() * 10).toFixed(1);
  const pcf = +(5 + r() * 25).toFixed(1);
  const earningsYield = +((100 / Math.max(st.pe, 1)).toFixed(2));
  const fcfYield = +(1 + r() * 6).toFixed(2);

  const revGrowth3y = +(st.revGrowth * (0.7 + r() * 0.6)).toFixed(1);
  const revGrowth5y = +(revGrowth3y * (0.7 + r() * 0.5)).toFixed(1);
  const profitGrowth = +(st.revGrowth + (r() - 0.4) * 15).toFixed(1);
  const profitGrowth3y = +(profitGrowth * (0.7 + r() * 0.5)).toFixed(1);
  const epsGrowth = +(profitGrowth + (r() - 0.5) * 6).toFixed(1);
  const epsGrowth3y = +(epsGrowth * (0.7 + r() * 0.4)).toFixed(1);
  const ebitdaGrowth = +(profitGrowth + (r() - 0.5) * 4).toFixed(1);

  const roa = +(st.roe * (0.35 + r() * 0.35)).toFixed(1);
  const grossMargin = +(28 + r() * 40).toFixed(1);
  const ebitdaMargin = +(grossMargin * (0.55 + r() * 0.3)).toFixed(1);
  const opMargin = +(grossMargin * (0.4 + r() * 0.4)).toFixed(1);
  const netMargin = +(opMargin * (0.55 + r() * 0.3)).toFixed(1);
  const fcf = +(st.marketCap * fcfYield / 100).toFixed(0);
  const fcfMargin = +(netMargin * (0.6 + r() * 0.4)).toFixed(1);
  const assetTurnover = +(0.3 + r() * 1.6).toFixed(2);
  const piotroski = Math.floor(3 + r() * 7);
  const altmanZ = +(1 + r() * 5).toFixed(2);

  const totalDebt = +(st.marketCap * st.debtEquity * (0.5 + r() * 0.4)).toFixed(0);
  const cash = +(totalDebt * (0.2 + r() * 0.8)).toFixed(0);
  const netDebt = totalDebt - cash;
  const currentRatio = +(0.9 + r() * 2.5).toFixed(2);
  const quickRatio = +(currentRatio * (0.6 + r() * 0.35)).toFixed(2);
  const interestCover = +(2 + r() * 15).toFixed(1);
  const debtEbitda = +(0.2 + r() * 4).toFixed(2);
  const workingCap = +(cash * (0.4 + r() * 1.2)).toFixed(0);

  const promoterHold = +(30 + r() * 45).toFixed(1);
  const promoterChange = +((r() - 0.5) * 3).toFixed(2);
  const promoterPledge = +(r() < 0.7 ? 0 : r() * 15).toFixed(1);
  const fiiHold = +(5 + r() * 30).toFixed(1);
  const fiiChange = +((r() - 0.4) * 4).toFixed(2);
  const diiHold = +(5 + r() * 25).toFixed(1);
  const diiChange = +((r() - 0.4) * 3).toFixed(2);
  const publicHold = +(Math.max(0, 100 - promoterHold - fiiHold - diiHold).toFixed(1));
  const divPayout = +(st.divYield > 0 ? 15 + r() * 50 : 0).toFixed(0);

  const avgVol20 = +(st.volume * (0.7 + r() * 0.6)).toFixed(1);
  const avgVol5 = +(avgVol20 * (0.8 + r() * 0.5)).toFixed(1);
  const avgVol50 = +(avgVol20 * (0.85 + r() * 0.3)).toFixed(1);
  const volRatio = +((st.volume / avgVol20).toFixed(2));
  const relVolume = +((st.volume / avgVol50).toFixed(2));
  const deliveryPct = +(30 + r() * 50).toFixed(1);
  const volSpike = +(((volRatio - 1) * 100).toFixed(1));
  const turnover = +((st.volume * st.price / 1e5).toFixed(1));

  const sma20 = +(st.price * (0.96 + r() * 0.08)).toFixed(2);
  const sma50 = +(st.price * (0.94 + r() * 0.1)).toFixed(2);
  const sma100 = +(st.price * (0.9 + r() * 0.15)).toFixed(2);
  const sma200 = +(st.price * (0.85 + r() * 0.2)).toFixed(2);
  const ema9 = +(st.price * (0.98 + r() * 0.04)).toFixed(2);
  const ema20 = +(st.price * (0.97 + r() * 0.06)).toFixed(2);
  const ema50 = +(st.price * (0.94 + r() * 0.09)).toFixed(2);
  const goldenCross = sma50 > sma200 && r() > 0.5;
  const deathCross = sma50 < sma200 && r() > 0.6;

  const macdSignal = +(st.macd + (r() - 0.5)).toFixed(2);
  const macdCross: "bull" | "bear" | "none" = st.macd > macdSignal ? "bull" : st.macd < macdSignal - 0.3 ? "bear" : "none";
  const adx = +(15 + r() * 45).toFixed(1);
  const atr = +(st.price * (0.01 + r() * 0.03)).toFixed(2);
  const atrPct = +((atr / st.price) * 100).toFixed(2);
  const stochRsi = +(r() * 100).toFixed(1);
  const cci = +((r() - 0.5) * 300).toFixed(1);
  const mfi = +(20 + r() * 60).toFixed(1);
  const williamsR = +(-100 + r() * 100).toFixed(1);
  const bbPosition = +(r() * 100).toFixed(1);
  const bbWidth = +(2 + r() * 12).toFixed(2);

  const numPatterns = Math.floor(r() * 3);
  const patterns: string[] = [];
  for (let i = 0; i < numPatterns; i++) patterns.push(PATTERNS_POOL[Math.floor(r() * PATTERNS_POOL.length)]);

  const rsVsNifty = +((ret3m - 6) + (r() - 0.5) * 4).toFixed(2);
  const rsVsSector = +((r() - 0.4) * 15).toFixed(2);

  const qualityScore = clamp(Math.round(st.roe * 1.4 + st.roce * 1.2 + piotroski * 6 - st.debtEquity * 12));
  const valueScore = clamp(Math.round(100 - st.pe * 1.1 - pb * 3 - evEbitda * 1.2 + fcfYield * 4));
  const momentumScore = clamp(Math.round(50 + st.changePct * 3 + (st.rsi - 50) * 0.6 + ret1m * 0.8 + (st.price > sma50 ? 10 : -10)));
  const growthScore = clamp(Math.round(45 + st.revGrowth * 1.1 + epsGrowth * 0.9));
  const technicalScore = clamp(Math.round(40 + (st.rsi - 50) * 0.5 + adx * 0.4 + (macdCross === "bull" ? 12 : macdCross === "bear" ? -12 : 0)));
  const fundamentalScore = clamp(Math.round((qualityScore + valueScore + growthScore) / 3));
  const riskScore = clamp(Math.round(30 + st.debtEquity * 20 + Math.abs(from52High) * 0.4 + (100 - promoterHold) * 0.15));
  const aiScore = clamp(Math.round((qualityScore + valueScore + momentumScore + growthScore + technicalScore) / 5 - riskScore * 0.1 + 8));
  const compositeScore = Math.round((qualityScore + valueScore + momentumScore + growthScore) / 4);

  const histVol = +(15 + r() * 40).toFixed(1);
  const beta = +(0.5 + r() * 1.3).toFixed(2);
  const maxDrawdown = +(-(15 + r() * 40)).toFixed(1);
  const sharpe = +((0.4 + r() * 2.1)).toFixed(2);
  const sortino = +(sharpe * (1.1 + r() * 0.6)).toFixed(2);
  const var95 = +(-(atrPct * 1.65 + r() * 2)).toFixed(2);

  const fnoEligible = st.marketCap > 15000 && r() > 0.15;
  const futOi = +(fnoEligible ? (st.marketCap * (0.005 + r() * 0.02)).toFixed(0) : 0);
  const oiChange = +(fnoEligible ? ((r() - 0.5) * 30).toFixed(2) : 0);
  const priceUp = st.changePct >= 0;
  const oiUp = oiChange >= 0;
  const oiInterpretation: ExtStock["oiInterpretation"] =
    !fnoEligible ? "neutral"
      : priceUp && oiUp ? "long-buildup"
        : !priceUp && oiUp ? "short-buildup"
          : !priceUp && !oiUp ? "long-unwinding"
            : "short-covering";
  const pcr = +(0.5 + r() * 1.5).toFixed(2);
  const maxPain = +(st.price * (0.94 + r() * 0.12)).toFixed(0);
  const iv = +(15 + r() * 45).toFixed(1);
  const ivPercentile = +(r() * 100).toFixed(0);
  const ivRank = +(r() * 100).toFixed(0);

  const upcomingEarnings = r() > 0.7 ? "2026-08-05" : null;
  const earningsSurprise = +((r() - 0.4) * 20).toFixed(1);
  const eventFlags: string[] = [];
  if (upcomingEarnings) eventFlags.push("Earnings soon");
  if (r() > 0.85) eventFlags.push(EVENTS_POOL[Math.floor(r() * EVENTS_POOL.length)]);

  const base: ExtStock = {
    ...st,
    exchange: "NSE",
    industry,
    mcapCategory,
    indexMembership: st.marketCap > 100000 ? ["NIFTY 50", "SENSEX"] : st.marketCap > 30000 ? ["NIFTY 100"] : ["NIFTY 500"],
    fnoEligible,
    open, prevClose, dayHigh, dayLow, wk52High, wk52Low, from52High, from52Low,
    ret1w, ret1m, ret3m, ret6m, ret1y, cagr3y, cagr5y,
    industryPe, forwardPe, pb, ps, peg, evEbitda, evSales, pcf, earningsYield, fcfYield,
    revGrowth3y, revGrowth5y, profitGrowth, profitGrowth3y, epsGrowth, epsGrowth3y, ebitdaGrowth,
    roa, grossMargin, ebitdaMargin, opMargin, netMargin, fcf, fcfMargin, assetTurnover, piotroski, altmanZ,
    totalDebt, netDebt, currentRatio, quickRatio, interestCover, debtEbitda, cash, workingCap,
    promoterHold, promoterChange, promoterPledge, fiiHold, fiiChange, diiHold, diiChange, publicHold, divPayout,
    avgVol5, avgVol20, avgVol50, volRatio, relVolume, deliveryPct, volSpike, turnover,
    sma20, sma50, sma100, sma200, ema9, ema20, ema50, goldenCross, deathCross,
    macdSignal, macdCross, adx, atr, atrPct, stochRsi, cci, mfi, williamsR, bbPosition, bbWidth,
    patterns,
    rsVsNifty, rsVsSector,
    momentumScore, technicalScore, fundamentalScore, qualityScore, growthScore, valueScore, riskScore, aiScore, compositeScore,
    histVol, beta, maxDrawdown, sharpe, sortino, var95,
    futOi, oiChange, oiInterpretation, pcr, maxPain, iv, ivPercentile, ivRank,
    upcomingEarnings, earningsSurprise, eventFlags,
    signals: [],
    signalStrength: 0,
    primarySignal: "ai-pick",
    risk: "medium",
  };

  const sigR = makeRand(hashStr(st.symbol) * 3);
  base.signals = buildSignals(base, sigR);
  base.signalStrength = base.signals.length
    ? Math.round(base.signals.reduce((a, s) => a + s.strength, 0) / base.signals.length)
    : 0;
  base.primarySignal = (base.signals.sort((a, b) => b.strength - a.strength)[0]?.kind) ?? "ai-pick";
  base.risk = riskScore > 65 ? "high" : riskScore > 40 ? "medium" : "low";
  return base;
});

export type Preset = {
  id: string;
  name: string;
  desc: string;
  filter: (s: ExtStock) => boolean;
};

export const PRESETS: Preset[] = [
  { id: "quality", name: "Quality Compounders", desc: "High ROE + low debt + Piotroski ≥7", filter: (s) => s.roe > 18 && s.debtEquity < 0.6 && s.piotroski >= 7 },
  { id: "value", name: "Deep Value", desc: "Low PE, PB, EV/EBITDA + high FCF yield", filter: (s) => s.pe < 20 && s.pb < 3 && s.evEbitda < 14 && s.fcfYield > 3 },
  { id: "growth", name: "Hyper Growth", desc: "Revenue > 25% + EPS growth > 20%", filter: (s) => s.revGrowth > 25 && s.epsGrowth > 20 },
  { id: "momentum", name: "52w Momentum", desc: "Near 52w high + above SMA50/200", filter: (s) => s.from52High > -5 && s.price > s.sma50 && s.price > s.sma200 },
  { id: "dividend", name: "Dividend Aristocrats", desc: "Yield > 2% + low debt", filter: (s) => s.divYield > 2 && s.debtEquity < 0.5 },
  { id: "oversold", name: "Oversold Bounce", desc: "RSI < 40 + above SMA200", filter: (s) => s.rsi < 40 && s.price > s.sma200 },
  { id: "breakout", name: "Breakout Setup", desc: "RSI 55-70 + near 52w high + rev>15%", filter: (s) => s.rsi >= 55 && s.rsi <= 70 && s.from52High > -8 && s.revGrowth > 15 },
  { id: "fii", name: "FII Favourites", desc: "FII holding > 20%", filter: (s) => s.fiiHold > 20 },
];

export const SECTORS_LIST = Array.from(new Set(stocks.map((s) => s.sector))).sort();
export const INDUSTRY_LIST = Array.from(new Set(extStocks.map((s) => s.industry))).sort();

// Signal categories used by the top tabs
export const SIGNAL_TABS: { id: "all" | SignalKind; label: string }[] = [
  { id: "all", label: "All Stocks" },
  { id: "momentum", label: "Momentum" },
  { id: "volume-anomaly", label: "Volume Anomaly" },
  { id: "relative-strength", label: "Relative Strength" },
  { id: "breakout", label: "Breakouts" },
  { id: "quality", label: "Quality" },
  { id: "value", label: "Value" },
  { id: "growth", label: "Growth" },
  { id: "dividend", label: "Dividend" },
  { id: "fno", label: "F&O" },
  { id: "event", label: "Event Signals" },
  { id: "ai-pick", label: "AI Picks" },
];

// Natural-language screener: converts text into a set of predicates + a human-readable summary.
export type NlCondition = { label: string; test: (s: ExtStock) => boolean };
export function parseNaturalLanguage(text: string): NlCondition[] {
  const q = text.toLowerCase();
  const conds: NlCondition[] = [];
  const num = (re: RegExp) => {
    const m = q.match(re);
    return m ? parseFloat(m[1]) : null;
  };

  const roce = num(/roce\s*(?:above|>|over|greater than)\s*(\d+(?:\.\d+)?)/);
  if (roce !== null) conds.push({ label: `ROCE > ${roce}%`, test: (s) => s.roce > roce });
  const roe = num(/roe\s*(?:above|>|over|greater than)\s*(\d+(?:\.\d+)?)/);
  if (roe !== null) conds.push({ label: `ROE > ${roe}%`, test: (s) => s.roe > roe });
  const rsiLt = num(/rsi\s*(?:below|<|under|less than)\s*(\d+(?:\.\d+)?)/);
  if (rsiLt !== null) conds.push({ label: `RSI < ${rsiLt}`, test: (s) => s.rsi < rsiLt });
  const rsiGt = num(/rsi\s*(?:above|>|over|greater than)\s*(\d+(?:\.\d+)?)/);
  if (rsiGt !== null) conds.push({ label: `RSI > ${rsiGt}`, test: (s) => s.rsi > rsiGt });
  const de = num(/debt\s*(?:to|\/)?\s*equity\s*(?:below|<|under|less than)\s*(\d+(?:\.\d+)?)/);
  if (de !== null) conds.push({ label: `D/E < ${de}`, test: (s) => s.debtEquity < de });
  if (/low\s+debt/.test(q)) conds.push({ label: "D/E < 0.5", test: (s) => s.debtEquity < 0.5 });
  const peLt = num(/pe\s*(?:below|<|under|less than)\s*(\d+(?:\.\d+)?)/);
  if (peLt !== null) conds.push({ label: `PE < ${peLt}`, test: (s) => s.pe < peLt });
  const rev = num(/revenue\s*(?:growth)?\s*(?:above|>|over)\s*(\d+(?:\.\d+)?)/);
  if (rev !== null) conds.push({ label: `Rev growth > ${rev}%`, test: (s) => s.revGrowth > rev });
  const volX = num(/volume\s*(?:above|over|>)?\s*(\d+(?:\.\d+)?)\s*x/);
  if (volX !== null) conds.push({ label: `Volume > ${volX}× avg`, test: (s) => s.volRatio > volX });
  if (/small[- ]?cap/.test(q)) conds.push({ label: "Small cap", test: (s) => s.mcapCategory === "Small" });
  if (/mid[- ]?cap/.test(q)) conds.push({ label: "Mid cap", test: (s) => s.mcapCategory === "Mid" });
  if (/large[- ]?cap/.test(q)) conds.push({ label: "Large cap", test: (s) => ["Large", "Mega"].includes(s.mcapCategory) });
  if (/near.*52.?w.*low/.test(q)) conds.push({ label: "Within 10% of 52w low", test: (s) => s.from52Low < 10 });
  if (/near.*52.?w.*high/.test(q)) conds.push({ label: "Within 10% of 52w high", test: (s) => s.from52High > -10 });
  if (/breaking\s+resistance|breakout/.test(q)) conds.push({ label: "Breakout setup", test: (s) => s.from52High > -5 && s.volRatio > 1.4 });
  if (/short\s+covering/.test(q)) conds.push({ label: "Short covering", test: (s) => s.oiInterpretation === "short-covering" });
  if (/f&o|fno|futures/.test(q)) conds.push({ label: "F&O eligible", test: (s) => s.fnoEligible });
  if (/rising\s+relative\s+strength|leading/.test(q)) conds.push({ label: "RS vs Nifty > 5%", test: (s) => s.rsVsNifty > 5 });
  if (/profitable/.test(q)) conds.push({ label: "Net margin > 0", test: (s) => s.netMargin > 0 });
  if (/fundamentally\s+strong/.test(q)) conds.push({ label: "Quality > 65", test: (s) => s.qualityScore > 65 });
  return conds;
}
