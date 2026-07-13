// Extended screener dataset: factor scores + additional fundamentals, deterministic.
import { stocks, type Stock } from "@/lib/mock-data";

export type ExtStock = Stock & {
  epsGrowth: number;
  grossMargin: number;
  opMargin: number;
  netMargin: number;
  fcfYield: number;
  pb: number;
  ps: number;
  evEbitda: number;
  peg: number;
  beta: number;
  promoterHold: number;
  fiiHold: number;
  diiHold: number;
  piotroski: number;   // 0-9
  altmanZ: number;
  sma50: number;
  sma200: number;
  wk52High: number;
  wk52Low: number;
  from52High: number;  // %
  qualityScore: number;   // 0-100
  valueScore: number;
  momentumScore: number;
  growthScore: number;
  compositeScore: number;
};

let s = 42;
const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
const reseed = (k: string) => { s = k.split("").reduce((a, c) => a + c.charCodeAt(0), 1) * 13; };

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

export const extStocks: ExtStock[] = stocks.map((st) => {
  reseed(st.symbol);
  const epsGrowth = +(st.revGrowth + (r() - 0.4) * 12).toFixed(1);
  const grossMargin = +(28 + r() * 40).toFixed(1);
  const opMargin = +(grossMargin * (0.4 + r() * 0.4)).toFixed(1);
  const netMargin = +(opMargin * (0.55 + r() * 0.3)).toFixed(1);
  const fcfYield = +(1 + r() * 6).toFixed(2);
  const pb = +(1 + r() * 8).toFixed(2);
  const ps = +(0.8 + r() * 9).toFixed(2);
  const evEbitda = +(6 + r() * 22).toFixed(1);
  const peg = +(0.4 + r() * 3).toFixed(2);
  const beta = +(0.5 + r() * 1.3).toFixed(2);
  const promoterHold = +(30 + r() * 45).toFixed(1);
  const fiiHold = +(5 + r() * 30).toFixed(1);
  const diiHold = +(5 + r() * 25).toFixed(1);
  const piotroski = Math.floor(3 + r() * 7);
  const altmanZ = +(1 + r() * 5).toFixed(2);
  const sma50 = +(st.price * (0.94 + r() * 0.1)).toFixed(2);
  const sma200 = +(st.price * (0.85 + r() * 0.2)).toFixed(2);
  const wk52High = +(st.price * (1.02 + r() * 0.25)).toFixed(2);
  const wk52Low = +(st.price * (0.55 + r() * 0.3)).toFixed(2);
  const from52High = +(((st.price - wk52High) / wk52High) * 100).toFixed(2);

  const qualityScore = clamp(Math.round(st.roe * 1.4 + st.roce * 1.2 + piotroski * 6 - st.debtEquity * 12));
  const valueScore = clamp(Math.round(100 - st.pe * 1.1 - pb * 3 - evEbitda * 1.2 + fcfYield * 4));
  const momentumScore = clamp(Math.round(50 + st.changePct * 5 + (st.rsi - 50) * 0.6 + (st.price > sma50 ? 12 : -12)));
  const growthScore = clamp(Math.round(50 + st.revGrowth * 1.1 + epsGrowth * 0.9));
  const compositeScore = Math.round((qualityScore + valueScore + momentumScore + growthScore) / 4);

  return {
    ...st, epsGrowth, grossMargin, opMargin, netMargin, fcfYield, pb, ps, evEbitda, peg, beta,
    promoterHold, fiiHold, diiHold, piotroski, altmanZ, sma50, sma200, wk52High, wk52Low, from52High,
    qualityScore, valueScore, momentumScore, growthScore, compositeScore,
  };
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
