import type { CoinId } from "./coingecko";

const STORAGE_KEY = "defi-dashboard-paper-trading";
const INITIAL_BALANCE_EUR = 10_000;

export interface Position {
  quantity: number;
  totalCostEur: number;
}

export interface Trade {
  id: string;
  date: string;
  type: "buy" | "sell";
  coin: CoinId;
  quantity: number;
  priceEur: number;
  totalEur: number;
  reason?: string;
  realizedPnlEur?: number;
}

export interface PaperTradingState {
  balanceEur: number;
  positions: Record<CoinId, Position>;
  history: Trade[];
}

const defaultState: PaperTradingState = {
  balanceEur: INITIAL_BALANCE_EUR,
  positions: {
    uniswap: { quantity: 0, totalCostEur: 0 },
    pendle: { quantity: 0, totalCostEur: 0 },
  },
  history: [],
};

export function loadPaperTradingState(): PaperTradingState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as PaperTradingState;
    return {
      balanceEur: typeof parsed.balanceEur === "number" ? parsed.balanceEur : defaultState.balanceEur,
      positions: {
        uniswap: {
          quantity: typeof parsed.positions?.uniswap?.quantity === "number" ? parsed.positions.uniswap.quantity : 0,
          totalCostEur: typeof parsed.positions?.uniswap?.totalCostEur === "number" ? parsed.positions.uniswap.totalCostEur : 0,
        },
        pendle: {
          quantity: typeof parsed.positions?.pendle?.quantity === "number" ? parsed.positions.pendle.quantity : 0,
          totalCostEur: typeof parsed.positions?.pendle?.totalCostEur === "number" ? parsed.positions.pendle.totalCostEur : 0,
        },
      },
      history: Array.isArray(parsed.history)
        ? parsed.history.map((t: Trade) => ({ ...t, reason: t.reason ?? "—" }))
        : defaultState.history,
    };
  } catch {
    return defaultState;
  }
}

export function savePaperTradingState(state: PaperTradingState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function getInitialBalanceEur(): number {
  return INITIAL_BALANCE_EUR;
}

export function generateTradeId(): string {
  return `trade-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
