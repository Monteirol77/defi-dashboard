"use client";

import { useState } from "react";
import PriceChart, { type ChartRange, type ChartType } from "./PriceChart";
import StochRsiChart from "./StochRsiChart";
import type { CoinId, SimplePriceResult, OHLCPoint } from "@/lib/coingecko";
import type { ChartPointWithMA } from "./PriceChart";
import { COIN_LABELS, COIN_SYMBOLS } from "@/lib/coingecko";

const COIN_COLORS: Record<CoinId, string> = {
  uniswap: "#ff007a",
  pendle: "#6b21a8",
};

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatEur(value: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatBigUsd(value: number) {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return formatUsd(value);
}

function stochZoneLabel(k: number | null, d: number | null): string {
  if (k == null || d == null) return "—";
  if (k > 80 && d > 80) return "Sobrecomprado";
  if (k < 20 && d < 20) return "Sobrevendido";
  return "Neutro";
}

function stochZoneColor(k: number | null, d: number | null): string {
  if (k == null || d == null) return "text-zinc-500";
  if (k > 80 && d > 80) return "text-red-600 dark:text-red-400";
  if (k < 20 && d < 20) return "text-emerald-600 dark:text-emerald-400";
  return "text-zinc-600 dark:text-zinc-400";
}

export interface CoinCardData {
  price: SimplePriceResult;
  /** Preço em EUR (CoinGecko ou taxa da API) para exibição */
  displayEur: number;
  chart7: ChartPointWithMA[];
  chart30: ChartPointWithMA[];
  ohlc7: OHLCPoint[];
  ohlc30: OHLCPoint[];
}

interface CoinCardProps {
  id: CoinId;
  data: CoinCardData;
}

export default function CoinCard({ id, data }: CoinCardProps) {
  const [chartRange, setChartRange] = useState<ChartRange>("7d");
  const [chartType, setChartType] = useState<ChartType>("line");

  const { price, displayEur, chart7, chart30, ohlc7, ohlc30 } = data;
  const isPositive = price.usd_24h_change >= 0;
  const color = COIN_COLORS[id];
  const lineData = chartRange === "7d" ? chart7 : chart30;
  const ohlcData = chartRange === "7d" ? ohlc7 : ohlc30;
  const stochData = chartRange === "7d" ? chart7 : chart30;
  const lastStoch = stochData.length > 0 ? stochData[stochData.length - 1] : null;
  const stochK = lastStoch?.stochK ?? null;
  const stochD = lastStoch?.stochD ?? null;

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {COIN_LABELS[id]}
          </h2>
          <p className="text-sm text-zinc-500">{COIN_SYMBOLS[id]}</p>
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {COIN_SYMBOLS[id].charAt(0)}
        </div>
      </div>

      <div className="mb-1 space-y-0.5">
        <p className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          {formatUsd(price.usd)}
        </p>
        <p className="text-lg font-semibold text-zinc-600 dark:text-zinc-400">
          {formatEur(displayEur)}
        </p>
      </div>
      <p
        className={`mb-4 text-sm font-medium ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
      >
        {isPositive ? "+" : ""}
        {price.usd_24h_change.toFixed(2)}% (24h)
      </p>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Market cap</p>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {formatBigUsd(price.usd_market_cap)}
          </p>
        </div>
        <div className="rounded-lg bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Volume 24h</p>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {formatBigUsd(price.usd_24h_vol)}
          </p>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Stochastic RSI (14, 3, 3)</p>
        <p className={`text-sm font-semibold ${stochZoneColor(stochK, stochD)}`}>
          %K: {stochK != null ? stochK.toFixed(1) : "—"} | %D: {stochD != null ? stochD.toFixed(1) : "—"} — {stochZoneLabel(stochK, stochD)}
        </p>
        <div className="mt-2">
          <StochRsiChart
            data={stochData.map((p) => ({ timestamp: p.timestamp, stochK: p.stochK ?? null, stochD: p.stochD ?? null }))}
            height={100}
          />
        </div>
      </div>

      <div className="border-t border-zinc-200 pt-4 dark:border-zinc-700">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Preço — últimos {chartRange === "7d" ? "7" : "30"} dias
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setChartRange("7d")}
              className={`rounded px-2 py-1 text-xs font-medium ${chartRange === "7d" ? "bg-zinc-200 dark:bg-zinc-600" : "bg-zinc-100 dark:bg-zinc-800"}`}
            >
              7d
            </button>
            <button
              type="button"
              onClick={() => setChartRange("30d")}
              className={`rounded px-2 py-1 text-xs font-medium ${chartRange === "30d" ? "bg-zinc-200 dark:bg-zinc-600" : "bg-zinc-100 dark:bg-zinc-800"}`}
            >
              30d
            </button>
            <span className="mx-1 text-zinc-400">|</span>
            <button
              type="button"
              onClick={() => setChartType("line")}
              className={`rounded px-2 py-1 text-xs font-medium ${chartType === "line" ? "bg-zinc-200 dark:bg-zinc-600" : "bg-zinc-100 dark:bg-zinc-800"}`}
            >
              Linha
            </button>
            <button
              type="button"
              onClick={() => setChartType("candlestick")}
              className={`rounded px-2 py-1 text-xs font-medium ${chartType === "candlestick" ? "bg-zinc-200 dark:bg-zinc-600" : "bg-zinc-100 dark:bg-zinc-800"}`}
            >
              Velas
            </button>
          </div>
        </div>
        <p className="mb-1 text-[10px] text-zinc-400">
          {chartType === "line" && "— Preço; — — MA 7d; — — MA 30d"}
        </p>
        <PriceChart
          chartType={chartType}
          range={chartRange}
          lineData={lineData}
          ohlcData={ohlcData}
          name={id}
          color={color}
        />
      </div>
    </article>
  );
}
