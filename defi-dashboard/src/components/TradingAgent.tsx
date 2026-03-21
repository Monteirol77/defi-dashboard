"use client";

import { useEffect, useState } from "react";
import type { CoinId } from "@/lib/coingecko";
import { COIN_LABELS } from "@/lib/coingecko";
import { usePaperTrading } from "@/contexts/PaperTradingContext";
import type { Trade } from "@/lib/paper-trading";

const AGENT_STORAGE_KEY = "defi-dashboard-agent-enabled";
const BUY_ALLOCATION = 0.2;
const MAX_OPEN_POSITIONS = 2;
const MIN_BALANCE_STOP_EUR = 7_000;
const MIN_BUY_EUR = 10;
const STOP_LOSS_PCT = 0.03;
const TAKE_PROFIT_PCT = 0.08;
const STOCH_OVERSOLD = 20;
const STOCH_OVERBOUGHT = 80;

function formatEur(value: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function loadAgentEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(AGENT_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function saveAgentEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AGENT_STORAGE_KEY, String(enabled));
  } catch {
    // ignore
  }
}

interface ChartPointWithMA {
  timestamp: number;
  price: number;
  ma7: number | null;
  ma30: number | null;
  stochK: number | null;
  stochD: number | null;
}

interface TradingAgentProps {
  pricesEur: Record<CoinId, number>;
  pricesUsd: Record<CoinId, number>;
  chart7WithMA: Record<CoinId, ChartPointWithMA[]>;
}

export default function TradingAgent({ pricesEur, pricesUsd, chart7WithMA }: TradingAgentProps) {
  const { state, executeBuy, executeSell } = usePaperTrading();
  const [enabled, setEnabled] = useState(loadAgentEnabled);
  const balanceBelowStop = state.balanceEur < MIN_BALANCE_STOP_EUR;

  useEffect(() => {
    saveAgentEnabled(enabled);
  }, [enabled]);

  useEffect(() => {
    if (balanceBelowStop && enabled) setEnabled(false);
  }, [balanceBelowStop, enabled]);

  useEffect(() => {
    if (!enabled || balanceBelowStop) return;

    const coins: CoinId[] = ["uniswap", "pendle"];
    const openPositionsCount =
      (state.positions.uniswap?.quantity > 0 ? 1 : 0) + (state.positions.pendle?.quantity > 0 ? 1 : 0);

    for (const coin of coins) {
      const priceEur = pricesEur[coin] ?? 0;
      const chart = chart7WithMA[coin] ?? [];
      const lastPoint = chart.length > 0 ? chart[chart.length - 1] : null;
      const prevPoint = chart.length >= 2 ? chart[chart.length - 2] : null;
      const ma7 = lastPoint?.ma7 ?? null;
      const k = lastPoint?.stochK ?? null;
      const d = lastPoint?.stochD ?? null;
      const prevK = prevPoint?.stochK ?? null;
      const prevD = prevPoint?.stochD ?? null;
      const pos = state.positions[coin];
      const qty = pos?.quantity ?? 0;
      const totalCostEur = pos?.totalCostEur ?? 0;

      const kCrossAboveD =
        k != null && d != null && prevK != null && prevD != null && k > d && prevK <= prevD;
      const kCrossBelowD =
        k != null && d != null && prevK != null && prevD != null && k < d && prevK >= prevD;
      const bothBelow20 = k != null && d != null && k < STOCH_OVERSOLD && d < STOCH_OVERSOLD;
      const bothAbove80 = k != null && d != null && k > STOCH_OVERBOUGHT && d > STOCH_OVERBOUGHT;

      const fmtStoch = () => (k != null && d != null ? ` (%K=${k.toFixed(1)}, %D=${d.toFixed(1)})` : "");

      if (qty > 0 && priceEur > 0) {
        const currentVal = qty * priceEur;
        const costBasis = totalCostEur;
        const pnlPct = costBasis > 0 ? (currentVal - costBasis) / costBasis : 0;

        let sellReason: string | null = null;
        if (kCrossBelowD && bothAbove80) {
          sellReason = `Agente: Stoch RSI %K cruza abaixo de %D, zona sobrecomprado${fmtStoch()}`;
        } else if (pnlPct <= -STOP_LOSS_PCT) {
          sellReason = `Agente: Stop-loss (${(pnlPct * 100).toFixed(2)}%)${fmtStoch()}`;
        } else if (pnlPct >= TAKE_PROFIT_PCT) {
          sellReason = `Agente: Take-profit (${(pnlPct * 100).toFixed(2)}%)${fmtStoch()}`;
        }

        if (sellReason) {
          executeSell(coin, qty, priceEur, sellReason);
          return;
        }
      }

      const priceUsd = pricesUsd[coin] ?? 0;
      if (
        qty === 0 &&
        openPositionsCount < MAX_OPEN_POSITIONS &&
        priceEur > 0 &&
        kCrossAboveD &&
        bothBelow20 &&
        ma7 != null &&
        priceUsd > ma7
      ) {
        const maxSpend = Math.min(state.balanceEur * BUY_ALLOCATION, state.balanceEur - 1);
        const spendEur = Math.max(MIN_BUY_EUR, maxSpend);
        if (spendEur >= MIN_BUY_EUR) {
          const buyQty = spendEur / priceEur;
          executeBuy(
            coin,
            buyQty,
            priceEur,
            `Agente: Stoch RSI %K cruza acima de %D, zona sobrevendido, preço > MA7${fmtStoch()}`
          );
          return;
        }
      }
    }
  }, [
    enabled,
    balanceBelowStop,
    pricesEur.uniswap,
    pricesEur.pendle,
    pricesUsd.uniswap,
    pricesUsd.pendle,
    chart7WithMA.uniswap,
    chart7WithMA.pendle,
    state.balanceEur,
    state.positions.uniswap,
    state.positions.pendle,
    executeBuy,
    executeSell,
  ]);

  const report = computeReport(state.history);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {balanceBelowStop && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-700 dark:bg-red-950/50 dark:text-red-200">
          <p className="font-medium">Saldo abaixo de 7.000€</p>
          <p className="text-sm">O agente foi desactivado automaticamente por gestão de risco.</p>
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Agente de trading automático</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            UNI e PENDLE. Verificação a cada 30 s com a actualização de preços.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${enabled ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"}`}
          >
            <span className={`h-2 w-2 rounded-full ${enabled ? "bg-emerald-500" : "bg-zinc-400"}`} />
            {enabled ? "Activo" : "Inactivo"}
          </span>
          <button
            type="button"
            onClick={() => setEnabled((e) => !e)}
            disabled={balanceBelowStop}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${enabled ? "bg-red-600 text-white hover:bg-red-700" : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:pointer-events-none"}`}
          >
            {enabled ? "Desactivar" : "Activar"}
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
        <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Gestão de risco</h3>
        <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
          <li>Máximo 20% do saldo por operação.</li>
          <li>Máximo 2 posições abertas em simultâneo.</li>
          <li>Paragem automática se saldo &lt; 7.000€.</li>
        </ul>
      </div>

      <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
        <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Regras (Stochastic RSI 14,3,3)</h3>
        <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
          <li>
            <strong>Compra:</strong> %K cruza acima de %D, ambos &lt; 20, preço &gt; MA 7d.
          </li>
          <li>
            <strong>Venda:</strong> %K cruza abaixo de %D e ambos &gt; 80, ou stop-loss 3%, ou take-profit 8%.
          </li>
          <li>Ativos: {COIN_LABELS.uniswap} e {COIN_LABELS.pendle}. Uma operação por ciclo.</li>
        </ul>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
        <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Relatório</h3>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Total de operações</p>
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">{report.totalOps}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Win rate (vendas)</p>
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">{report.winRate}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Lucro/Perda total</p>
            <p className={`font-semibold ${report.totalPnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {formatEur(report.totalPnl)}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Maior perda individual</p>
            <p className={`font-semibold ${report.maxLoss < 0 ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-zinc-100"}`}>
              {report.maxLoss < 0 ? formatEur(report.maxLoss) : "—"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function computeReport(history: Trade[]) {
  const totalOps = history.length;
  const sells = history.filter((t) => t.type === "sell");
  const withPnl = sells.filter((t) => t.realizedPnlEur != null);
  const wins = withPnl.filter((t) => (t.realizedPnlEur ?? 0) > 0).length;
  const winRate = withPnl.length > 0 ? `${((wins / withPnl.length) * 100).toFixed(1)}%` : "—";
  const totalPnl = withPnl.reduce((acc, t) => acc + (t.realizedPnlEur ?? 0), 0);
  const losses = withPnl.map((t) => t.realizedPnlEur ?? 0).filter((p) => p < 0);
  const maxLoss = losses.length > 0 ? Math.min(...losses) : 0;
  return { totalOps, winRate, totalPnl, maxLoss };
}
