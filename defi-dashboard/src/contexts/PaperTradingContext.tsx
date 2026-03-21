"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { CoinId } from "@/lib/coingecko";
import {
  loadPaperTradingState,
  savePaperTradingState,
  generateTradeId,
  type PaperTradingState,
  type Trade,
} from "@/lib/paper-trading";

interface PaperTradingContextValue {
  state: PaperTradingState;
  executeBuy: (coin: CoinId, quantity: number, priceEur: number, reason?: string) => boolean;
  executeSell: (coin: CoinId, quantity: number, priceEur: number, reason?: string) => boolean;
}

const PaperTradingContext = createContext<PaperTradingContextValue | null>(null);

export function PaperTradingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PaperTradingState>(loadPaperTradingState);

  useEffect(() => {
    savePaperTradingState(state);
  }, [state]);

  const executeBuy = useCallback(
    (coin: CoinId, quantity: number, priceEur: number, reason?: string): boolean => {
      if (quantity <= 0 || priceEur <= 0) return false;
      const cost = quantity * priceEur;
      if (cost > state.balanceEur) return false;
      setState((prev) => {
        if (cost > prev.balanceEur) return prev;
        const trade: Trade = {
          id: generateTradeId(),
          date: new Date().toISOString(),
          type: "buy",
          coin,
          quantity,
          priceEur,
          totalEur: cost,
          reason: reason ?? "Manual",
        };
        return {
          ...prev,
          balanceEur: prev.balanceEur - cost,
          positions: {
            ...prev.positions,
            [coin]: {
              quantity: (prev.positions[coin]?.quantity ?? 0) + quantity,
              totalCostEur: (prev.positions[coin]?.totalCostEur ?? 0) + cost,
            },
          },
          history: [trade, ...prev.history],
        };
      });
      return true;
    },
    [state.balanceEur]
  );

  const executeSell = useCallback(
    (coin: CoinId, quantity: number, priceEur: number, reason?: string): boolean => {
      if (quantity <= 0 || priceEur <= 0) return false;
      const pos = state.positions[coin];
      const positionQty = pos?.quantity ?? 0;
      if (quantity > positionQty) return false;
      const revenue = quantity * priceEur;
      const avgCost = pos && pos.quantity > 0 ? pos.totalCostEur / pos.quantity : 0;
      const costOfQty = quantity * avgCost;
      const realizedPnlEur = revenue - costOfQty;
      const trade: Trade = {
        id: generateTradeId(),
        date: new Date().toISOString(),
        type: "sell",
        coin,
        quantity,
        priceEur,
        totalEur: revenue,
        reason: reason ?? "Manual",
        realizedPnlEur,
      };
      setState((prev) => ({
        ...prev,
        balanceEur: prev.balanceEur + revenue,
        positions: {
          ...prev.positions,
          [coin]: {
            quantity: (prev.positions[coin]?.quantity ?? 0) - quantity,
            totalCostEur: Math.max(0, (prev.positions[coin]?.totalCostEur ?? 0) - quantity * avgCost),
          },
        },
        history: [trade, ...prev.history],
      }));
      return true;
    },
    [state.positions]
  );

  return (
    <PaperTradingContext.Provider value={{ state, executeBuy, executeSell }}>
      {children}
    </PaperTradingContext.Provider>
  );
}

export function usePaperTrading(): PaperTradingContextValue {
  const ctx = useContext(PaperTradingContext);
  if (!ctx) throw new Error("usePaperTrading must be used within PaperTradingProvider");
  return ctx;
}
