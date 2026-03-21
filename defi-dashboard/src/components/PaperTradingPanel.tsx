"use client";

import { useState } from "react";
import type { CoinId } from "@/lib/coingecko";
import { COIN_LABELS, COIN_SYMBOLS } from "@/lib/coingecko";
import { getInitialBalanceEur } from "@/lib/paper-trading";
import { usePaperTrading } from "@/contexts/PaperTradingContext";

const COINS: CoinId[] = ["uniswap", "pendle"];

function formatEur(value: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

interface PaperTradingPanelProps {
  pricesEur: Record<CoinId, number>;
  eurPerUsd?: number | null;
}

export default function PaperTradingPanel({ pricesEur, eurPerUsd }: PaperTradingPanelProps) {
  const { state, executeBuy, executeSell } = usePaperTrading();
  const [buySellCoin, setBuySellCoin] = useState<CoinId>("uniswap");
  const [amount, setAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");

  const priceEur = pricesEur[buySellCoin] ?? 0;
  const positionQty = state.positions[buySellCoin]?.quantity ?? 0;

  const handleBuy = () => {
    const qty = parseFloat(amount);
    if (!Number.isFinite(qty) || qty <= 0 || priceEur <= 0) return;
    if (qty * priceEur > state.balanceEur) return;
    executeBuy(buySellCoin, qty, priceEur, "Manual");
    setAmount("");
  };

  const handleSell = () => {
    const qty = parseFloat(amount);
    if (!Number.isFinite(qty) || qty <= 0 || priceEur <= 0 || qty > positionQty) return;
    executeSell(buySellCoin, qty, priceEur, "Manual");
    setAmount("");
  };

  const totalValueEur =
    state.balanceEur +
    COINS.reduce((acc, id) => acc + (state.positions[id]?.quantity ?? 0) * (pricesEur[id] ?? 0), 0);
  const initialEur = getInitialBalanceEur();
  const totalPlEur = totalValueEur - initialEur;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Paper Trading (UNI & PENDLE)
      </h2>
      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        Saldo fictício inicial: {formatEur(initialEur)}. Preços em EUR (CoinGecko).
        {eurPerUsd != null && (
          <span className="ml-1">Taxa 1 USD = {eurPerUsd.toFixed(4)} EUR.</span>
        )}
      </p>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Saldo EUR</p>
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{formatEur(state.balanceEur)}</p>
        </div>
        <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Valor total carteira</p>
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{formatEur(totalValueEur)}</p>
        </div>
        <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Lucro/Perda total</p>
          <p
            className={`text-lg font-semibold ${totalPlEur >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
          >
            {totalPlEur >= 0 ? "+" : ""}
            {formatEur(totalPlEur)}
          </p>
        </div>
        <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Variação %</p>
          <p
            className={`text-lg font-semibold ${totalPlEur >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
          >
            {initialEur > 0 ? ((totalPlEur / initialEur) * 100).toFixed(2) : "0"}%
          </p>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Posições</h3>
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
                <th className="px-3 py-2 text-left font-medium">Ativo</th>
                <th className="px-3 py-2 text-right font-medium">Quantidade</th>
                <th className="px-3 py-2 text-right font-medium">Preço médio</th>
                <th className="px-3 py-2 text-right font-medium">Valor atual</th>
                <th className="px-3 py-2 text-right font-medium">P&L</th>
              </tr>
            </thead>
            <tbody>
              {COINS.map((id) => {
                const pos = state.positions[id];
                const qty = pos?.quantity ?? 0;
                const cost = pos?.totalCostEur ?? 0;
                const currentVal = qty * (pricesEur[id] ?? 0);
                const pl = currentVal - cost;
                const avgPrice = qty > 0 ? cost / qty : 0;
                return (
                  <tr key={id} className="border-b border-zinc-100 dark:border-zinc-700">
                    <td className="px-3 py-2 font-medium">
                      {COIN_LABELS[id]} ({COIN_SYMBOLS[id]})
                    </td>
                    <td className="px-3 py-2 text-right">{qty > 0 ? qty.toFixed(6) : "—"}</td>
                    <td className="px-3 py-2 text-right">{avgPrice > 0 ? formatEur(avgPrice) : "—"}</td>
                    <td className="px-3 py-2 text-right">{currentVal > 0 ? formatEur(currentVal) : "—"}</td>
                    <td className={`px-3 py-2 text-right font-medium ${pl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {qty > 0 ? (pl >= 0 ? "+" : "") + formatEur(pl) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-6">
        <div className="mb-2 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("buy")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${activeTab === "buy" ? "bg-emerald-600 text-white" : "bg-zinc-200 dark:bg-zinc-700"}`}
          >
            Comprar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sell")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${activeTab === "sell" ? "bg-red-600 text-white" : "bg-zinc-200 dark:bg-zinc-700"}`}
          >
            Vender
          </button>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Ativo</label>
            <select
              value={buySellCoin}
              onChange={(e) => setBuySellCoin(e.target.value as CoinId)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            >
              <option value="uniswap">Uniswap (UNI)</option>
              <option value="pendle">Pendle (PENDLE)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Quantidade ({COIN_SYMBOLS[buySellCoin]})</label>
            <input
              type="number"
              min="0"
              step="any"
              placeholder={activeTab === "buy" ? "0.1" : "0"}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-36 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            />
          </div>
          <div className="text-xs text-zinc-500">
            {priceEur > 0 && (
              <>
                Preço: {formatEur(priceEur)} / {COIN_SYMBOLS[buySellCoin]}
                {activeTab === "buy" && (
                  <span className="ml-1">· Máx. ~{(state.balanceEur / priceEur).toFixed(6)}</span>
                )}
                {activeTab === "sell" && <span className="ml-1">· Disponível: {positionQty.toFixed(6)}</span>}
              </>
            )}
          </div>
          <button
            type="button"
            onClick={activeTab === "buy" ? handleBuy : handleSell}
            disabled={
              !amount ||
              !priceEur ||
              (activeTab === "buy" && parseFloat(amount) * priceEur > state.balanceEur) ||
              (activeTab === "sell" && (parseFloat(amount) <= 0 || parseFloat(amount) > positionQty))
            }
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${activeTab === "buy" ? "bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-400" : "bg-red-600 hover:bg-red-700 disabled:bg-zinc-400"}`}
          >
            {activeTab === "buy" ? "Comprar" : "Vender"}
          </button>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Histórico de operações</h3>
        <div className="max-h-64 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-800">
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="px-3 py-2 text-left font-medium">Data</th>
                <th className="px-3 py-2 text-left font-medium">Tipo</th>
                <th className="px-3 py-2 text-left font-medium">Ativo</th>
                <th className="px-3 py-2 text-right font-medium">Qtd</th>
                <th className="px-3 py-2 text-right font-medium">Preço</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
                <th className="px-3 py-2 text-left font-medium">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {state.history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-zinc-500">
                    Nenhuma operação ainda.
                  </td>
                </tr>
              ) : (
                state.history.map((t) => (
                  <tr key={t.id} className="border-b border-zinc-100 dark:border-zinc-700">
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                      {new Date(t.date).toLocaleString("pt-PT")}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={t.type === "buy" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}
                      >
                        {t.type === "buy" ? "Compra" : "Venda"}
                      </span>
                    </td>
                    <td className="px-3 py-2">{COIN_SYMBOLS[t.coin]}</td>
                    <td className="px-3 py-2 text-right">{t.quantity.toFixed(6)}</td>
                    <td className="px-3 py-2 text-right">{formatEur(t.priceEur)}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatEur(t.totalEur)}</td>
                    <td className="max-w-[200px] truncate px-3 py-2 text-zinc-500" title={t.reason}>
                      {t.reason ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
