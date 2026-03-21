const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

/** CoinGecko recomenda User-Agent; evita bloqueios em alguns ambientes. */
const CG_FETCH_INIT: RequestInit = {
  headers: {
    Accept: "application/json",
    "User-Agent": "DeFi-Dashboard/1.0 (https://github.com)",
  },
  cache: "no-store",
};

/** IDs CoinGecko: Uniswap (UNI) e Pendle (PENDLE) */
export type CoinId = "uniswap" | "pendle";

export interface SimplePriceResult {
  usd: number;
  eur?: number;
  usd_24h_vol: number;
  usd_24h_change: number;
  usd_market_cap: number;
}

export interface MarketChartPoint {
  timestamp: number;
  price: number;
}

export type OHLCandle = [number, number, number, number, number];

export interface OHLCPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export async function getSimplePrices(
  ids: CoinId[] = ["uniswap", "pendle"]
): Promise<Record<CoinId, SimplePriceResult>> {
  const res = await fetch(
    `${COINGECKO_BASE}/simple/price?ids=${ids.join(",")}&vs_currencies=usd,eur&include_24hr_vol=true&include_24hr_change=true&include_market_cap=true`,
    CG_FETCH_INIT
  );
  if (!res.ok) throw new Error(`CoinGecko simple/price: ${res.status}`);
  const data = await res.json();
  return data as Record<CoinId, SimplePriceResult>;
}

export async function getMarketChart(
  id: CoinId,
  days: number = 7
): Promise<MarketChartPoint[]> {
  const res = await fetch(
    `${COINGECKO_BASE}/coins/${id}/market_chart?vs_currency=usd&days=${days}`,
    CG_FETCH_INIT
  );
  if (!res.ok) throw new Error(`CoinGecko market_chart ${id}: ${res.status}`);
  const data = await res.json();
  const rawPrices = (data.prices || []) as [number, number][];
  return rawPrices.map(([timestamp, price]) => ({ timestamp, price }));
}

export async function getOHLC(
  id: CoinId,
  days: 7 | 30 = 7
): Promise<OHLCPoint[]> {
  const res = await fetch(
    `${COINGECKO_BASE}/coins/${id}/ohlc?vs_currency=usd&days=${days}`,
    CG_FETCH_INIT
  );
  if (!res.ok) throw new Error(`CoinGecko ohlc ${id}: ${res.status}`);
  const data = (await res.json()) as OHLCandle[];
  return data.map(([timestamp, open, high, low, close]) => ({
    timestamp,
    open,
    high,
    low,
    close,
  }));
}

export const COIN_LABELS: Record<CoinId, string> = {
  uniswap: "Uniswap",
  pendle: "Pendle",
};

export const COIN_SYMBOLS: Record<CoinId, string> = {
  uniswap: "UNI",
  pendle: "PENDLE",
};
