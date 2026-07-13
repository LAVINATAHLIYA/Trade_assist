// Mock financial data for StockSense AI
export type Trend = "up" | "down";

export type IndexTicker = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  spark: number[];
};

// Deterministic PRNG so SSR and client produce identical values (kills hydration warnings)
let _seed = 1337;
const rand = () => {
  _seed = (_seed * 9301 + 49297) % 233280;
  return _seed / 233280;
};
const seed = (n: number) => { _seed = n; };

const spark = (base: number, n = 24, vol = 0.02) => {
  seed(Math.floor(base * 100));
  const arr: number[] = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    v = v * (1 + (Math.sin(i * 0.7) * vol + (rand() - 0.5) * vol));
    arr.push(+v.toFixed(2));
  }
  return arr;
};


export const indices: IndexTicker[] = [
  { symbol: "NIFTY", name: "Nifty 50", price: 24785.4, change: 132.8, changePct: 0.54, spark: spark(24500) },
  { symbol: "SENSEX", name: "BSE Sensex", price: 81234.15, change: 410.22, changePct: 0.51, spark: spark(80800) },
  { symbol: "BANKNIFTY", name: "Bank Nifty", price: 52410.9, change: -184.6, changePct: -0.35, spark: spark(52600, 24, 0.025) },
  { symbol: "GOLD", name: "Gold (INR/10g)", price: 74210, change: 320, changePct: 0.43, spark: spark(73800) },
  { symbol: "BTC", name: "Bitcoin", price: 68420, change: 1220, changePct: 1.82, spark: spark(66800, 24, 0.03) },
  { symbol: "USDINR", name: "USD / INR", price: 84.12, change: -0.08, changePct: -0.09, spark: spark(84.2, 24, 0.005) },
];

export type Stock = {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePct: number;
  marketCap: number; // in cr
  pe: number;
  roe: number;
  roce: number;
  revGrowth: number;
  debtEquity: number;
  divYield: number;
  rsi: number;
  macd: number;
  volume: number; // in lakhs
  logo?: string;
};

const mkStock = (
  symbol: string,
  name: string,
  sector: string,
  price: number,
  changePct: number,
  overrides: Partial<Stock> = {},
): Stock => {
  seed(symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 1) * 7);
  return {
    symbol,
    name,
    sector,
    price,
    change: +(price * (changePct / 100)).toFixed(2),
    changePct,
    marketCap: Math.round(price * 100 + rand() * 50000),
    pe: +(15 + rand() * 45).toFixed(1),
    roe: +(8 + rand() * 30).toFixed(1),
    roce: +(10 + rand() * 28).toFixed(1),
    revGrowth: +(-5 + rand() * 40).toFixed(1),
    debtEquity: +(rand() * 1.5).toFixed(2),
    divYield: +(rand() * 3.5).toFixed(2),
    rsi: +(30 + rand() * 45).toFixed(1),
    macd: +(-2 + rand() * 4).toFixed(2),
    volume: +(20 + rand() * 900).toFixed(1),
    ...overrides,
  };
};


export const stocks: Stock[] = [
  mkStock("RELIANCE", "Reliance Industries", "Energy", 2914.5, 1.24),
  mkStock("TCS", "Tata Consultancy Services", "IT", 4102.75, -0.42),
  mkStock("HDFCBANK", "HDFC Bank", "Financials", 1682.3, 0.88),
  mkStock("INFY", "Infosys", "IT", 1874.9, 2.14),
  mkStock("ICICIBANK", "ICICI Bank", "Financials", 1268.1, 0.31),
  mkStock("BHARTIARTL", "Bharti Airtel", "Telecom", 1594.8, -0.72),
  mkStock("ITC", "ITC Limited", "Consumer", 484.2, 0.62),
  mkStock("LT", "Larsen & Toubro", "Industrials", 3612.4, 1.94),
  mkStock("ASIANPAINT", "Asian Paints", "Materials", 2854.5, -1.42),
  mkStock("MARUTI", "Maruti Suzuki", "Auto", 12480.0, 2.86),
  mkStock("SBIN", "State Bank of India", "Financials", 812.55, -0.18),
  mkStock("AXISBANK", "Axis Bank", "Financials", 1184.9, 0.44),
  mkStock("SUNPHARMA", "Sun Pharma", "Pharma", 1812.3, 1.08),
  mkStock("TITAN", "Titan Company", "Consumer", 3412.7, -0.68),
  mkStock("HCLTECH", "HCL Technologies", "IT", 1782.4, 1.62),
  mkStock("WIPRO", "Wipro", "IT", 562.1, -1.28),
  mkStock("ADANIENT", "Adani Enterprises", "Conglomerate", 3120.6, 3.42),
  mkStock("TATAMOTORS", "Tata Motors", "Auto", 984.2, 2.18),
  mkStock("KOTAKBANK", "Kotak Mahindra Bank", "Financials", 1810.5, -0.24),
  mkStock("NTPC", "NTPC", "Energy", 412.35, 0.98),
];

export const sectors = [
  { name: "IT", perf: 1.42, weight: 18 },
  { name: "Financials", perf: 0.62, weight: 32 },
  { name: "Energy", perf: 1.18, weight: 12 },
  { name: "Auto", perf: 2.24, weight: 8 },
  { name: "Pharma", perf: 0.84, weight: 6 },
  { name: "Consumer", perf: -0.42, weight: 9 },
  { name: "Materials", perf: -1.12, weight: 5 },
  { name: "Telecom", perf: -0.68, weight: 4 },
  { name: "Industrials", perf: 1.94, weight: 6 },
];

export const earnings = [
  { date: "Dec 04", symbol: "INFY", name: "Infosys", est: "₹18.20 EPS", time: "Post-market" },
  { date: "Dec 05", symbol: "TCS", name: "TCS", est: "₹32.10 EPS", time: "Pre-market" },
  { date: "Dec 07", symbol: "HDFCBANK", name: "HDFC Bank", est: "₹22.40 EPS", time: "Post-market" },
  { date: "Dec 09", symbol: "MARUTI", name: "Maruti Suzuki", est: "₹106.20 EPS", time: "Pre-market" },
  { date: "Dec 12", symbol: "ITC", name: "ITC", est: "₹5.40 EPS", time: "Post-market" },
];

export const aiInsights = [
  {
    tag: "Momentum",
    title: "IT sector breaking out of 3-month consolidation",
    body: "Nifty IT index is up 4.2% this week with strong volume. INFY, HCLTECH showing RSI divergence turning bullish.",
    tone: "bull" as const,
  },
  {
    tag: "Risk",
    title: "Elevated concentration in Financials",
    body: "Your portfolio has 42% exposure to financials, 12% above your target. Consider trimming HDFCBANK or ICICIBANK.",
    tone: "warn" as const,
  },
  {
    tag: "Opportunity",
    title: "MARUTI: Positive earnings revision cycle",
    body: "Consensus FY26 EPS revised up 6.4% in last 30 days. Auto sales momentum + margin expansion.",
    tone: "bull" as const,
  },
];

export const holdings = [
  { symbol: "RELIANCE", name: "Reliance", qty: 40, avg: 2510.0, ltp: 2914.5, sector: "Energy" },
  { symbol: "HDFCBANK", name: "HDFC Bank", qty: 65, avg: 1520.0, ltp: 1682.3, sector: "Financials" },
  { symbol: "INFY", name: "Infosys", qty: 80, avg: 1420.0, ltp: 1874.9, sector: "IT" },
  { symbol: "TCS", name: "TCS", qty: 22, avg: 3820.0, ltp: 4102.75, sector: "IT" },
  { symbol: "MARUTI", name: "Maruti", qty: 8, avg: 10120.0, ltp: 12480.0, sector: "Auto" },
  { symbol: "ITC", name: "ITC", qty: 220, avg: 412.0, ltp: 484.2, sector: "Consumer" },
  { symbol: "LT", name: "L&T", qty: 14, avg: 2980.0, ltp: 3612.4, sector: "Industrials" },
];

export const trades = [
  {
    id: "t1",
    date: "2025-11-28",
    symbol: "MARUTI",
    type: "Swing" as const,
    side: "Long" as const,
    entry: 11820,
    exit: 12480,
    qty: 8,
    stop: 11500,
    target: 12800,
    confidence: 8,
    mood: "Focused",
    strategy: ["Breakout", "Earnings play"],
    pnl: 5280,
    review: "Nailed the earnings breakout. Held through noise. Could have sized up.",
  },
  {
    id: "t2",
    date: "2025-11-22",
    symbol: "ADANIENT",
    type: "Intraday" as const,
    side: "Long" as const,
    entry: 3080,
    exit: 3045,
    qty: 15,
    stop: 3050,
    target: 3150,
    confidence: 6,
    mood: "Anxious",
    strategy: ["Momentum"],
    pnl: -525,
    review: "Chased entry after gap-up. Ignored my stop. Emotional trade.",
  },
  {
    id: "t3",
    date: "2025-11-15",
    symbol: "INFY",
    type: "Long-term" as const,
    side: "Long" as const,
    entry: 1420,
    exit: null,
    qty: 80,
    stop: 1300,
    target: 2100,
    confidence: 9,
    mood: "Confident",
    strategy: ["Fundamental", "Sector rotation"],
    pnl: 36392,
    review: "Thesis: IT bottoming, USD strength, AI capex. Holding.",
  },
];
