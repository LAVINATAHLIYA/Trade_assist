import { createServerFn } from "@tanstack/react-start";

export type LiveQuote = {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  name?: string;
  currency?: string;
  volume?: number;
};

export type LiveBar = { t: string; close: number; volume: number };

const BASE = "https://api.twelvedata.com";

async function tdFetch(path: string, params: Record<string, string>) {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) throw new Error("TWELVE_DATA_API_KEY not configured");
  const qs = new URLSearchParams({ ...params, apikey: apiKey }).toString();
  const res = await fetch(`${BASE}${path}?${qs}`);
  if (!res.ok) throw new Error(`Twelve Data ${res.status}`);
  return res.json() as Promise<any>;
}

export const getQuotes = createServerFn({ method: "GET" })
  .inputValidator((input: { symbols: string[] }) => {
    if (!Array.isArray(input?.symbols) || input.symbols.length === 0) {
      throw new Error("symbols required");
    }
    return { symbols: input.symbols.slice(0, 60) };
  })
  .handler(async ({ data }): Promise<{ quotes: LiveQuote[]; error?: string }> => {
    try {
      const json = await tdFetch("/quote", { symbol: data.symbols.join(",") });
      // API returns an object keyed by symbol when multiple, or a single object when one.
      const rows = data.symbols.length === 1 ? { [data.symbols[0]]: json } : json;
      const quotes: LiveQuote[] = [];
      for (const sym of data.symbols) {
        const r = rows?.[sym];
        if (!r || r.status === "error" || r.code) continue;
        const price = Number(r.close);
        const change = Number(r.change);
        const changePct = Number(r.percent_change);
        if (!Number.isFinite(price)) continue;
        quotes.push({
          symbol: sym,
          price,
          change: Number.isFinite(change) ? change : 0,
          changePct: Number.isFinite(changePct) ? changePct : 0,
          name: r.name,
          currency: r.currency,
          volume: Number(r.volume) || undefined,
        });
      }
      return { quotes };
    } catch (e) {
      return { quotes: [], error: e instanceof Error ? e.message : "fetch failed" };
    }
  });

export const getTimeSeries = createServerFn({ method: "GET" })
  .inputValidator((input: { symbol: string; interval?: string; outputsize?: number }) => ({
    symbol: String(input.symbol),
    interval: input.interval ?? "1day",
    outputsize: Math.min(Math.max(input.outputsize ?? 120, 5), 500),
  }))
  .handler(async ({ data }): Promise<{ bars: LiveBar[]; error?: string }> => {
    try {
      const json = await tdFetch("/time_series", {
        symbol: data.symbol,
        interval: data.interval,
        outputsize: String(data.outputsize),
        order: "ASC",
      });
      if (json.status === "error" || !Array.isArray(json.values)) {
        return { bars: [], error: json.message || "no data" };
      }
      const bars: LiveBar[] = json.values.map((v: any) => ({
        t: v.datetime,
        close: Number(v.close),
        volume: Number(v.volume) || 0,
      }));
      return { bars };
    } catch (e) {
      return { bars: [], error: e instanceof Error ? e.message : "fetch failed" };
    }
  });
