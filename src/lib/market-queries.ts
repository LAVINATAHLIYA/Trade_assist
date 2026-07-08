import { queryOptions } from "@tanstack/react-query";
import { getQuotes, getTimeSeries } from "@/lib/market.functions";

// Twelve Data symbols. Indices/FX/crypto use their own symbols; NSE stocks use "SYMBOL:NSE".
export const INDEX_SYMBOL_MAP: Record<string, string> = {
  NIFTY: "NIFTY 50:NSE",
  SENSEX: "SENSEX:BSE",
  BANKNIFTY: "NIFTY BANK:NSE",
  GOLD: "XAU/USD",
  BTC: "BTC/USD",
  USDINR: "USD/INR",
};

export const toTdStock = (nseSymbol: string) => `${nseSymbol}:NSE`;

export const quotesQuery = (symbols: string[]) =>
  queryOptions({
    queryKey: ["td-quotes", symbols.slice().sort().join(",")],
    queryFn: () => getQuotes({ data: { symbols } }),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

export const timeSeriesQuery = (symbol: string, interval = "1day", outputsize = 120) =>
  queryOptions({
    queryKey: ["td-series", symbol, interval, outputsize],
    queryFn: () => getTimeSeries({ data: { symbol, interval, outputsize } }),
    staleTime: 5 * 60_000,
  });
