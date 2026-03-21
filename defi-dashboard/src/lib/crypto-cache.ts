import {
  getSimplePrices,
  getMarketChart,
  getOHLC,
  type CoinId,
} from "@/lib/coingecko";
import { addMovingAverages, addStochRSI } from "@/lib/indicators";
import { sliceLastDays } from "@/lib/chart-slice";

const COINS: CoinId[] = ["uniswap", "pendle"];

/** TTL do cache em memória (evita 429 na CoinGecko). */
export const CRYPTO_CACHE_TTL_MS = 60_000;

export type CryptoPayload = {
  prices: Record<
    CoinId,
    {
      usd: number;
      eur?: number;
      usd_24h_vol: number;
      usd_24h_change: number;
      usd_market_cap: number;
    }
  >;
  eurPerUsd: number | null;
  chart7: Record<CoinId, { timestamp: number; price: number }[]>;
  chart30: Record<CoinId, { timestamp: number; price: number }[]>;
  chart7WithMA: Record<
    CoinId,
    {
      timestamp: number;
      price: number;
      ma7: number | null;
      ma30: number | null;
      stochK: number | null;
      stochD: number | null;
    }[]
  >;
  chart30WithMA: Record<
    CoinId,
    {
      timestamp: number;
      price: number;
      ma7: number | null;
      ma30: number | null;
      stochK: number | null;
      stochD: number | null;
    }[]
  >;
  ohlc7: Record<CoinId, { timestamp: number; open: number; high: number; low: number; close: number }[]>;
  ohlc30: Record<CoinId, { timestamp: number; open: number; high: number; low: number; close: number }[]>;
};

export type CryptoApiBody = CryptoPayload & {
  /** Resposta servida sem novo pedido à CoinGecko (dentro do TTL). */
  cacheHit?: boolean;
  /** Dados antigos porque a API falhou; ainda assim HTTP 200. */
  stale?: boolean;
  staleReason?: string;
  /** Timestamp (ms) da última vez que estes dados foram obtidos com sucesso. */
  dataFetchedAt?: number;
};

let lastGood: { data: CryptoPayload; at: number } | null = null;
let inflight: Promise<void> | null = null;

async function fetchFreshFromCoinGecko(): Promise<CryptoPayload> {
  const [prices, uni30, pen30, uniOhlc30, penOhlc30] = await Promise.all([
    getSimplePrices(COINS),
    getMarketChart("uniswap", 30),
    getMarketChart("pendle", 30),
    getOHLC("uniswap", 30),
    getOHLC("pendle", 30),
  ]);

  const uni7 = sliceLastDays(uni30, 7);
  const pen7 = sliceLastDays(pen30, 7);
  const uniOhlc7 = sliceLastDays(uniOhlc30, 7);
  const penOhlc7 = sliceLastDays(penOhlc30, 7);

  const chart7 = { uniswap: uni7, pendle: pen7 };
  const chart30 = { uniswap: uni30, pendle: pen30 };
  const ohlc7 = { uniswap: uniOhlc7, pendle: penOhlc7 };
  const ohlc30 = { uniswap: uniOhlc30, pendle: penOhlc30 };

  const chart7WithMA = {
    uniswap: addStochRSI(addMovingAverages(uni7)),
    pendle: addStochRSI(addMovingAverages(pen7)),
  };
  const chart30WithMA = {
    uniswap: addStochRSI(addMovingAverages(uni30)),
    pendle: addStochRSI(addMovingAverages(pen30)),
  };

  const ratios: number[] = [];
  for (const id of COINS) {
    const p = prices[id];
    if (p && typeof p.eur === "number" && typeof p.usd === "number" && p.usd > 0) {
      ratios.push(p.eur / p.usd);
    }
  }
  const eurPerUsd = ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : null;

  return {
    prices,
    eurPerUsd,
    chart7,
    chart30,
    chart7WithMA,
    chart30WithMA,
    ohlc7,
    ohlc30,
  };
}

/**
 * Devolve dados crypto: cache 60s, um único refresh em voo, fallback para último sucesso em 429/erro.
 */
export async function getCryptoApiBody(): Promise<CryptoApiBody> {
  const now = Date.now();

  if (lastGood && now - lastGood.at < CRYPTO_CACHE_TTL_MS) {
    return {
      ...lastGood.data,
      cacheHit: true,
      dataFetchedAt: lastGood.at,
    };
  }

  const runRefresh = async () => {
    const data = await fetchFreshFromCoinGecko();
    lastGood = { data, at: Date.now() };
  };

  try {
    if (!inflight) {
      inflight = runRefresh().finally(() => {
        inflight = null;
      });
    }
    await inflight;
    return {
      ...lastGood!.data,
      dataFetchedAt: lastGood!.at,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    if (lastGood) {
      return {
        ...lastGood.data,
        stale: true,
        staleReason: message,
        dataFetchedAt: lastGood.at,
      };
    }
    throw new Error(message);
  }
}
