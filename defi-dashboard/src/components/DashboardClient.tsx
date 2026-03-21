"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CoinCard, { type CoinCardData } from "./CoinCard";
import PaperTradingPanel from "./PaperTradingPanel";
import TradingAgent from "./TradingAgent";
import type { CoinId } from "@/lib/coingecko";

const COINS: CoinId[] = ["uniswap", "pendle"];

/** Alinhado com cache do servidor (~60s) para reduzir pedidos. */
const REFRESH_INTERVAL_MS = 60_000;

interface ApiResponse {
  prices: Record<CoinId, { usd: number; eur?: number; usd_24h_vol: number; usd_24h_change: number; usd_market_cap: number }>;
  eurPerUsd: number | null;
  chart7WithMA: Record<CoinId, { timestamp: number; price: number; ma7: number | null; ma30: number | null; stochK: number | null; stochD: number | null }[]>;
  chart30WithMA: Record<CoinId, { timestamp: number; price: number; ma7: number | null; ma30: number | null; stochK: number | null; stochD: number | null }[]>;
  ohlc7: Record<CoinId, { timestamp: number; open: number; high: number; low: number; close: number }[]>;
  ohlc30: Record<CoinId, { timestamp: number; open: number; high: number; low: number; close: number }[]>;
  cacheHit?: boolean;
  stale?: boolean;
  staleReason?: string;
  dataFetchedAt?: number;
}

const FALLBACK_EUR_PER_USD = 0.92;

function getPricesEur(prices: ApiResponse["prices"], eurPerUsd: number | null): Record<CoinId, number> {
  const rate = eurPerUsd ?? FALLBACK_EUR_PER_USD;
  return {
    uniswap: typeof prices.uniswap.eur === "number" ? prices.uniswap.eur : prices.uniswap.usd * rate,
    pendle: typeof prices.pendle.eur === "number" ? prices.pendle.eur : prices.pendle.usd * rate,
  };
}

function buildCardData(res: ApiResponse, id: CoinId, pricesEur: Record<CoinId, number>): CoinCardData {
  return {
    price: res.prices[id],
    displayEur: pricesEur[id],
    chart7: res.chart7WithMA[id],
    chart30: res.chart30WithMA[id],
    ohlc7: res.ohlc7[id],
    ohlc30: res.ohlc30[id],
  };
}

function formatFetchedAt(ms: number | undefined): string {
  if (ms == null || Number.isNaN(ms)) return "—";
  try {
    return new Date(ms).toLocaleString("pt-PT");
  } catch {
    return "—";
  }
}

export default function DashboardClient() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dataNotice, setDataNotice] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const dataRef = useRef<ApiResponse | null>(null);
  dataRef.current = data;

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/crypto", { cache: "no-store" });
      const json = await res.json();

      if (!res.ok) {
        const msg =
          typeof json?.error === "string"
            ? json.error
            : typeof json?.hint === "string"
              ? json.hint
              : "Erro ao carregar dados";

        const prev = dataRef.current;
        if (prev) {
          setDataNotice(
            `${msg} A mostrar o último conjunto de dados conhecido (última origem válida: ${formatFetchedAt(prev.dataFetchedAt)}).`
          );
        } else {
          setError(msg);
        }
        return;
      }

      const payload = json as ApiResponse;
      setData(payload);
      setError(null);

      if (payload.stale && payload.staleReason) {
        setDataNotice(
          `CoinGecko indisponível ou limite (ex.: 429): ${payload.staleReason}. A mostrar o último conjunto válido (${formatFetchedAt(payload.dataFetchedAt)}).`
        );
      } else {
        setDataNotice(null);
      }

      setLastUpdate(new Date());
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      const prev = dataRef.current;
      if (prev) {
        setDataNotice(
          `${msg} A mostrar o último conjunto de dados conhecido (${formatFetchedAt(prev.dataFetchedAt)}).`
        );
      } else {
        setError(msg);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (error && !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950">
        <p className="text-red-700 dark:text-red-300">{error}</p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            fetchData();
          }}
          className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-zinc-500">A carregar...</p>
      </div>
    );
  }

  const pricesEur = getPricesEur(data.prices, data.eurPerUsd ?? null);

  return (
    <>
      {dataNotice && (
        <div
          className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
          role="status"
        >
          {dataNotice}
        </div>
      )}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-500">
        <span>Atualização automática a cada {REFRESH_INTERVAL_MS / 1000} segundos (cache servidor 60s)</span>
        {lastUpdate && (
          <span>Último pedido: {lastUpdate.toLocaleTimeString("pt-PT")}</span>
        )}
      </div>
      <div className="mb-6">
        <TradingAgent
          pricesEur={pricesEur}
          pricesUsd={{ uniswap: data.prices.uniswap.usd, pendle: data.prices.pendle.usd }}
          chart7WithMA={data.chart7WithMA}
        />
      </div>
      <div className="mb-8">
        <PaperTradingPanel pricesEur={pricesEur} eurPerUsd={data.eurPerUsd ?? null} />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {COINS.map((id) => (
          <CoinCard key={id} id={id} data={buildCardData(data, id, pricesEur)} />
        ))}
      </div>
    </>
  );
}
