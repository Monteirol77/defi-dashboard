export function computeRSI(prices: number[], period: number = 14): number | null {
  if (prices.length < period + 1) return null;
  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i]! - prices[i - 1]!);
  }
  const recent = changes.slice(-period);
  const gains = recent.map((c) => (c > 0 ? c : 0));
  const losses = recent.map((c) => (c < 0 ? -c : 0));
  const avgGain = gains.reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function computeRSIArray(prices: number[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period) {
      result.push(null);
    } else {
      const slice = prices.slice(i - period, i + 1);
      result.push(computeRSI(slice, period));
    }
  }
  return result;
}

export function computeStochRSI(
  prices: number[],
  rsiPeriod: number = 14,
  stochPeriod: number = 3,
  smoothK: number = 3,
  smoothD: number = 3
): { k: (number | null)[]; d: (number | null)[] } {
  const n = prices.length;
  const rsiArr = computeRSIArray(prices, rsiPeriod);
  const rawK: (number | null)[] = new Array(n).fill(null);
  for (let i = rsiPeriod + stochPeriod - 1; i < n; i++) {
    const slice = rsiArr.slice(i - stochPeriod + 1, i + 1).filter((v): v is number => v != null);
    if (slice.length < stochPeriod) continue;
    const rsiCur = rsiArr[i];
    if (rsiCur == null) continue;
    const minR = Math.min(...slice);
    const maxR = Math.max(...slice);
    rawK[i] = maxR === minR ? 50 : ((rsiCur - minR) / (maxR - minR)) * 100;
  }
  const k: (number | null)[] = new Array(n).fill(null);
  for (let i = rsiPeriod + stochPeriod - 1 + smoothK - 1; i < n; i++) {
    const slice = rawK.slice(i - smoothK + 1, i + 1).filter((v): v is number => v != null);
    if (slice.length === smoothK) k[i] = slice.reduce((a, b) => a + b, 0) / smoothK;
  }
  const d: (number | null)[] = new Array(n).fill(null);
  for (let i = rsiPeriod + stochPeriod - 1 + smoothK - 1 + smoothD - 1; i < n; i++) {
    const slice = k.slice(i - smoothD + 1, i + 1).filter((v): v is number => v != null);
    if (slice.length === smoothD) d[i] = slice.reduce((a, b) => a + b, 0) / smoothD;
  }
  return { k, d };
}

export function computeMA(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const slice = prices.slice(i - period + 1, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / period);
    }
  }
  return result;
}

export function addMovingAverages<T extends { price: number }>(
  points: T[],
  period7: number = 7,
  period30: number = 30
): (T & { ma7: number | null; ma30: number | null })[] {
  const prices = points.map((p) => p.price);
  const ma7 = computeMA(prices, Math.min(7, period7));
  const ma30 = computeMA(prices, Math.min(30, period30));
  return points.map((p, i) => ({
    ...p,
    ma7: ma7[i] ?? null,
    ma30: ma30[i] ?? null,
  }));
}

export function addStochRSI<T extends { price: number }>(
  points: T[],
  rsiPeriod: number = 14,
  stochPeriod: number = 3,
  smoothK: number = 3,
  smoothD: number = 3
): (T & { stochK: number | null; stochD: number | null })[] {
  const prices = points.map((p) => p.price);
  const { k, d } = computeStochRSI(prices, rsiPeriod, stochPeriod, smoothK, smoothD);
  return points.map((p, i) => ({
    ...p,
    stochK: k[i] ?? null,
    stochD: d[i] ?? null,
  }));
}
